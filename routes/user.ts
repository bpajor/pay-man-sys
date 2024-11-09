import { Router } from "express";
import { postUpdateUserPersonalData } from "../controllers/user";
import { authenticationRoutesGuard } from "./helpers/RoutesGuard";
import { Guard2fa } from "./helpers/Guard2fa";
import { csrfBodyValidator } from "./helpers/CsrfProtection";
import { body } from "express-validator";
import xss from "xss";
import { xssFilter } from "helmet";
import { validators } from "./helpers/Validators";

export const user_router = Router();

// TODO -> add validators
user_router.post(
  "/user/update-personal-data",
  authenticationRoutesGuard,
  validators.name,
  validators.last_name,
  validators.email,
  validators.phone_number,
  validators.home_address,
  validators.date_of_birth,
  Guard2fa,
  csrfBodyValidator,
  postUpdateUserPersonalData
);
