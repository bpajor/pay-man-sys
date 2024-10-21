import { NextFunction, Request, Response } from "express";
import { Logger } from "winston";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import OTPAuth from "otpauth";
import { encode } from "hi-base32";
import QRCode from "qrcode";
import { Employee } from "../entity/Employee";
import { Company } from "../entity/Company";

type HoursChange = {
  day_worked: 0 | 1;
  day_sick_leave: 0 | 1;
  day_vacation: 0 | 1;
  day_on_demand_leave: 0 | 1;
};

export const getMainPage = (req: Request, res: Response) => {
  const logger: Logger = res.locals.logger;
  try {
    logger.info(`Rendering main page`);
    res.render("common/main", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: req.session.user?.uid,
      nonce: res.locals.nonce,
      accountType: req.session.user?.account_type,
    });
  } catch (error) {
    logger.info(`Error rendering main page: ${error}`);
    res.status(500).send("Error rendering main page");
  }
};

export const getEmployeeMainPage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;
  const userRepo = AppDataSource.getRepository(User);

  if (!req.session.user) {
    logger.error(`Session data not found`);
    return res.status(400).send("Session data not found"); //TODO here and in other places - should be next(new Error("Session data not found"))
  }

  const { uid, account_type } = req.session.user;

  if (account_type !== "employee") {
    logger.error(`User is not an employee`);
    res.status(403);
    return next(new Error("Unauthorized"));
  }

  if (!uid) {
    logger.error(`Session data not found`);
    return res.status(400).send("Session data not found");
  }

  // TODO -> should just show message that employee is not entitled to any company
  if (!req.session.user.company_id) {
    logger.error(`Company not found`);
    res.status(404);
    return next(new Error("Company not found"));
  }

  let user;
  try {
    logger.info(`Getting user data`);
    user = await userRepo.findOneBy({ id: uid });
  } catch (error) {
    logger.error(`Error getting user data: ${error}`);
    res.status(500);
    return next(error);
  }

  let company;
  try {
    logger.info(`Getting company data`);
    company = await AppDataSource.getRepository(Company).findOneBy({
      id: req.session.user.company_id!,
    })
  } catch (error) {
    logger.error(`Error getting company data: ${error}`);
    res.status(500);
    return next(error);
  }

  try {
    logger.info(`Rendering employee main page`);
    res.render("employee/main", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: user,
      nonce: res.locals.nonce,
      accountType: req.session.user.account_type,
      jrequestsPending: null,
      company
    });
  } catch (error) {
    logger.error(`Error rendering employee main page: ${error}`);
    res.status(500);
    return next(error);
  }
};

export const getEmployeeSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;
  logger.info(`Getting employee settings`);

  const user_repo = AppDataSource.getRepository(User);

  if (!req.session.user) {
    logger.error(`Session data not found`);
    res.status(400);
    return next(new Error("Session data not found"));
  }

  const { uid } = req.session.user;

  if (!uid) {
    logger.error(`Session data not found`);
    res.status(400);
    return next(new Error("Session data not found"));
  }

  if (req.session.user.account_type !== "employee") {
    logger.error(`User is not an employee`);
    res.status(403);
    return next(new Error("Unauthorized"));
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

  const is_2fa_enabled = user.two_fa_secret ? true : false;

  const {error} = req.query;

  if (error) {
    logger.warn(`Error happened before rendering settings page: ${error}`);
    return res.status(400).render("manager/settings", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: req.session.user.uid,
      user: user,
      is2faEnabled: is_2fa_enabled,
      nonce: res.locals.nonce,
      accountType: req.session.user.account_type,
      error: error,
    })
  }

  try {
    logger.info(`Rendering employee settings page`);
    res.render("employee/settings", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: req.session.user.uid,
      user: user,
      is2faEnabled: is_2fa_enabled,
      nonce: res.locals.nonce,
      accountType: req.session.user.account_type,
      error: null
    });
  } catch (error) {
    logger.error(`Error rendering employee settings page: ${error}`);
    res.status(500);
    return next(error);
  }
};

// export const postEnable2fa = async (
//   req: Request,
//   res: Response,
//   next: NextFunction
// ) => {
//   const logger: Logger = res.locals.logger;
//   const user_repo = AppDataSource.getRepository(User);

//   logger.info(`Enabling 2fa`);

//   if (!req.session.user) {
//     logger.error(`Session data not found`);
//     res.status(400);
//     return next(new Error("Session data not found"));
//   }

//   const { email, uid } = req.session.user;

//   if (!email || !uid) {
//     logger.error(`Session data not found`);
//     return res.status(400).json({ success: false });
//   }

//   const { secret, otpauthURL } = generate2FASecret(email);

//   let qrCodeDataUrl;
//   try {
//     logger.info(`Generating QR code`);
//     qrCodeDataUrl = await QRCode.toDataURL(otpauthURL);
//   } catch (error) {
//     logger.error(`Error generating QR code: ${error}`);
//     return res.status(500).json({ success: false });
//   }

//   try {
//     logger.info(`Updating user with 2fa secret`);
//     await user_repo.update({ id: uid }, { two_fa_secret: secret });
//   } catch (error) {
//     logger.error(`Error updating user with 2fa secret: ${error}`);
//     return res.status(500).json({ success: false });
//   }

//   return res.json({
//     success: true,
//     qrCode: qrCodeDataUrl,
//   });
// };

// export const postDisable2fa = async (req: Request, res: Response) => {
//   const logger = res.locals.logger;
//   logger.info(`Disabling 2fa`);

//   const user_repo = AppDataSource.getRepository(User);

//   if (!req.session.user) {
//     logger.error(`Session data not found`);
//     return res.status(400).json({ success: false });
//   }

//   const { uid } = req.session.user;

//   if (!uid) {
//     logger.error(`Session data not found`);
//     return res.status(400).json({ success: false });
//   }

//   try {
//     logger.info(`Disabling 2fa for user`);
//     await user_repo.update({ id: uid }, { two_fa_secret: null });
//   } catch (error) {
//     logger.error(`Error disabling 2fa for user: ${error}`);
//     return res.status(500).json({ success: false });
//   }

//   return res.json({ success: true });
// };

// const generate2FASecret = (userEmail: string) => {
//   // Utwórz obiekt OTPAuth.TOTP (czasowy kod jednorazowy)
//   const totp = new OTPAuth.TOTP({
//     issuer: "PayrollPro", // Nazwa Twojej aplikacji
//     label: userEmail, // Email użytkownika jako identyfikator
//     algorithm: "SHA1",
//     digits: 6,
//     period: 30,
//   });

//   // Wygeneruj tajny klucz (base32 encoded)
//   const secret = encode(totp.secret.bytes);

//   // Utwórz URL dla aplikacji uwierzytelniającej
//   const otpauthURL = totp.toString();

//   return { secret, otpauthURL };
// };
