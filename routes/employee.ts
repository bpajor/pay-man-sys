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

export const employee_router = Router();

employee_router.get("/", getMainPage);

employee_router.get(
  "/employee/dashboard",
  authenticationRoutesGuard,
  Guard2fa,
  authorizationEmployeeGuard,
  getEmployeeMainPage as Application
);

employee_router.get(
  "/employee/settings",
  authenticationRoutesGuard,
  Guard2fa,
  authorizationEmployeeGuard,
  getEmployeeSettings as Application
);

employee_router.get(
  "/employee/join-request",
  authenticationRoutesGuard,
  Guard2fa,
  authorizationEmployeeGuard,
  getEmployeeJoinRequest as Application
)

employee_router.post(
  "/employee/join-request",
  authenticationRoutesGuard,
  Guard2fa,
  authorizationEmployeeGuard,
  postEmployeeJoinRequest
)

employee_router.get(
  "/employee/earnings",
  authenticationRoutesGuard,
  Guard2fa,
  authorizationEmployeeGuard,
  getEmployeeEarnings
)

employee_router.get(
  "/employee/attendance",
  authenticationRoutesGuard,
  Guard2fa,
  authorizationEmployeeGuard,
  getEmployeeAttendance
)

employee_router.post(
  "/employee/attendance",
  authenticationRoutesGuard,
  Guard2fa,
  authorizationEmployeeGuard,
  postEmployeeAttendace
)