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
