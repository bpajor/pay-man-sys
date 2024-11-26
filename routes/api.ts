import { Application, query, Router } from "express";
import {
  deleteEmployeeEmployeeAPI,
  deleteJoinRequestByEmailAPI,
  getAllExpensesDetailsByYearAPI,
  getAllExpensesDetailsAPI,
  getAllHoursWorkedByYearAPI,
  getAverageSalaryAndBonusbByYearAPI,
  getEmployeeEarningsDetailsByYearAPI,
  getManagerEmployeesDetailsAPI,
  getManagerSingleEmpDetailsAPI,
  postDisable2faAPI,
  postEnable2faAPI,
} from "../controllers/api";
import { Guard2fa } from "./helpers/Guard2fa";
import {
  authenticationAPIRoutesGuard,
  authorizationManagerAPIGuard,
  authorizationEmployeeAPIGuard,
} from "./helpers/RoutesGuard";
import { csrfAPIValidator } from "./helpers/CsrfProtection";
import { validators } from "./helpers/Validators";
export const api_router = Router();

api_router.get(
  "/api/manager/get-all-expenses-details",
  validators.year,
  validators.month,
  authenticationAPIRoutesGuard as Application,
  authorizationManagerAPIGuard as Application,
  Guard2fa,
  getAllExpensesDetailsAPI as Application
);

api_router.get(
  "/api/manager/get-hours-worked",
  validators.year,
  authenticationAPIRoutesGuard as Application,
  authorizationManagerAPIGuard as Application,
  Guard2fa,
  getAllHoursWorkedByYearAPI as Application
);

api_router.get(
  "/api/manager/get-average-salary-and-bonuses",
  authenticationAPIRoutesGuard as Application,
  authorizationManagerAPIGuard as Application,
  Guard2fa,
  getAverageSalaryAndBonusbByYearAPI as Application
);

api_router.get(
  "/api/manager/get-year-expenses-details",
  validators.year,
  authenticationAPIRoutesGuard as Application,
  authorizationManagerAPIGuard as Application,
  Guard2fa,
  getAllExpensesDetailsByYearAPI as Application
);

api_router.delete(
  "/api/manager/delete/join_request",
  authenticationAPIRoutesGuard as Application,
  authorizationManagerAPIGuard as Application,
  Guard2fa,
  csrfAPIValidator as Application,
  deleteJoinRequestByEmailAPI as Application
);

api_router.get(
  "/api/employee/earnings",
  validators.year,
  authenticationAPIRoutesGuard as Application,
  authorizationEmployeeAPIGuard as Application,
  Guard2fa,
  getEmployeeEarningsDetailsByYearAPI as Application
);

api_router.delete(
  "/api/employee/delete",
  authenticationAPIRoutesGuard as Application,
  authorizationEmployeeAPIGuard as Application,
  Guard2fa,
  csrfAPIValidator as Application,
  deleteEmployeeEmployeeAPI as Application
);

api_router.post(
  "/api/auth/enable-2fa",
  authenticationAPIRoutesGuard as Application,
  Guard2fa,
  csrfAPIValidator as Application,
  postEnable2faAPI as Application
);

api_router.post(
  "/api/auth/disable-2fa",
  authenticationAPIRoutesGuard as Application,
  Guard2fa,
  csrfAPIValidator as Application,
  postDisable2faAPI as Application
);

api_router.get(
  "/api/manager/employees-details",
  validators.month,
  validators.year,
  authenticationAPIRoutesGuard as Application,
  authorizationManagerAPIGuard as Application,
  Guard2fa,
  getManagerEmployeesDetailsAPI as Application
);

api_router.get(
  "/api/manager/single-emp-details",
  validators.month,
  validators.year,
  authenticationAPIRoutesGuard as Application,
  authorizationManagerAPIGuard as Application,
  Guard2fa,
  getManagerSingleEmpDetailsAPI as Application
);
