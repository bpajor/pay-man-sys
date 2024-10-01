import { Request, Response } from "express";

export const getMainPage = (req: Request, res: Response) => {
    res.render("common/main", {
        baseUrl: `${process.env.BASE_URL}`
    })
};