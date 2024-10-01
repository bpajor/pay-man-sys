import { Request, Response } from "express";

export const getLogin = (req: Request, res: Response) => {
  res.render("auth/login");
};
