import { Router } from "express";
import { postUpdateUserPersonalData } from "../controllers/user";
import { authenticationRoutesGuard } from "./helpers/RoutesGuard";
import { Guard2fa } from "./helpers/Guard2fa";

export const user_router = Router();

// TODO -> add validators
user_router.post("/user/update-personal-data", authenticationRoutesGuard, Guard2fa, postUpdateUserPersonalData);