import { Router } from "express";
import { getMainPage } from "../controllers/employee";

export const employee_router = Router();

employee_router.get("/", getMainPage);