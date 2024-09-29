"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employee_router = void 0;
const express_1 = require("express");
const employee_1 = require("../controllers/employee");
exports.employee_router = (0, express_1.Router)();
exports.employee_router.get("/", employee_1.getMainPage);
