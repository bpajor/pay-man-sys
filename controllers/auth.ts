import { NextFunction, Request, Response } from "express";
import { log, Logger } from "winston";
import bcrypt from "bcrypt";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { validationResult } from "express-validator";
import { RedisClientType } from "redis";
import { incrementFailedAttempts } from "./helpers/ddos";
import { getAllowedHosts, transporter } from "./helpers/transporter";
import crypto, { verify } from "crypto";
import { verify2fa } from "./helpers/twoFA";
import { Company } from "../entity/Company";
import OTPAuth from "otpauth";
import { encode } from "hi-base32";
import QRCode from "qrcode";
import { JoinRequest } from "../entity/JoinRequest";
import session from "express-session";
import { Employee } from "../entity/Employee";
import Tokens from "csrf";

export const getLogin = (req: Request, res: Response, next: NextFunction) => {
  const logger: Logger = res.locals.logger;

  const tokens = new Tokens();

  const csrf_token = tokens.create(req.session.not_authenticated_csrf_secret!);

  try {
    logger.info(`Rendering login page`);
    res.render("auth/login", {
      baseUrl: `${process.env.BASE_URL}`,
      error: null,
      nonce: res.locals.nonce,
      csrfToken: csrf_token,
    });
  } catch (error) {
    logger.error(`Error rendering login page: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }
};

export const postLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;
  const redisClient: RedisClientType = res.locals.redisClient;
  logger.info(`Received login request`);
  const user_repo = AppDataSource.getRepository(User);
  const tokens = new Tokens();

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.error(`Validation errors: ${errors.array()}`);
    return res.status(400).render("auth/login", {
      baseUrl: `${process.env.BASE_URL}`,
      error: errors.array()[0].msg,
      nonce: res.locals.nonce,
      csrfToken: tokens.create(req.session.not_authenticated_csrf_secret!),
    });
  }

  const { email, password } = req.body;
  let user;
  let attemptsKey: string;
  let lockKey: string;

  try {
    lockKey = `lock:${email}`;
    attemptsKey = `attempts:${email}`;

    const isLocked = await redisClient.get(lockKey);

    if (isLocked) {
      logger.error(`User ${email} is locked out`);
      return res.status(400).render("auth/login", {
        baseUrl: `${process.env.BASE_URL}`,
        error: "User is locked out",
        nonce: res.locals.nonce,
        csrfToken: tokens.create(req.session.not_authenticated_csrf_secret!),
      });
    }
  } catch (error) {
    logger.error(`Error checking if user is locked out: ${error}`);
    res.status(500);
    return next(error);
  }

  try {
    // user = await user_repo.findOne({ where: { email: email } });
    user = await user_repo
      .createQueryBuilder("user")
      .leftJoinAndSelect("user.company", "company")
      .leftJoinAndSelect("user.employees", "employee")
      .leftJoinAndSelect("employee.company", "employeeCompany")
      .where("user.email = :email", { email })
      .getOne();

    if (!user) {
      logger.error(`User with email ${email} not found`);

      await incrementFailedAttempts(attemptsKey, lockKey, redisClient);

      return res.status(400).render("auth/login", {
        baseUrl: `${process.env.BASE_URL}`,
        error: "Invalid email or password",
        nonce: res.locals.nonce,
        csrfToken: tokens.create(req.session.not_authenticated_csrf_secret!),
      });
    }
  } catch (error) {
    logger.error(`Error finding user: ${error}`);
    res.status(500);
    return next(error);
  }

  try {
    const password_match = await bcrypt.compare(password, user.password_hash);
    if (!password_match) {
      logger.error(`Invalid password for user ${email}`);

      await incrementFailedAttempts(attemptsKey, lockKey, redisClient);

      return res.status(400).render("auth/login", {
        baseUrl: `${process.env.BASE_URL}`,
        error: "Invalid email or password",
        nonce: res.locals.nonce,
        csrfToken: tokens.create(req.session.not_authenticated_csrf_secret!),
      });
    }
  } catch (error) {
    logger.error(`Error comparing passwords: ${error}`);
    res.status(500);
    return next(error);
  }

  let company_id;

  if (user.company) {
    company_id = user.company.id;
  } else if (user.employees[0]?.company) {
    company_id = user.employees[0].company.id;
  } else {
    company_id = null;
  }

  let employee_id = null;
  if (user.employees[0]) {
    employee_id = user.employees[0].id;
  }

  let authorized_employees_ids: number[] = [];
  if (user.account_type === "manager" && company_id) {
    try {
      const response = await AppDataSource.getRepository(Employee).find({
        where: { company: { id: company_id } },
        select: ["id"],
      });

      authorized_employees_ids = response.map((employee) =>
        Number(employee.id)
      );
    } catch (error) {
      logger.error(`Error getting authorized employees: ${error}`);
      res.status(500);
      return next(new Error("Internal server error"));
    }
  }

  let user_to_session = {
    uid: user.id,
    email: user.email,
    account_type: user.account_type as "employee" | "manager",
    company_id,
    employee_id,
    authorized_employees_ids,
  };
  req.session.user = user_to_session;

  if (user.account_type === "manager" && user.company) {
    try {
      const jrequests_pending = await AppDataSource.getRepository(
        JoinRequest
      ).exists({
        where: { company: { id: user.company.id }, status: "pending" },
      });

      req.session.jrequests_pending = jrequests_pending;
    } catch (error) {
      logger.error(`Error checking for pending join requests: ${error}`);
      res.status(500);
      return next(error);
    }
  }

  await redisClient.del(attemptsKey);

  if (user.two_fa_secret) {
    logger.info(`2fa pending for user ${email}`);
    req.session.pending_2fa = true;
    logger.info(`Redirecting to 2fa verification page`);
    return res.redirect(`/verify-2fa`);
  }

  logger.info(`User ${email} successfully logged in`);

  req.session.not_authenticated_csrf_secret = undefined;
  req.session.csrf_secret = tokens.secretSync();

  const redirect_path =
    user.account_type === "manager"
      ? "/manager/dashboard"
      : "/employee/dashboard";

  return res.redirect(redirect_path);
};

export const getSignup = (req: Request, res: Response) => {
  const logger: Logger = res.locals.logger;

  const tokens = new Tokens();

  const csrf_token = tokens.create(req.session.not_authenticated_csrf_secret!);
  try {
    logger.info(`Rendering signup page`);
    res.render("auth/signup", {
      baseUrl: `${process.env.BASE_URL}`,
      error: null,
      nonce: res.locals.nonce,
      csrfToken: csrf_token,
    });
  } catch (error) {
    logger.error(`Error rendering signup page: ${error}`);
    res.status(500).send("Error rendering signup page");
  }
};

export const postSignup = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const user_repo = AppDataSource.getRepository(User);
  const logger: Logger = res.locals.logger;
  const tokens = new Tokens();

  const csrf_token = tokens.create(req.session.not_authenticated_csrf_secret!);

  logger.info(`Received signup request`);

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    logger.error(`Validation errors: ${errors.array()}`);
    return res.status(400).render("auth/signup", {
      baseUrl: `${process.env.BASE_URL}`,
      error: errors.array()[0].msg,
      nonce: res.locals.nonce,
      csrfToken: csrf_token,
    });
  }

  const {
    name,
    last_name,
    email,
    password,
    confirm_password,
    account_type,
    phone,
    address,
    date_of_birth,
  } = req.body;

  if (password !== confirm_password) {
    logger.error(`Passwords do not match`);
    return res.status(400).render("auth/signup", {
      baseUrl: `${process.env.BASE_URL}`,
      error: `Passwords do not match`,
      nonce: res.locals.nonce,
      csrfToken: csrf_token,
    });
  }

  try {
    const existing_user = await user_repo.findOne({ where: { email: email } });
    if (existing_user) {
      logger.error(`User with email ${email} already exists`);
      return res.status(400).render("auth/signup", {
        baseUrl: `${process.env.BASE_URL}`,
        error: `User with email ${email} already exists`,
        nonce: res.locals.nonce,
        csrfToken: csrf_token,
      });
    }
  } catch (err) {
    logger.error(`Error checking if user exists: ${err}`);
    res.status(500);
    return next(err);
  }

  logger.info(`Registering user with email ${email}`);

  try {
    // Hash password
    const salt_rounds = 10;

    logger.info(`Hashing password`);
    const hashed_password = await bcrypt.hash(password, salt_rounds);
    logger.info(`Password hashed`);

    // Let's create the user
    const new_user = new User();
    new_user.name = name;
    new_user.last_name = last_name;
    new_user.email = email;
    new_user.password_hash = hashed_password;
    new_user.account_type = account_type;
    new_user.phone_number = phone;
    new_user.home_address = address;
    new_user.date_of_birth = new Date(date_of_birth);

    // Save the user
    await user_repo.save(new_user);
    logger.info(`User ${email} successfully registered`);

    return res.redirect("/login");
  } catch (error) {
    logger.error(`Error registering user: ${error}`);
    res.status(500);
    return next(error);
  }
};

export const getForgotPassword = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;
  const tokens = new Tokens();

  const csrf_token = tokens.create(req.session.not_authenticated_csrf_secret!);

  try {
    logger.info(`Rendering forgot password page`);
    res.render("auth/forgot-password", {
      baseUrl: `${process.env.BASE_URL}`,
      error: null,
      success: null,
      nonce: res.locals.nonce,
      csrfToken: csrf_token,
    });
  } catch (error) {
    logger.error(`Error rendering forgot password page: ${error}`);
    res.status(500);
    return next(error);
  }
};

export const postForgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;
  const user_repo = AppDataSource.getRepository(User);

  const { email } = req.body;

  const host_header = req.headers.host as string;
  const allowed_hosts = getAllowedHosts();

  if (!allowed_hosts.includes(host_header)) {
    logger.error(`Host ${host_header} is not allowed`);
    res.status(403);
    return next(new Error("Host is not allowed"));
  }

  let user;

  try {
    logger.info(`Finding user with email ${email}`);
    user = await user_repo.findOneBy({ email });
    if (!user) {
      logger.error(`User with email ${email} not found`);
      return res.status(400).render("auth/forgot-password", {
        baseUrl: `${process.env.BASE_URL}`,
        error: `User with email ${email} not found`,
        success: null,
        nonce: res.locals.nonce,
      });
    }
  } catch (err) {
    logger.error(`Error finding user: ${err}`);
    res.status(500);
    return next(err);
  }

  let token;
  let hashed_token;

  // Generate token
  try {
    logger.info(`Generating token`);
    token = crypto.randomBytes(32).toString("hex");
    hashed_token = await bcrypt.hash(token, 10);
  } catch (err) {
    logger.error(`Error generating token: ${err}`);
    res.status(500);
    return next(err);
  }

  // Set expiration time for token to 15 minutes
  logger.info(`Setting expiration time for token`);
  const token_expiration = new Date(Date.now() + 900 * 1000);

  // Assign reset token and expiration to user
  try {
    logger.info(`Assigning token to user`);
    await user_repo.update(user.id, {
      reset_token: hashed_token,
      reset_token_expiration: token_expiration,
    });
  } catch (err) {
    logger.error(`Error assigning token to user: ${err}`);
    res.status(500);
    return next;
  }

  const resetLink = process.env.is_not_local
    ? `https://${host_header}/reset-password?token=${token}`
    : `http://${host_header}/reset-password?token=${token}`;

  const mail_options = {
    from: process.env.GMAIL_EMAIL,
    to: email,
    subject: "Password reset",
    text: `You requested a password reset. Please use the following link to reset your password: ${resetLink}`,
  };

  transporter.sendMail(mail_options, (err, info) => {
    if (err) {
      logger.error(`Error sending email: ${err}`);
      res.status(500);
      return next(err);
    }

    return res.status(200).render("auth/forgot-password", {
      baseUrl: `${process.env.BASE_URL}`,
      error: null,
      success: `Email sent to ${email}`,
      nonce: res.locals.nonce,
      csrfToken: req.session.not_authenticated_csrf_secret,
    });
  });
};

export const getResetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;
  logger.info(`Rendering reset password page`);

  const tokens = new Tokens();

  const csrf_token = tokens.create(req.session.not_authenticated_csrf_secret!);

  const { token } = req.query;

  res.render("auth/reset-password", {
    baseUrl: `${process.env.BASE_URL}`,
    error: null,
    success: null,
    nonce: res.locals.nonce,
    token,
    csrfToken: csrf_token,
  });
};

export const postResetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;
  const user_repo = AppDataSource.getRepository(User);

  const { token, email, password, confirm_password } = req.body;

  const allowed_hosts = getAllowedHosts();
  const host_header = req.headers.host as string;

  if (!allowed_hosts.includes(host_header)) {
    logger.error(`Host ${host_header} is not allowed`);
    res.status(403);
    return next(new Error("Host is not allowed"));
  }

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    logger.error(`Validation errors: ${errors.array()}`);
    return res.status(400).render("auth/reset-password", {
      baseUrl: `${process.env.BASE_URL}`,
      error: errors.array()[0].msg,
      success: null,
      nonce: res.locals.nonce,
      token,
    });
  }

  if (password !== confirm_password) {
    logger.error(`Passwords do not match`);
    return res.status(400).render("auth/reset-password", {
      baseUrl: `${process.env.BASE_URL}`,
      error: `Passwords do not match`,
      success: null,
      nonce: res.locals.nonce,
      token,
    });
  }

  let user;

  try {
    logger.info("Finding user by reset token");
    user = await user_repo.findOneBy({ email: email });

    if (!user) {
      logger.error(`User with email ${email} not found`);
      return res.status(400).render("auth/reset-password", {
        baseUrl: `${process.env.BASE_URL}`,
        error: `Failed fetching ${email} data. It may not exist.`,
        success: null,
        nonce: res.locals.nonce,
        token,
      });
    }
  } catch (err) {
    logger.error(`Error finding user by reset token: ${err}`);
    res.status(500);
    return next(err);
  }

  if (
    !user.reset_token_expiration ||
    user.reset_token_expiration < new Date()
  ) {
    logger.error(`Invalid or expired token`);
    return res.status(400).render("auth/reset-password", {
      baseUrl: `${process.env.BASE_URL}`,
      error: `Invalid token`,
      success: null,
      nonce: res.locals.nonce,
      token,
    });
  }

  try {
    const is_token_valid = await bcrypt.compare(
      token,
      user.reset_token as string
    );
    if (!is_token_valid) {
      logger.error(`Invalid token`);
      return res.status(400).render("auth/reset-password", {
        baseUrl: `${process.env.BASE_URL}`,
        error: `Invalid token`,
        success: null,
        nonce: res.locals.nonce,
        token,
      });
    }
  } catch (error) {
    logger.error(`Error comparing tokens: ${error}`);
    res.status(500);
    return next(error);
  }

  let hashed_password;
  try {
    hashed_password = await bcrypt.hash(password, 10);
  } catch (error) {
    logger.error(`Error hashing password: ${error}`);
    res.status(500);
    return next(error);
  }

  if (!user.two_fa_secret) {
    try {
      logger.info(`Updating user password`);
      await user_repo.update(user.id, {
        password_hash: hashed_password,
        reset_token: null,
        reset_token_expiration: null,
      });
    } catch (error) {
      logger.error(`Error updating user password: ${error}`);
      res.status(500);
      return next(error);
    }

    try {
      logger.info(`Redirecting to login page`);
      return res.redirect("/login");
    } catch (err) {
      logger.error(`Error redirecting to login page: ${err}`);
      res.status(500);
      return next(err);
    }
  }

  req.session.unlogged_email = email;
  req.session.hashed_password = hashed_password;

  // try {
  //   logger.info(`Updating user password`);
  //   await user_repo.update(user.id, {
  //     password_hash: hashed_password,
  //     resetToken: null,
  //     resetTokenExpiration: null,
  //   });
  // } catch (error) {
  //   logger.error(`Error updating user password: ${error}`);
  //   res.status(500);
  //   return next(error);
  // }
  try {
    logger.info(`Redirecting to 2fa verification page`);
    return res.redirect("/verify-2fa");
  } catch (err) {
    logger.error(`Error redirecting to 2fa verification page: ${err}`);
    res.status(500);
    return next(err);
  }
  // res.status(200).render("auth/reset-password", {
  //   baseUrl: `${process.env.BASE_URL}`,
  //   error: null,
  //   success: "Password successfully reset",
  //   nonce: res.locals.nonce,
  //   token,
  // });
};

