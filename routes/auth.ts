import { Router } from "express";
import { getLogin } from "../controllers/auth";

export const auth_router = Router();

auth_router.get("/login", getLogin);