import { NextFunction, Response, Request } from "express";

export const RoutesGuard = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.user) {
        res.status(403);
        return next(new Error("Unauthorized"));
    }
    next();
}