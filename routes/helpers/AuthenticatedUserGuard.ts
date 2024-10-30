import { NextFunction, Request, Response } from "express";

export const authenticatedUserGuard = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (req.session.user && !req.session.pending_2fa) {
        return res.redirect(`${req.session.user.account_type}/dashboard`);
    }

    return next();
}