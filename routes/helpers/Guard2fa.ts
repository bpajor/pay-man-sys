import { NextFunction, Request, Response } from "express";

export const Guard2fa = (req: Request, res: Response, next: NextFunction) => {
  if (req.session.pending_2fa) {
    return res.redirect("/verify-2fa");
  }

  next();
};
