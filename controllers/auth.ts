import { Request, Response } from "express";

export const getLogin = (req: Request, res: Response) => {
  res.render("auth/login", {
    baseUrl: `${process.env.BASE_URL}`,
  });
};

export const getSignup = (req: Request, res: Response) => {
  res.render("auth/signup", {
    baseUrl: `${process.env.BASE_URL}`,
  });
};
