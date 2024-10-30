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
  authorizationManagerGuard,
  Guard2fa,
  getManagerDashboard
);

manager_router.get(
  "/manager/employees-details",
  authenticationRoutesGuard,
  authorizationManagerGuard,
  Guard2fa,
  getManagerEmployeesDetails
);

manager_router.get(
  "/manager/single-emp-details/:employee_id",
  authenticationRoutesGuard,
  authorizationManagerGuard,
  Guard2fa,
  getManagerSingleEmployeeDetails
);

manager_router.post(
  "/manager/update-employee-payment-details/:employee_id",
  authenticationRoutesGuard,
  authorizationManagerGuard,
  Guard2fa,
  postUpdateEmployeePresentEarnings as Application
);

manager_router.get(
  "/manager/raports",
  authenticationRoutesGuard,
  authorizationManagerGuard,
  Guard2fa,
  getManagerRaports
);

manager_router.post(
  "/manager/settings/update-company-settings",
  authenticationRoutesGuard,
  authorizationManagerGuard,
  Guard2fa,
  postUpdateCompanySettings
);

manager_router.get(
  "/manager/settings",
  authenticationRoutesGuard,
  authorizationManagerGuard,
  Guard2fa,
  getManagerSettings
);

manager_router.get(
  "/manager/company/create",
  authenticationRoutesGuard,
  authorizationManagerGuard,
  Guard2fa,
  getManagerCreateCompany
);

manager_router.post(
  "/manager/company/create",
  authenticationRoutesGuard,
  authorizationManagerGuard,
  Guard2fa,
  postManagerCreateCompany
);

manager_router.get(
  "/manager/join-requests",
  authenticationRoutesGuard,
  authorizationManagerGuard,
  Guard2fa,
  getManagerJoinRequests
);

manager_router.get(
  "/manager/join-request/:id",
  authenticationRoutesGuard,
  authorizationManagerGuard,
  Guard2fa,
  getManagerJoinRequest
);

manager_router.post(
  "/manager/join-request/:id",
  authenticationRoutesGuard,
  authorizationManagerGuard,
  Guard2fa,
  postManagerJoinRequest
)