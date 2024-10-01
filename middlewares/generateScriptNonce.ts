import { NextFunction, Request, Response } from "express";
import crypto from "crypto";
import { Logger } from "winston";

export const generateScriptNonce = (req: Request, res: Response, next: NextFunction) => {
    const logger: Logger = res.locals.logger;
    logger.info(`Generating script nonce`);
    try {
        res.locals.nonce = crypto.randomBytes(16).toString("base64");
        next();
    } catch (error) {
        console.error(`Error generating script nonce: ${error}`);
        next(error);
    }
};