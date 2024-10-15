import { Application, Router } from "express";
import { getManagerDashboard, getManagerEmployeesDetails, getManagerEmployeesDetailsJSON } from "../controllers/manager";
import { RoutesGuard } from "./helpers/RoutesGuard";
import { Guard2fa } from "./helpers/Guard2fa";

export const manager_router = Router();

manager_router.get("/manager/dashboard", RoutesGuard, Guard2fa, getManagerDashboard);

manager_router.get("/manager/employees-details", RoutesGuard, Guard2fa, getManagerEmployeesDetails);

manager_router.get("/manager/employees-details/json", RoutesGuard, Guard2fa, getManagerEmployeesDetailsJSON as Application);