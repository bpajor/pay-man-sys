import { NextFunction, Request, Response } from "express";
import crypto from "crypto";

export const generateScriptNonce = (req: Request, res: Response, next: NextFunction) => {
    res.locals.nonce = crypto.randomBytes(16).toString("base64");
    next();
};