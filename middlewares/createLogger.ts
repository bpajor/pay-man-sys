import { NextFunction, Request, Response } from "express";
import winston from "winston";

export const createLogger = (req: Request, res: Response, next: NextFunction) => {
  const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
      winston.format.json()
    ),
    transports: [
      new winston.transports.Console({
        stderrLevels: ["error"],
      }),
    ],
  });

  res.locals.logger = logger;
  next();
};
