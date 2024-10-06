import { Request, Response } from "express";
import { log, Logger } from "winston";

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
    });
  } catch (error) {
    logger.error(`Error rendering signup page: ${error}`);
    res.status(500).send("Error rendering signup page");
  }
};

export const postSignup = (req: Request, res: Response) => {
  const logger: Logger = res.locals.logger;

  logger.info(`Received signup request`);

  const required_fields = ["name", "last_name", "email", "password", "confirm_password", "account_type"];

  for (const field of required_fields) {
    if (!req.body[field]) {
      logger.error(`${field} not provided`);
      return res.status(400).send(`Missing field ${field}`);
    }
  }
  
};
