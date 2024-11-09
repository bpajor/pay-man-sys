import { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { Logger } from "winston";

export const validatorError = (req: Request, res: Response, next: NextFunction, logger: Logger) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    logger.error(`Bad request data`);
    res.status(400);
    return next(new Error(`Bad request: ${errors.array()[0].msg}`));
  }
}