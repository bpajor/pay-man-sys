import { NextFunction, Request, Response } from "express";
import { log, Logger } from "winston";
import bcrypt from "bcrypt";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { validationResult } from "express-validator";
import { RedisClientType } from "redis";
import { incrementFailedAttempts } from "./helpers/ddos";
import { getAllowedHosts, transporter } from "./helpers/transporter";
import crypto from "crypto";

export const getLogin = (req: Request, res: Response) => {
  const logger: Logger = res.locals.logger;
  try {
    logger.info(`Rendering login page`);
    res.render("auth/login", {
      baseUrl: `${process.env.BASE_URL}`,
      error: null,
    });
  } catch (error) {
    logger.error(`Error rendering login page: ${error}`);
    res.status(500).send("Error rendering login page");
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

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.error(`Validation errors: ${errors.array()}`);
    return res.status(400).render("auth/login", {
      baseUrl: `${process.env.BASE_URL}`,
      error: errors.array()[0].msg,
      nonce: res.locals.nonce,
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
      });
    }
  } catch (error) {
    logger.error(`Error checking if user is locked out: ${error}`);
    res.status(500);
    return next(error);
  }

  try {
    user = await user_repo.findOne({ where: { email: email } });
    if (!user) {
      logger.error(`User with email ${email} not found`);

      await incrementFailedAttempts(attemptsKey, lockKey, redisClient);

      return res.status(400).render("auth/login", {
        baseUrl: `${process.env.BASE_URL}`,
        error: "Invalid email or password",
        nonce: res.locals.nonce,
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
      });
    }
  } catch (error) {
    logger.error(`Error comparing passwords: ${error}`);
    res.status(500);
    return next(error);
  }

  req.session.uid = user.id;
  req.session.email = user.email;
  req.session.account_type = user.account_type as "employee" | "manager";

  logger.info(`User ${email} successfully logged in`);

  await redisClient.del(attemptsKey);

  return res.redirect("/employee/dashboard");
};

export const getSignup = (req: Request, res: Response) => {
  const logger: Logger = res.locals.logger;
  try {
    logger.info(`Rendering signup page`);
    res.render("auth/signup", {
      baseUrl: `${process.env.BASE_URL}`,
      error: null,
      nonce: res.locals.nonce,
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

  logger.info(`Received signup request`);

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    logger.error(`Validation errors: ${errors.array()}`);
    return res.status(400).render("auth/signup", {
      baseUrl: `${process.env.BASE_URL}`,
      error: errors.array()[0].msg,
      nonce: res.locals.nonce,
    });
  }

  const { name, last_name, email, password, confirm_password, account_type } =
    req.body;

  if (password !== confirm_password) {
    logger.error(`Passwords do not match`);
    return res.status(400).render("auth/signup", {
      baseUrl: `${process.env.BASE_URL}`,
      error: `Passwords do not match`,
      nonce: res.locals.nonce,
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
  try {
    logger.info(`Rendering forgot password page`);
    res.render("auth/forgot-password", {
      baseUrl: `${process.env.BASE_URL}`,
      error: null,
      success: null,
      nonce: res.locals.nonce,
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
      resetToken: hashed_token,
      resetTokenExpiration: token_expiration,
    });
  } catch (err) {
    logger.error(`Error assigning token to user: ${err}`);
    res.status(500);
    return next;
  }

  const resetLink = `https://${host_header}/reset-password?token=${token}`;

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
    });
  })
};

export const getResetPassword = async (req: Request, res: Response, next: NextFunction) => {
  const logger: Logger = res.locals.logger;
  logger.info(`Rendering reset password page`);

  const { token } = req.query;

  res.render("auth/reset-password", {
    baseUrl: `${process.env.BASE_URL}`,
    error: null,
    success: null,
    nonce: res.locals.nonce,
    token,
  })
}

export const postResetPassword = async (req: Request, res: Response, next: NextFunction) => {
  const logger: Logger = res.locals.logger;
  const user_repo = await AppDataSource.getRepository(User);

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
  } catch (err) {
    logger.error(`Error finding user by reset token: ${err}`);
    res.status(500);
    return next(err);
  }

  if (!user || !user.resetTokenExpiration || user.resetTokenExpiration < new Date()) {
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
    const is_token_valid = await bcrypt.compare(token, user.resetToken as string);
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

  try {
    logger.info(`Updating user password`);
    await user_repo.update(user.id, {
      password_hash: hashed_password,
      resetToken: null,
      resetTokenExpiration: null,
    });
  } catch (error) {
    logger.error(`Error updating user password: ${error}`);
    res.status(500);
    return next(error);
  }

  res.status(200).render("auth/reset-password", {
    baseUrl: `${process.env.BASE_URL}`,
    error: null,
    success: "Password successfully reset",
    nonce: res.locals.nonce,
    token,
  })
}
