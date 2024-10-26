import { Application, Router } from "express";
import {
  getManagerCreateCompany,
  getManagerDashboard,
  getManagerEmployeesDetails,
  getManagerJoinRequest,
  getManagerJoinRequests,
  getManagerRaports,
  getManagerSettings,
  getManagerSingleEmployeeDetails,
  postManagerCreateCompany,
  postManagerJoinRequest,
  postUpdateCompanySettings,
  postUpdateEmployeePresentEarnings,
} from "../controllers/manager";
import { authenticationRoutesGuard, authorizationManagerGuard } from "./helpers/RoutesGuard";
import { Guard2fa } from "./helpers/Guard2fa";

export const manager_router = Router();

manager_router.get(
  "/manager/dashboard",
  authenticationRoutesGuard,
  Guard2fa,
  authorizationManagerGuard,
  getManagerDashboard
);

manager_router.get(
  "/manager/employees-details",
  authenticationRoutesGuard,
  Guard2fa,
  authorizationManagerGuard,
  getManagerEmployeesDetails
);

manager_router.get(
  "/manager/single-emp-details/:employee_id",
  authenticationRoutesGuard,
  Guard2fa,
  authorizationManagerGuard,
  getManagerSingleEmployeeDetails
);

manager_router.post(
  "/manager/update-employee-payment-details/:employee_id",
  authenticationRoutesGuard,
  Guard2fa,
  authorizationManagerGuard,
  postUpdateEmployeePresentEarnings as Application
);

manager_router.get(
  "/manager/raports",
  authenticationRoutesGuard,
  Guard2fa,
  authorizationManagerGuard,
  getManagerRaports
);

manager_router.post(
  "/manager/settings/update-company-settings",
  authenticationRoutesGuard,
  Guard2fa,
  authorizationManagerGuard,
  postUpdateCompanySettings
);

manager_router.get(
  "/manager/settings",
  authenticationRoutesGuard,
  Guard2fa,
  authorizationManagerGuard,
  getManagerSettings
);

manager_router.get(
  "/manager/company/create",
  authenticationRoutesGuard,
  Guard2fa,
  authorizationManagerGuard,
  getManagerCreateCompany
);

manager_router.post(
  "/manager/company/create",
  authenticationRoutesGuard,
  Guard2fa,
  authorizationManagerGuard,
  postManagerCreateCompany
);

manager_router.get(
  "/manager/join-requests",
  authenticationRoutesGuard,
  Guard2fa,
  authorizationManagerGuard,
  getManagerJoinRequests
);

manager_router.get(
  "/manager/join-request/:id",
  authenticationRoutesGuard,
  Guard2fa,
  authorizationManagerGuard,
  getManagerJoinRequest
);

manager_router.post(
  "/manager/join-request/:id",
  authenticationRoutesGuard,
  Guard2fa,
  authorizationManagerGuard,
  postManagerJoinRequest
)