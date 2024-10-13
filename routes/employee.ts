import { Application, Router } from "express";
import {
  getEmployeeMainPage,
  getEmployeeSettings,
  getMainPage,
  postDisable2fa,
  postEnable2fa,
} from "../controllers/employee";
import { Guard2fa } from "./helpers/Guard2fa";

export const employee_router = Router();

employee_router.get("/", getMainPage);

employee_router.get("/employee/dashboard", Guard2fa ,getEmployeeMainPage);

employee_router.get("/employee/settings", Guard2fa, getEmployeeSettings);

employee_router.post("/enable-2fa", Guard2fa, postEnable2fa as Application);

employee_router.post("/disable-2fa", Guard2fa, postDisable2fa as Application);
