import { Request, Response } from "express";
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

export const postSignup = async (req: Request, res: Response) => {
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

  const required_fields = [
    "name",
    "last_name",
    "email",
    "password",
    "confirm_password",
    "account_type",
  ];

  for (const field of required_fields) {
    if (!req.body[field]) {
      logger.error(`${field} not provided`);
      return res.status(400).send(`Missing field ${field}`);
    }
  }

  const { name, last_name, email, password, confirm_password, account_type } =
    req.body;

  if (password !== confirm_password) {
    logger.error(`Passwords do not match`);
    return res.status(400).send("Passwords do not match");
  }

  try {
    // Hash password
    const salt_rounds = 10;
    const hashed_password = await bcrypt.hash(password, salt_rounds);

    // Let's create the user
    const user_repo = AppDataSource.getRepository(User);
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
    res.status(500).send("Error registering user");
  }
};
