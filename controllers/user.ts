import { NextFunction, Request, Response } from "express";
import { Logger } from "winston";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import { userInSessionFieldsExist } from "./helpers/validator";
import { validationResult } from "express-validator";
import { validatorError } from "./helpers/validator_errors";

// TODO -> add validation && think if changing personal data should be confirmed by email or 2fa
export const postUpdateUserPersonalData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  const user_repo = AppDataSource.getRepository(User);

  const user_session = req.session.user!;

  if (!userInSessionFieldsExist(["uid", "account_type"], user_session)) {
    logger.error(`Session data not found`);
    res.status(400);
    return next(new Error("Bad request"));
  }

  const { uid, account_type } = user_session;
  
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    logger.error(`Bad request data`);
    res.status(400);
    return next(new Error(`Bad request: ${errors.array()[0].msg}`));
  }

  const { name, last_name, email, phone_number, home_address, date_of_birth } =
    req.body;

  if (
    !name ||
    !last_name ||
    !email ||
    !phone_number ||
    !home_address ||
    !date_of_birth
  ) {
    logger.error(`Invalid request data`);
    res.status(400);
    return next(new Error("Invalid request data"));
  }

  let user;

  try {
    logger.info(`Getting user data`);
    user = await user_repo.findOneBy({ id: uid });
  } catch (error) {
    logger.error(`Error getting user data: ${error}`);
    res.status(500);
    return next(new Error("Error getting user data"));
  }

  if (!user) {
    logger.error(`User not found`);
    res.status(404);
    return next(new Error("User not found"));
  }

  if (user.email !== email) {
    try {
      const does_email_exist = await user_repo.findOneBy({ email: email });

      if (does_email_exist) {
        logger.error(`Email already exists`);
        return res
          .status(302)
          .redirect(
            `../${user.account_type}/settings?error=Unable to update personal data.`
          );
      }
    } catch (error) {
      logger.error(`Error checking if email exists: ${error}`);
      res.status(500);
      return next(new Error("Internal server error"));
    }
  }

  user.name = name;
  user.last_name = last_name;
  user.email = email;
  user.phone_number = phone_number;
  user.home_address = home_address;
  user.date_of_birth = date_of_birth;

  try {
    logger.info(`Updating user data`);
    await user_repo.save(user);

    return res.status(302).redirect(`../${user.account_type}/settings`);
  } catch (error) {
    logger.error(`Error updating user data: ${error}`);
    res.status(500);
    return next(new Error("Error updating user data"));
  }
};