import { Application, Router } from "express";
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
export const api_router = Router();

api_router.get(
  "/api/manager/get-all-expenses-details",
  authenticationAPIRoutesGuard as Application,
  Guard2fa,
  authorizationManagerAPIGuard as Application,
  getAllExpensesDetailsAPI as Application
);

api_router.get(
  "/api/manager/get-hours-worked",
  authenticationAPIRoutesGuard as Application,
  Guard2fa,
  authorizationManagerAPIGuard as Application,
  getAllHoursWorkedByYearAPI as Application
);

api_router.get(
  "/api/manager/get-average-salary-and-bonuses",
  authenticationAPIRoutesGuard as Application,
  Guard2fa,
    authorizationManagerAPIGuard as Application,
  getAverageSalaryAndBonusbByYearAPI as Application
);

api_router.get(
  "/api/manager/get-year-expenses-details",
  authenticationAPIRoutesGuard as Application,
  Guard2fa,
    authorizationManagerAPIGuard as Application,
  getAllExpensesDetailsByYearAPI as Application
);

api_router.delete(
  "/api/manager/delete/join_request",
  authenticationAPIRoutesGuard as Application,
  Guard2fa,
    authorizationManagerAPIGuard as Application,
  deleteJoinRequestByEmailAPI as Application
);

api_router.get(
  "/api/employee/earnings",
  authenticationAPIRoutesGuard as Application,
  Guard2fa,
  authorizationEmployeeAPIGuard as Application,
  getEmployeeEarningsDetailsByYearAPI as Application
);

api_router.delete(
  "/api/employee/delete",
  authenticationAPIRoutesGuard as Application,
  Guard2fa,
    authorizationEmployeeAPIGuard as Application,
  deleteEmployeeEmployeeAPI as Application
);

api_router.post(
  "/api/auth/enable-2fa",
  authenticationAPIRoutesGuard as Application,
  Guard2fa,
  postEnable2faAPI as Application
);

api_router.post(
  "/api/auth/disable-2fa",
  authenticationAPIRoutesGuard as Application,
  Guard2fa,
  postDisable2faAPI as Application
);

api_router.get(
  "/api/manager/employees-details",
  authenticationAPIRoutesGuard as Application,
  Guard2fa,
  authorizationManagerAPIGuard as Application,
  getManagerEmployeesDetailsAPI as Application
);

api_router.get(
  "/api/manager/single-emp-details",
  authenticationAPIRoutesGuard as Application,
  Guard2fa,
  authorizationManagerAPIGuard as Application,
  getManagerSingleEmpDetailsAPI as Application
);
