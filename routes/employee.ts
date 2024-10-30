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
  authenticationRoutesGuard,
  authorizationEmployeeGuard,
  Guard2fa,
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
  authenticationRoutesGuard,
  authorizationEmployeeGuard,
  Guard2fa,
  postEmployeeAttendace
)