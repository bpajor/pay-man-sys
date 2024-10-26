import { NextFunction, Response, Request } from "express";
import { Logger } from "winston";

export const authenticationRoutesGuard = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;
  if (!req.session.user) {
    logger.error("Unauthorized");
    res.status(403);
    return next(new Error("Unauthorized"));
  }
  next();
};

export const authenticationAPIRoutesGuard = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;
  if (!req.session.user) {
    logger.error("Unauthorized");
    res.status(403);
    return res.json({ error: "Unauthorized" });
  }
  next();
};

export const authorizationManagerGuard = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;
  if (req.session.user!.account_type !== "manager") {
    logger.error("Unauthorized");
    res.status(403);
    return next(new Error("Unauthorized"));
  }
  next();
};

export const authorizationEmployeeGuard = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;
  if (req.session.user!.account_type !== "employee") {
    logger.error("Unauthorized");
    res.status(403);
    return next(new Error("Unauthorized"));
  }
  next();
};

export const authorizationManagerAPIGuard = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;
  if (req.session.user!.account_type !== "manager") {
    logger.error("Unauthorized");
    res.status(403);
    return res.json({ error: "Unauthorized" });
  }
  next();
};

export const authorizationEmployeeAPIGuard = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;
  if (req.session.user!.account_type !== "employee") {
    logger.error("Unauthorized");
    res.status(403);
    return res.json({ error: "Unauthorized" });
  }
  next();
};
