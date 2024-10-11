import { NextFunction, Request, Response } from "express";
import { log, Logger } from "winston";
import bcrypt from "bcrypt";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { validationResult } from "express-validator";

export const getLogin = (req: Request, res: Response) => {
  const logger: Logger = res.locals.logger;
  try {
    logger.info(`Rendering login page`);
    res.render("auth/login", {
      baseUrl: `${process.env.BASE_URL}`,
    });
  } catch (error) {
    logger.error(`Error rendering login page: ${error}`);
    res.status(500).send("Error rendering login page");
  }
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
