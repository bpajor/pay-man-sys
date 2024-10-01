import { Router } from "express";
import { getEmployeeMainPage, getMainPage } from "../controllers/employee";
import { generateScriptNonce } from "../middlewares/generateScriptNonce";

export const employee_router = Router();

employee_router.get("/", getMainPage);

employee_router.get("/employee/dashboard" ,getEmployeeMainPage);