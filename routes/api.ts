import { Application, Router } from "express";
import { postUpdateEmployeePresentEarnings } from "../controllers/manager";
import { deleteJoinRequestByEmail, getAllExpensesDetailsByYearJSON, getAllExpensesDetailsJSON, getAllHoursWorkedByYearJSON, getAverageSalaryAndBonusbByYearJSON } from "../controllers/api";
import { Guard2fa } from "./helpers/Guard2fa";
import { RoutesGuard } from "./helpers/RoutesGuard";

export const api_router = Router();


api_router.get("/api/manager/get-all-expenses-details", RoutesGuard, Guard2fa,getAllExpensesDetailsJSON as Application);

api_router.get("/api/manager/get-hours-worked", RoutesGuard, Guard2fa, getAllHoursWorkedByYearJSON as Application);

api_router.get("/api/manager/get-average-salary-and-bonuses", RoutesGuard, Guard2fa, getAverageSalaryAndBonusbByYearJSON as Application);

api_router.get("/api/manager/get-year-expenses-details", RoutesGuard, Guard2fa, getAllExpensesDetailsByYearJSON as Application);

api_router.delete("/api/manager/delete/join_request", RoutesGuard, Guard2fa, deleteJoinRequestByEmail as Application);

//TODO --> delete this file if not needed