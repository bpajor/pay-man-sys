import { Application, Router } from "express";
import {
  getEmployeeMainPage,
  getEmployeeSettings,
  getMainPage,
} from "../controllers/employee";
import { Guard2fa } from "./helpers/Guard2fa";
import { RoutesGuard } from "./helpers/RoutesGuard";

export const employee_router = Router();

employee_router.get("/", getMainPage);

employee_router.get(
  "/employee/dashboard",
  RoutesGuard,
  Guard2fa,
  getEmployeeMainPage as Application
);

employee_router.get(
  "/employee/settings",
  RoutesGuard,
  Guard2fa,
  getEmployeeSettings
);
