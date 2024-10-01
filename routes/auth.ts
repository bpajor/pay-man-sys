import { Router } from "express";
import { getLogin, getSignup } from "../controllers/auth";

export const auth_router = Router();

auth_router.get("/login", getLogin);

auth_router.get("/signup", getSignup);