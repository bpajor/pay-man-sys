import { Request, Response } from "express";
import { Logger } from "winston";

export const getMainPage = (req: Request, res: Response) => {
  const logger: Logger = res.locals.logger;
  try {
    logger.info(`Rendering main page`);
    res.render("common/main", {
      baseUrl: `${process.env.BASE_URL}`,
    });
  } catch (error) {
    logger.info(`Error rendering main page: ${error}`);
    res.status(500).send("Error rendering main page");
  }
};

export const getEmployeeMainPage = (req: Request, res: Response) => {
  const logger: Logger = res.locals.logger;
  try {
    logger.info(`Rendering employee main page`);
    res.render("employee/main", {
      baseUrl: `${process.env.BASE_URL}`,
      nonce: res.locals.nonce,
    });
  } catch (error) {
    logger.error(`Error rendering employee main page: ${error}`);
    res.status(500).send("Error rendering employee main page");
  }
};
