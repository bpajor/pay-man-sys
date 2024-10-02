import { Request, Response } from "express";
import { Logger } from "winston";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { randomInt } from "crypto";

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

export const getEmployeeMainPage = async (req: Request, res: Response) => {
  const logger: Logger = res.locals.logger;

  //Let's test typeorm crud

  // const userRepo = AppDataSource.getRepository(User);

  // const new_user = new User();
  // new_user.username = `testuser${randomInt(100000)}`;
  // new_user.email = `testuser${randomInt(100000)}@example.com`;
  // new_user.password_hash = `testpassword`;

  // await userRepo.save(new_user);

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