export const getVerify2fa = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;
  const { unlogged_email } = req.session;

  const tokens = new Tokens();

  const csrf_token = tokens.create(req.session.not_authenticated_csrf_secret!);

  try {
    logger.info(`Rendering 2fa verification page`);
    res.render("auth/verify-2fa", {
      baseUrl: `${process.env.BASE_URL}`,
      verifyPath: unlogged_email ? "reset-password/verify-2fa" : "verify-2fa",
      error: null,
      nonce: res.locals.nonce,
      csrfToken: csrf_token,
    });
  } catch (error) {
    logger.error(`Error rendering 2fa verification page: ${error}`);
    res.status(500);
    return next(error);
  }
};

export const postLoginVerify2fa = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;
  const user_repo = AppDataSource.getRepository(User);
  const redis_client: RedisClientType = res.locals.redisClient;

  const errors = validationResult(req);
  try {
    if (!errors.isEmpty()) {
      logger.error(`Validation errors: ${errors.array()}`);
      return res.status(400).render("auth/verify-2fa", {
        baseUrl: `${process.env.BASE_URL}`,
        error: errors.array()[0].msg,
        nonce: res.locals.nonce,
      });
    }
  } catch (error) {
    logger.error(`Validation errors: ${errors.array()}`); //TODO this is strange - probably should remove this try/catch
    return res.status(500).render("auth/verify-2fa", {
      baseUrl: `${process.env.BASE_URL}`,
      error: "Internal server error",
      nonce: res.locals.nonce,
    });
  }

  if (!req.session.user?.uid || !req.session.user?.email) {
    logger.error(`Session data not found`);
    return res.redirect("/login");
  }

  const { code } = req.body as { code: number };

  if (!req.session.pending_2fa) {
    logger.error(`2fa not pending`);
    if (req.session.user!.uid) {
      return res.redirect(`/${req.session.user?.account_type}/dashboard`);
    }
    return res.redirect("/");
  }

  // Session is already set, but not verified
  const { uid, email } = req.session.user;

  let attempts_key: string;
  let lock_key: string;

  try {
    attempts_key = `2fa_attempts:${email}`;
    lock_key = `2fa_lock:${email}`;

    const is_locked = await redis_client.get(lock_key);

    if (is_locked) {
      logger.error(
        `User ${email} is locked out (too many verification attempts)`
      );

      req.session.destroy((err) => {
        if (err) {
          logger.error(`Error destroying session: ${err}`);
          res.status(500);
          return next(err);
        }

        logger.info(`Session destroyed`);
      });

      return res.status(400).render("auth/login", {
        baseUrl: `${process.env.BASE_URL}`,
        error: "User is locked out (too many verification attempts)",
        nonce: res.locals.nonce,
      });
    }
  } catch (error) {
    logger.error(`Error checking if user is locked out: ${error}`);
    res.status(500);
    return next(error);
  }

  let user;
  try {
    logger.info(`Getting user data`);
    user = await user_repo.findOneBy({ id: uid });
  } catch (error) {
    logger.error(`Error getting user data: ${error}`);
    res.status(500);
    return next(error);
  }

  if (!user) {
    logger.error(`User not found`);
    res.status(404);
    return next(new Error("User not found"));
  }

  if (!user.two_fa_secret) {
    logger.error(`2fa not enabled for user`);
    if (req.session.user!.uid) {
      return res.redirect(`/${req.session.user.account_type}/dashboard`);
    }

    return res.redirect("/");
  }

  let verified = false;

  try {
    logger.info(`Verifying 2fa code`);

    // We assume that twoFASecret is available here
    verified = await verify2fa(user.two_fa_secret as string, code.toString());
  } catch (error) {
    logger.error(`Error verifying 2fa code: ${error}`);
    res.status(500);
    return next(error);
  }

  if (verified) {
    req.session.pending_2fa = false;
    logger.info(`2fa code verified`);

    req.session.not_authenticated_csrf_secret = undefined;
    req.session.csrf_secret = new Tokens().secretSync();
    try {
      logger.info(`Redirecting to dashboard`);
      return res.redirect(`/${req.session.user?.account_type}/dashboard`);
    } catch (error) {
      logger.error(`Error redirecting to dashboard: ${error}`);
      res.status(500);
      return next(error);
    }
  }

  await incrementFailedAttempts(attempts_key, lock_key, redis_client);
  logger.error(`Invalid 2fa code`);

  return res.status(400).render("auth/verify-2fa", {
    baseUrl: `${process.env.BASE_URL}`,
    error: "Invalid 2fa code",
    verifyPath: "verify-2fa",
    nonce: res.locals.nonce,
  });
};

