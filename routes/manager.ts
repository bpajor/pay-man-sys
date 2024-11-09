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
import {
  authenticationRoutesGuard,
  authorizationManagerGuard,
} from "./helpers/RoutesGuard";
import { Guard2fa } from "./helpers/Guard2fa";
import { csrfBodyValidator } from "./helpers/CsrfProtection";
import { validators } from "./helpers/Validators";

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
  validators.salary,
  validators.bonus,
  validators.type,
  authenticationRoutesGuard,
  authorizationManagerGuard,
  Guard2fa,
  csrfBodyValidator,
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
  validators.name,
  validators.daily_hours,
  validators.sick_leave_percent_factor,
  validators.vacation_percent_factor,
  validators.on_demand_percent_factor,
  validators.retirement_rate,
  validators.disability_rate,
  validators.healthcare_rate,
  validators.income_tax_rate,
  authenticationRoutesGuard,
  authorizationManagerGuard,
  Guard2fa,
  csrfBodyValidator,
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
  validators.name,
  validators.daily_hours,
  validators.sick_leave_percent_factor,
  validators.vacation_percent_factor,
  validators.on_demand_percent_factor,
  validators.retirement_rate,
  validators.disability_rate,
  validators.healthcare_rate,
  validators.income_tax_rate,
  validators.max_days_per_month,
  authenticationRoutesGuard,
  authorizationManagerGuard,
  Guard2fa,
  csrfBodyValidator,
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
  validators.name,
  validators.email,
  validators.phone,
  validators.address,
  validators.date_of_birth,
  validators.salary,
  validators.hi_number,
  validators.hi_provider,
  validators.exp_date,
  validators.notes,
  authenticationRoutesGuard,
  authorizationManagerGuard,
  Guard2fa,
  csrfBodyValidator,
  postManagerJoinRequest
);
