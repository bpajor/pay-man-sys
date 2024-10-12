import { Application, Router } from "express";
import {
  getEmployeeMainPage,
  getEmployeeSettings,
  getMainPage,
  postDisable2fa,
  postEnable2fa,
} from "../controllers/employee";

export const employee_router = Router();

employee_router.get("/", getMainPage);

employee_router.get("/employee/dashboard", getEmployeeMainPage);

employee_router.get("/employee/settings", getEmployeeSettings);

employee_router.post("/enable-2fa", postEnable2fa as Application);

employee_router.post("/disable-2fa", postDisable2fa as Application);
