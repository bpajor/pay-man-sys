import { Application, Router } from "express";
import {
  getManagerCreateCompany,
  getManagerDashboard,
  getManagerEmployeesDetails,
  getManagerEmployeesDetailsJSON,
  getManagerJoinRequest,
  getManagerJoinRequests,
  getManagerRaports,
  getManagerSettings,
  getManagerSingleEmpDetailsJSON,
  getManagerSingleEmployeeDetails,
  postManagerCreateCompany,
  postManagerJoinRequest,
  postUpdateCompanySettings,
  postUpdateEmployeePresentEarnings,
} from "../controllers/manager";
import { RoutesGuard } from "./helpers/RoutesGuard";
import { Guard2fa } from "./helpers/Guard2fa";

export const manager_router = Router();

manager_router.get(
  "/manager/dashboard",
  RoutesGuard,
  Guard2fa,
  getManagerDashboard
);

manager_router.get(
  "/manager/employees-details",
  RoutesGuard,
  Guard2fa,
  getManagerEmployeesDetails
);

manager_router.get(
  "/manager/employees-details/json",
  RoutesGuard,
  Guard2fa,
  getManagerEmployeesDetailsJSON as Application
);

manager_router.get(
  "/manager/single-emp-details/:employee_id",
  RoutesGuard,
  Guard2fa,
  getManagerSingleEmployeeDetails
);

manager_router.get(
  "/manager/single-emp-details-json",
  RoutesGuard,
  Guard2fa,
  getManagerSingleEmpDetailsJSON as Application
);

manager_router.post(
  "/manager/update-employee-payment-details/:employee_id",
  RoutesGuard,
  Guard2fa,
  postUpdateEmployeePresentEarnings as Application
);

manager_router.get(
  "/manager/raports",
  RoutesGuard,
  Guard2fa,
  getManagerRaports
);

manager_router.post(
  "/manager/settings/update-company-settings",
  postUpdateCompanySettings
);

manager_router.get(
  "/manager/settings",
  RoutesGuard,
  Guard2fa,
  getManagerSettings
);

manager_router.get(
  "/manager/company/create",
  RoutesGuard,
  Guard2fa,
  getManagerCreateCompany
);

manager_router.post(
  "/manager/company/create",
  RoutesGuard,
  Guard2fa,
  postManagerCreateCompany
);

manager_router.get(
  "/manager/join-requests",
  RoutesGuard,
  Guard2fa,
  getManagerJoinRequests
);

manager_router.get(
  "/manager/join-request/:id",
  RoutesGuard,
  Guard2fa,
  getManagerJoinRequest
);

manager_router.post(
  "/manager/join-request/:id",
  RoutesGuard,
  Guard2fa,
  postManagerJoinRequest
)