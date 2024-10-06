import { Application, Router } from "express";
import { getLogin, getSignup, postSignup } from "../controllers/auth";

export const auth_router = Router();

auth_router.get("/login", getLogin);

auth_router.get("/signup", getSignup);

// Use Application type to avoid ts complaints
auth_router.post("/signup", postSignup as Application);