export const postResetPasswordVerify2fa = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  const user_repo = AppDataSource.getRepository(User);

  const redis_client: RedisClientType = res.locals.redisClient;

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    logger.error(`Validation errors: ${errors.array()}`);
    return res.status(400).render("auth/verify-2fa", {
      baseUrl: `${process.env.BASE_URL}`,
      error: errors.array()[0].msg,
      nonce: res.locals.nonce,
    });
  }

  const { code } = req.body as { code: number };

  if (!req.session.unlogged_email || !req.session.hashed_password) {
    logger.error(`Session data not found`);
    return res.redirect("/login");
  }

  const { unlogged_email, hashed_password } = req.session;

  let attempts_key: string;
  let lock_key: string;

  try {
    attempts_key = `2fa_attempts:${unlogged_email}`;
    lock_key = `2fa_lock:${unlogged_email}`;

    const is_locked = await redis_client.get(lock_key);

    if (is_locked) {
      logger.error(
        `User ${unlogged_email} is locked out (too many verification attempts)`
      );
      req.session.destroy((err) => {
        if (err) {
          logger.error(`Error destroying session: ${err}`);
          res.status(500);
          return next(err);
        }

        logger.info(`Session destroyed`);
      });

      return res.status(400).render("auth/login", {
        baseUrl: `${process.env.BASE_URL}`,
        error: "User is locked out (too many verification attempts)",
        nonce: res.locals.nonce,
      });
    }
  } catch (error) {
    logger.error(`Error checking if user is locked out: ${error}`);
    res.status(500);
    return next(error);
  }

  let user;

  try {
    logger.info(`Finding user by email`);
    user = await user_repo.findOneBy({ email: unlogged_email });
  } catch (error) {
    logger.error(`Error finding user by email: ${error}`);
    res.status(500);
    return next(error);
  }

  if (!user) {
    logger.error(`User not found`);
    res.status(404);
    return next(new Error("User not found"));
  }

  if (!user.two_fa_secret) {
    logger.error(`2fa not enabled for user`);
    return res.redirect("/login");
  }

  let verified = false;
  try {
    logger.info(`Verifying 2fa code`);

    // We assume that twoFASecret is available here
    verified = await verify2fa(user.two_fa_secret as string, code.toString());
  } catch (error) {
    logger.error(`Error verifying 2fa code: ${error}`);
    res.status(500);
    return next(error);
  }

  if (verified) {
    req.session.destroy((err) => {
      if (err) {
        logger.error(`Error destroying session: ${err}`);
        res.status(500);
        return next(err);
      }

      logger.info(`Session destroyed`);
    });

    try {
      logger.info(`Updating user password`);
      await user_repo.update(user.id, {
        password_hash: hashed_password,
        reset_token: null,
        reset_token_expiration: null,
      });
    } catch (error) {
      logger.error(`Error updating user password: ${error}`);
      res.status(500);
      return next(error);
    }

    try {
      logger.info(`Redirecting to login page`);
      return res.redirect("/login");
    } catch (error) {
      logger.error(`Error redirecting to login page: ${error}`);
      res.status(500);
      return next(error);
    }
  }

  await incrementFailedAttempts(attempts_key, lock_key, redis_client);

  logger.error(`Invalid 2fa code`);

  return res.status(400).render("auth/verify-2fa", {
    baseUrl: `${process.env.BASE_URL}`,
    error: "Invalid 2fa code",
    nonce: res.locals.nonce,
    verifyPath: "reset-password/verify-2fa",
  });
};

export const postLogout = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;
  logger.info(`Logging out user`);

  req.session.destroy((err) => {
    if (err) {
      logger.error(`Error destroying session: ${err}`);
      res.status(500);
      return next(err);
    }

    logger.info(`Session destroyed`);
    res.redirect("/login");
  });
};

const generate2FASecret = (userEmail: string) => {
  // Utwórz obiekt OTPAuth.TOTP (czasowy kod jednorazowy)
  const totp = new OTPAuth.TOTP({
    issuer: "PayrollPro", // Nazwa Twojej aplikacji
    label: userEmail, // Email użytkownika jako identyfikator
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  // Wygeneruj tajny klucz (base32 encoded)
  const secret = encode(totp.secret.bytes);

  // Utwórz URL dla aplikacji uwierzytelniającej
  const otpauthURL = totp.toString();

  return { secret, otpauthURL };
};
