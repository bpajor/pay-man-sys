import { Router } from "express";
import { getMainPage } from "../controllers/employee.js";

export const employee_router = Router();

employee_router.get("/", getMainPage);