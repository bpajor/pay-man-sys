import { Application, Router } from "express";
import {
  getEmployeeAttendance,
  getEmployeeEarnings,
  getEmployeeJoinRequest,
  getEmployeeMainPage,
  getEmployeeSettings,
  getMainPage,
  postEmployeeAttendace,
  postEmployeeJoinRequest,
} from "../controllers/employee";
import { Guard2fa } from "./helpers/Guard2fa";
import { authenticationRoutesGuard, authorizationEmployeeGuard } from "./helpers/RoutesGuard";
import { csrfBodyValidator } from "./helpers/CsrfProtection";
import { validators } from "./helpers/Validators";

export const employee_router = Router();

employee_router.get("/", getMainPage);

employee_router.get(
  "/employee/dashboard",
  authenticationRoutesGuard,
  authorizationEmployeeGuard,
  Guard2fa,
  getEmployeeMainPage as Application
);

employee_router.get(
  "/employee/settings",
  authenticationRoutesGuard,
  authorizationEmployeeGuard,
  Guard2fa,
  getEmployeeSettings as Application
);

employee_router.get(
  "/employee/join-request",
  authenticationRoutesGuard,
  authorizationEmployeeGuard,
  Guard2fa,
  getEmployeeJoinRequest as Application
)

employee_router.post(
  "/employee/join-request",
  validators.company_name,
  authenticationRoutesGuard,
  authorizationEmployeeGuard,
  Guard2fa,
  csrfBodyValidator,
  postEmployeeJoinRequest
)

employee_router.get(
  "/employee/earnings",
  authenticationRoutesGuard,
  authorizationEmployeeGuard,
  Guard2fa,
  getEmployeeEarnings
)

employee_router.get(
  "/employee/attendance",
  authenticationRoutesGuard,
  authorizationEmployeeGuard,
  Guard2fa,
  getEmployeeAttendance
)

employee_router.post(
  "/employee/attendance",
  validators.attendance_type,
  authenticationRoutesGuard,
  authorizationEmployeeGuard,
  Guard2fa,
  csrfBodyValidator,
  postEmployeeAttendace
)