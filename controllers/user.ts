import { NextFunction, Request, Response } from "express";
import { Logger } from "winston";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";

// TODO -> add validation && think if changing personal data should be confirmed by email or 2fa
export const postUpdateUserPersonalData = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  const user_repo = AppDataSource.getRepository(User);

  if (!req.session.user) {
    logger.error(`Session data not found`);
    res.status(400);
    return next(new Error("Session data not found"));
  }

  const { uid, account_type } = req.session.user;

  if (!uid || !account_type) {
    logger.error(`Session data not found`);
    res.status(400);
    return next(new Error("Session data not found"));
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
    return next(error);
  }

  if (!user) {
    logger.error(`User not found`);
    res.status(404);
    return next(new Error("User not found"));
  }

  try {
    const does_email_exist = await user_repo.findOneBy({ email: email });

    if (does_email_exist) {
      logger.error(`Email already exists`);
      return res.status(302).redirect(`../${user.account_type}/settings?error=Unable to update personal data.`);
    //   return res.status(400).render(`manager/settings`, {
    //     baseUrl: `${process.env.BASE_URL}`,
    //     loggedUser: req.session.user.uid,
    //     is2faEnabled: user.two_fa_secret ? true : false,
    //     user: user,
    //     nonce: res.locals.nonce,
    //     accountType: req.session.user.account_type,
    //     error: "Email already exists",
    //   })
    }
  } catch (error) {
    logger.error(`Error checking if email exists: ${error}`);
    res.status(500);
    return next(error);
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
    // return res.render("manager/settings", {
    //     baseUrl: `${process.env.BASE_URL}`,
    //     loggedUser: req.session.user.uid,
    //     is2faEnabled: user.two_fa_secret ? true : false,
    //     user: user,
    //     nonce: res.locals.nonce,
    //     accountType: req.session.user.account_type,
    // });
  } catch (error) {
    logger.error(`Error updating user data: ${error}`);
    res.status(500);
    return next(error);
  }
};

// export const getUserSettings = async (
//     req: Request,
//     res: Response,
//     next: NextFunction
//   ) => {
//     const logger: Logger = res.locals.logger;
//     logger.info(`Getting employee settings`);

//     const user_repo = AppDataSource.getRepository(User);

//     if (!req.session.user) {
//       logger.error(`Session data not found`);
//       res.status(400);
//       return next(new Error("Session data not found"));
//     }

//     const { uid } = req.session.user;

//     if (!uid) {
//       logger.error(`Session data not found`);
//       res.status(400);
//       return next(new Error("Session data not found"));
//     }

//     let user;
//     try {
//       logger.info(`Getting user data`);
//       user = await user_repo.findOneBy({ id: uid });
//     } catch (error) {
//       logger.error(`Error getting user data: ${error}`);
//       res.status(500);
//       return next(error);
//     }

//     if (!user) {
//       logger.error(`User not found`);
//       res.status(404);
//       return next(new Error("User not found"));
//     }

//     const is_2fa_enabled = user.two_fa_secret ? true : false;

//     try {
//       logger.info(`Rendering employee settings page`);
//       res.render("employee/settings", {
//         baseUrl: `${process.env.BASE_URL}`,
//         loggedUser: req.session.user.uid,
//         is2faEnabled: is_2fa_enabled,
//         nonce: res.locals.nonce,
//       });
//     } catch (error) {
//       logger.error(`Error rendering employee settings page: ${error}`);
//       res.status(500);
//       return next(error);
//     }
//   };

// TODO -> delete this if not needed
