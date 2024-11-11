import { NextFunction, Request, Response } from "express";
import { Logger } from "winston";
import { AppDataSource } from "../data-source";
import { User } from "../entity/User";
import OTPAuth from "otpauth";
import { encode } from "hi-base32";
import QRCode from "qrcode";
import { Employee } from "../entity/Employee";
import { Company } from "../entity/Company";
import { SalaryHistory } from "../entity/SalaryHistory";
import { JoinRequest } from "../entity/JoinRequest";
import { Between } from "typeorm";
import { userInSessionFieldsExist } from "./helpers/validator";
import Tokens from "csrf";
import { validationResult } from "express-validator";
import { sanitizeReturnProps } from "./helpers/sanitize";
import xss from "xss";

type EmployeeDaysChange = {
  days_sick_leave: 0 | 1;
  days_on_demand_leave: 0 | 1;
  days_vacation: 0 | 1;
  days_worked: 0 | 1;
};

export const getMainPage = (req: Request, res: Response) => {
  const logger: Logger = res.locals.logger;

  let csrf_token;
  if (req.session.not_authenticated_csrf_secret) {
    csrf_token = new Tokens().create(req.session.not_authenticated_csrf_secret);
  } else if (req.session.csrf_secret) {
    csrf_token = new Tokens().create(req.session.csrf_secret);
  } else {
    req.session.not_authenticated_csrf_secret = new Tokens().secretSync();
    csrf_token = new Tokens().create(req.session.not_authenticated_csrf_secret);
  }

  // TODO -> add csrf token since this page are not being rendered by the server
  try {
    logger.info(`Rendering main page`);
    res.render("common/main", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: req.session.user?.uid,
      nonce: res.locals.nonce,
      accountType: req.session.user?.account_type,
      csrfToken: csrf_token,
    });
  } catch (error) {
    logger.info(`Error rendering main page: ${error}`);
    res.status(500).send("Error rendering main page");
  }
};

export const getEmployeeMainPage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;
  const userRepo = AppDataSource.getRepository(User);
  const tokens = new Tokens();

  const csrf_token = tokens.create(req.session.csrf_secret!);

  const user_session = req.session.user!;

  if (!userInSessionFieldsExist(["uid", "account_type"], user_session)) {
    logger.error(`User session data not found`);
    return next(new Error("Bad request"));
  }

  const { uid, account_type } = user_session;

  // TODO -> should just show message that employee is not entitled to any company
  if (!user_session.company_id || !user_session.employee_id) {
    logger.info(`Employee is not entitled to any company`);

    let user;
    try {
      user = await userRepo.findOneBy({ id: uid });

      if (!user) {
        logger.error(`User not found`);
        res.status(404);
        return next(new Error("User not found"));
      }
    } catch (error) {
      logger.error(`Error getting user data: ${error}`);
      res.status(500);
      return next(error);
    }

    let is_jrequest_pending = false;
    try {
      is_jrequest_pending = await AppDataSource.getRepository(
        JoinRequest
      ).exists({
        where: { user: { id: uid }, status: "pending" },
      });
    } catch (error) {
      logger.error(`Error getting join request: ${error}`);
      res.status(500);
      return next(error);
    }
    try {
      return res.render("employee/main", {
        baseUrl: `${process.env.BASE_URL}`,
        loggedUser: user,
        nonce: res.locals.nonce,
        accountType: account_type,
        jrequestsPending: null,
        company: null,
        salaryHistory: null,
        earnings: null,
        isAttendanceMarked: false,
        isJrequestPending: is_jrequest_pending,
        csrfToken: csrf_token,
      });
    } catch (error) {
      logger.error(`Error getting user data: ${error}`);
      res.status(500);
      return next(error);
    }
  }

  let user;

  // const test = await AppDataSource.getRepository(SalaryHistory).find({where: {period: new Date("2024-10-01"), employee: {id: 1}}})
  try {
    logger.info(`Getting user data`);
    user = await userRepo.findOneBy({ id: uid });
  } catch (error) {
    logger.error(`Error getting user data: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }

  let company;
  try {
    logger.info(`Getting company data`);
    company = await AppDataSource.getRepository(Company).findOneBy({
      id: user_session.company_id!,
    });
  } catch (error) {
    logger.error(`Error getting company data: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }

  const present_month = new Date().getMonth() + 1;
  let employee_salary_history: SalaryHistory;
  try {
    logger.info(`Getting employee salary history`);
    const query = `
      SELECT days_sick_leave, days_on_demand_leave, days_vacation FROM salary_history where EXTRACT(MONTH FROM period::DATE) = $1 AND "employeeId" = $2;
    `;

    const [rows] = await AppDataSource.query(query, [
      present_month,
      user_session.employee_id!,
    ]);
    employee_salary_history = rows;
  } catch (error) {
    logger.error(`Error getting employee salary history: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }

  let earnings;
  try {
    const query = `
SELECT 
  TO_CHAR(months.month, 'FMMonth') AS month_name,  -- Nazwa miesiąca bez dodatkowych spacji
  COALESCE(SUM(
    sh.salary_per_hour * c.hours_per_day * (
      sh.days_worked + 
      sh.days_vacation * c.vacation_percent_factor + 
      sh.days_sick_leave * c.sick_leave_percent_factor + 
      sh.days_on_demand_leave * c.on_demand_percent_factor
    ) + sh.bonus
  ), 0) AS total_salary
FROM 
  generate_series('2024-01-01'::date, '2024-12-01'::date, '1 month') AS months(month)  -- Generowanie wszystkich miesięcy
LEFT JOIN 
  salary_history sh 
    ON EXTRACT(YEAR FROM sh.period) = $1
    AND EXTRACT(MONTH FROM sh.period) = EXTRACT(MONTH FROM months.month) 
    AND sh."employeeId" = $2
LEFT JOIN 
  employees e 
    ON sh."employeeId" = e.id 
LEFT JOIN 
  companies c 
    ON e."companyId" = c.id 
GROUP BY 
  months.month
ORDER BY 
  months.month;

    `;
    const rows = await AppDataSource.query(query, [
      new Date().getFullYear(),
      user_session.employee_id!,
    ]);

    earnings = rows;
  } catch (error) {
    logger.error(`Error getting employee salary history: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }

  let isAttendanceMarked = false;

  try {
    const result = await AppDataSource.getRepository(Employee).findOne({
      where: { id: user_session.employee_id! },
      select: ["last_marked_day"],
    });

    if (result) {
      const last_marked_day = result.last_marked_day;

      const today = `${new Date().getFullYear()}-${
        new Date().getMonth() + 1
      }-${new Date().getDate()}`;
      if (last_marked_day && last_marked_day.toString() === today) {
        isAttendanceMarked = true;
      }
    }
  } catch (error) {
    logger.error(`Error getting employee attendance: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }

  try {
    logger.info(`Rendering employee main page`);
    res.render(
      "employee/main",
      sanitizeReturnProps({
        baseUrl: `${process.env.BASE_URL}`,
        loggedUser: user,
        nonce: res.locals.nonce,
        accountType: user_session.account_type,
        jrequestsPending: null,
        company,
        salaryHistory: employee_salary_history,
        earnings,
        isAttendanceMarked,
        csrfToken: csrf_token,
      })
    );
  } catch (error) {
    logger.error(`Error rendering employee main page: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }
};

export const getEmployeeSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;
  logger.info(`Getting employee settings`);

  const tokens = new Tokens();

  const csrf_token = tokens.create(req.session.csrf_secret!);

  const user_repo = AppDataSource.getRepository(User);

  const user_session = req.session.user!;

  if (!userInSessionFieldsExist(["uid"], user_session)) {
    logger.error(`User session data not found`);
    res.status(400);
    return next(new Error("Bad request"));
  }

  const { uid } = user_session;

  let user;
  try {
    logger.info(`Getting user data`);
    user = await user_repo.findOneBy({ id: uid });
  } catch (error) {
    logger.error(`Error getting user data: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }

  if (!user) {
    logger.error(`User not found`);
    res.status(404);
    return next(new Error("Requested reseource not found"));
  }

  const is_2fa_enabled = user.two_fa_secret ? true : false;

  let { error } = req.query;

  if (error && typeof error !== "string") {
    logger.error(`Error query parameter in invalid format`);
    res.status(400);
    return next(new Error("Bad request"));
  }

  error = xss(error as string);

  if (error) {
    logger.warn(`Error happened before rendering settings page: ${error}`);
    try {
      return res.status(400).render("manager/settings", {
        baseUrl: `${process.env.BASE_URL}`,
        loggedUser: req.session.user,
        user: user,
        is2faEnabled: is_2fa_enabled,
        nonce: res.locals.nonce,
        accountType: user_session.account_type,
        error: error,
        jrequestsPending: null,
        company: null,
        csrfToken: csrf_token,
      });
    } catch (error) {
      logger.error(`Error rendering employee settings page: ${error}`);
      res.status(500);
      return next(new Error("Internal server error"));
    }
  }

  try {
    logger.info(`Rendering employee settings page`);
    res.render("employee/settings", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: req.session.user,
      user: sanitizeReturnProps(user),
      is2faEnabled: is_2fa_enabled,
      nonce: res.locals.nonce,
      accountType: user_session.account_type,
      error: null,
      csrfToken: csrf_token,
    });
  } catch (error) {
    logger.error(`Error rendering employee settings page: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }
};

export const getEmployeeJoinRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  logger.info(`Getting employee join request`);

  const tokens = new Tokens();

  const csrf_token = tokens.create(req.session.csrf_secret!);

  const user_session = req.session.user!;

  if (!userInSessionFieldsExist(["uid", "account_type"], user_session)) {
    logger.error(`User session data not found`);
    return res.status(400).send("User session data not found");
  }

  const { uid, account_type } = user_session;

  if (!user_session.company_id || !user_session.employee_id) {
    let companies: Array<string> = [];
    try {
      logger.info(`Getting companies data`);
      const rows = await AppDataSource.getRepository(Company).find({
        select: ["name"],
      });

      rows.forEach((row) => {
        companies.push(row.name);
      });
    } catch (error) {
      logger.error(`Error rendering join request page: ${error}`);
      res.status(500);
      return next(new Error("Internal server error"));
    }

    let is_jrequest_pending = false;
    try {
      is_jrequest_pending = await AppDataSource.getRepository(
        JoinRequest
      ).exists({
        where: { user: { id: uid }, status: "pending" },
      });
    } catch (error) {
      logger.error(`Error getting join request: ${error}`);
      res.status(500);
      return next(new Error("Internal server error"));
    }

    try {
      companies = sanitizeReturnProps(companies);
      return res.render("employee/join-request", {
        baseUrl: `${process.env.BASE_URL}`,
        loggedUser: uid,
        nonce: res.locals.nonce,
        accountType: account_type,
        jrequestsPending: null,
        isUserEntitled: false,
        companiesNames: companies,
        isJrequestPending: is_jrequest_pending,
        csrfToken: csrf_token,
      });
    } catch (error) {
      logger.error(`Error rendering join request page: ${error}`);
      res.status(500);
      return next(new Error("Internal server error"));
    }
  }

  try {
    return res.render("employee/join-request", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: uid,
      nonce: res.locals.nonce,
      accountType: account_type,
      jrequestsPending: null,
      isUserEntitled: true,
      companiesNames: [],
      isJrequestPending: false,
      csrfToken: csrf_token,
    });
  } catch (error) {
    logger.error(`Error rendering join request page: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }
};

export const postEmployeeJoinRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;
  logger.info(`Sending employee join request`);

  const user_repo = AppDataSource.getRepository(User);
  const jr_repo = AppDataSource.getRepository(JoinRequest);

  const user_session = req.session.user!;

  if (
    !userInSessionFieldsExist(
      ["uid",],
      user_session
    )
  ) {
    logger.error(`User session data not found`);
    res.status(400);
    return next(new Error("Bad request"));
  }

  const { uid} = user_session;

  if (user_session.company_id || user_session.employee_id) {
    logger.error(`User is already entitled to a company`);
    res.status(400);
    return next(new Error("Bad request"));
  }

  let { company_name } = req.body;

  company_name = xss(company_name);

  if (!company_name) {
    logger.error(`Company data not found`);
    res.status(400);
    return next(new Error("Bad request"));
  }

  try {
    const does_employee_exist_with_uid = await AppDataSource.getRepository(Employee).exists({
      where: {user: {id: uid}}
    })

    if (does_employee_exist_with_uid) {
      logger.error(`Employee already exists with uid`);
      res.status(400);
      return next(new Error("Bad request"));
    }

    logger.info(`Creating join request`);
    const company = await AppDataSource.getRepository(Company).findOneBy({
      name: company_name,
    });

    if (!company || Object.keys(company).length === 0) {
      logger.error(`Company not found`);
      res.status(404);
      return next(new Error("Bad request"));
    }

    const user = await user_repo.findOneBy({ id: uid });

    if (!user) {
      logger.error(`User not found`);
      res.status(404);
      return next(new Error("Bad request"));
    }

    // const does_jr_for_user_exist = await AppDataSource.getRepository(
    //   JoinRequest
    // ).existsBy({
    //   user: { id: uid },
    // });

    const does_jr_for_user_exist = await jr_repo.exists({
      where: {user: { id: uid }} ,
    })

    if (does_jr_for_user_exist) {
      logger.error(`Join request for user already exists`);
      res.status(400);
      return next(new Error("Bad request"));
    }

    const join_request = new JoinRequest();
    join_request.company = company;
    join_request.user = user;

    await AppDataSource.getRepository(JoinRequest).save(join_request);

    return res.redirect("/employee/dashboard");
  } catch (error) {
    logger.error(`Error creating join request: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }
};

export const getEmployeeEarnings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;
  logger.info(`Getting employee earnings`);

  const tokens = new Tokens();

  const csrf_token = tokens.create(req.session.csrf_secret!);

  const user_session = req.session.user!;

  if (!userInSessionFieldsExist(["uid", "account_type"], user_session)) {
    logger.error(`User session data not found`);
    res.status(400);
    return next(new Error("Bad request"));
  }

  const { uid, account_type } = user_session;

  try {
    return res.render("employee/earnings", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: uid,
      nonce: res.locals.nonce,
      accountType: account_type,
      jrequestsPending: null,
      csrfToken: csrf_token,
    });
  } catch (error) {
    logger.error(`Error rendering employee earnings page: ${error}`);
    res.status(500);
    return next(error);
  }
};

export const getEmployeeAttendance = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  logger.info(`Getting employee attendance`);

  const tokens = new Tokens();

  const csrf_token = tokens.create(req.session.csrf_secret!);

  const user_session = req.session.user!;

  if (!userInSessionFieldsExist(["uid", "account_type"], user_session)) {
    logger.error(`User session data not found`);
    res.status(400);
    return next(new Error("Bad request"));
  }

  const { uid, account_type } = user_session;

  const employee_id = user_session.employee_id;

  if (!employee_id) {
    logger.error(`Employee id not found`);
    res.status(400);
    return res.render("employee/attendance", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: req.session.user,
      nonce: res.locals.nonce,
      accountType: account_type,
      jrequestsPending: null,
      attendanceData: null,
      errorInfo: null,
      csrfToken: csrf_token,
    });
  }

  let does_present_month_sh_exist;
  try {
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );
    const endOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0
    );

    does_present_month_sh_exist = await AppDataSource.getRepository(
      SalaryHistory
    ).existsBy({
      employee: { id: employee_id },
      period: Between(startOfMonth, endOfMonth),
    });
  } catch (error) {
    logger.error(
      `Error checking if present month salary history exists: ${error}`
    );
    res.status(500);
    return next(new Error("Internal server error"));
  }

  if (!does_present_month_sh_exist) {
    try {
      const new_salary_history = new SalaryHistory();

      const employee = await AppDataSource.getRepository(Employee).findOneBy({
        id: employee_id,
      });

      if (!employee) {
        logger.error(`Employee not found`);
        res.status(404);
        return next(new Error("Requested resource not found"));
      }

      new_salary_history.employee = employee;
      new_salary_history.period = new Date();
      new_salary_history.bonus = 0;
      new_salary_history.salary_per_hour = employee.salary_per_hour;

      await AppDataSource.getRepository(SalaryHistory).save(new_salary_history);
    } catch (error) {
      logger.error(`Error creating new salary history: ${error}`);
      res.status(500);
      return next(new Error("Internal server error"));
    }
  }

  const query = `
SELECT 
  sh.days_sick_leave, 
  sh.days_on_demand_leave, 
  sh.days_worked, 
  sh.days_vacation, 
  SUM(
    sh.days_sick_leave + sh.days_on_demand_leave + sh.days_worked + sh.days_vacation
  ) AS days_total, 
  c.max_days_per_month, 
  c.sick_leave_percent_factor * 100 as sick_leave_percent_factor, 
  c.vacation_percent_factor * 100 as vacation_percent_factor, 
  c.on_demand_percent_factor * 100 as on_demand_percent_factor 
FROM 
  salary_history sh 
  JOIN employees e ON sh."employeeId" = e.id 
  JOIN companies c ON e."companyId" = c.id 
WHERE 
  date_trunc('month', sh.period) = date_trunc('month', current_date) 
  AND sh."employeeId" = $1 
GROUP BY 
  c.max_days_per_month, 
  c.sick_leave_percent_factor, 
  c.vacation_percent_factor, 
  c.on_demand_percent_factor, 
  sh.days_sick_leave, 
  sh.days_on_demand_leave, 
  sh.days_worked, 
  sh.days_vacation;
  `;

  let attendance_data;
  try {
    [attendance_data] = await AppDataSource.query(query, [employee_id]);

    if (!attendance_data) {
      logger.error(`Attendance data not found`);
      res.status(404);
      return next(new Error("Requested resource not found"));
    }

    if (attendance_data.days_total >= attendance_data.max_days_per_month) {
      logger.info(`Employee has already marked maximum days for the month`);
      attendance_data = sanitizeReturnProps(attendance_data);
      return res.render("employee/attendance", {
        baseUrl: `${process.env.BASE_URL}`,
        loggedUser: user_session,
        nonce: res.locals.nonce,
        accountType: user_session.account_type,
        jrequestsPending: null,
        attendanceData: attendance_data,
        errorInfo: "You've marked maximum amount of days for this month",
        csrfToken: csrf_token,
      });
    }
  } catch (error) {
    logger.error(`Error getting employee attendance: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }

  const { error } = req.query;

  if (error) {
    try {
      switch (error) {
        case "marked_attendance":
          logger.info(`Employee has already marked attendance for today`);
          return res.render("employee/attendance", {
            baseUrl: `${process.env.BASE_URL}`,
            loggedUser: user_session,
            nonce: res.locals.nonce,
            accountType: user_session.account_type,
            jrequestsPending: null,
            attendanceData: null,
            errorInfo: "You've already marked attendance for today",
            csrfToken: csrf_token,
          });
        case "days_exceeded":
          logger.info(`Employee has already marked maximum days for the month`);
          return res.render("employee/attendance", {
            baseUrl: `${process.env.BASE_URL}`,
            loggedUser: user_session.uid,
            nonce: res.locals.nonce,
            accountType: user_session.account_type,
            jrequestsPending: null,
            attendanceData: null,
            errorInfo: "You've marked maximum amount of days for this month",
            csrfToken: csrf_token,
          });
      }
    } catch (error) {
      logger.error(
        `Error rendering employee attendance page with known error: ${error}`
      );
      res.status(500);
      return next(new Error("Internal server error"));
    }
  }

  try {
    const has_employee_marked_attendance_today =
      await AppDataSource.getRepository(Employee).existsBy({
        id: employee_id,
        last_marked_day: new Date(),
      });

    if (has_employee_marked_attendance_today) {
      attendance_data = sanitizeReturnProps(attendance_data);
      logger.info(`Employee has already marked attendance for today`);
      return res.render("employee/attendance", {
        baseUrl: `${process.env.BASE_URL}`,
        loggedUser: req.session.user,
        nonce: res.locals.nonce,
        accountType: user_session.account_type,
        jrequestsPending: null,
        attendanceData: attendance_data,
        errorInfo: "You've already marked attendance for today",
        csrfToken: csrf_token,
      });
    }
  } catch (error) {
    logger.error(
      `Error checking if employee has already marked attendance: ${error}`
    );
    res.status(500);
    return next(new Error("Internal server error"));
  }

  try {
    attendance_data = sanitizeReturnProps(attendance_data);
    return res.render("employee/attendance", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: req.session.user,
      nonce: res.locals.nonce,
      accountType: user_session.account_type,
      jrequestsPending: null,
      attendanceData: attendance_data,
      errorInfo: null,
      csrfToken: csrf_token,
    });
  } catch (error) {
    logger.error(`Error rendering employee attendance page: ${error}`);
    res.status(500);
    return next(error);
  }
};

// TODO -> also check if user has already marked his attendance for today
// TODO -> also check if user has marked maximum days for the month
export const postEmployeeAttendace = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  logger.info(`Marking employee attendance`);

  const queryRunner = AppDataSource.createQueryRunner();

  const user_session = req.session.user!;

  if (!userInSessionFieldsExist(["uid", "employee_id"], user_session)) {
    logger.error(`User session data not found`);
    res.status(400);
    return next(new Error("Bad request"));
  }

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    logger.error(`Validation errors: ${errors.array()}`);
    res.status(400);
    return next(new Error(`Bad request: ${errors.array()[0].msg}`));
  }

  const { uid, employee_id } = user_session;

  const { attendance_type } = req.body;

  const days_change: EmployeeDaysChange = {
    days_sick_leave: attendance_type === "sick" ? 1 : 0,
    days_on_demand_leave: attendance_type === "ondemand" ? 1 : 0,
    days_vacation: attendance_type === "vacation" ? 1 : 0,
    days_worked: attendance_type === "normal" ? 1 : 0,
  };

  let does_present_month_sh_exist;
  try {
    const startOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    );
    const endOfMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0
    );

    does_present_month_sh_exist = await AppDataSource.getRepository(
      SalaryHistory
    ).existsBy({
      employee: { id: employee_id! },
      period: Between(startOfMonth, endOfMonth),
    });
  } catch (error) {
    logger.error(
      `Error checking if present month salary history exists: ${error}`
    );
    res.status(500);
    return next(new Error("Internal server error"));
  }

  if (!does_present_month_sh_exist) {
    try {
      const new_salary_history = new SalaryHistory();

      const employee = await AppDataSource.getRepository(Employee).findOneBy({
        id: employee_id!,
      });

      if (!employee) {
        logger.error(`Employee not found`);
        res.status(404);
        return next(new Error("Requested resources not found"));
      }

      new_salary_history.employee = employee;
      new_salary_history.period = new Date();
      new_salary_history.bonus = 0;
      new_salary_history.salary_per_hour = employee.salary_per_hour;

      await AppDataSource.getRepository(SalaryHistory).save(new_salary_history);
    } catch (error) {
      logger.error(`Error creating new salary history: ${error}`);
      res.status(500);
      return next(new Error("Internal server error"));
    }
  }

  try {
    const has_employee_marked_attendance_today =
      await AppDataSource.getRepository(Employee).existsBy({
        id: employee_id!,
        last_marked_day: new Date(),
      });

    if (has_employee_marked_attendance_today) {
      logger.info(`Employee has already marked attendance for today`);
      return res.redirect("/employee/attendance?error=marked_attendance");
    }
  } catch (error) {
    logger.error(
      `Error checking if employee has already marked attendance: ${error}`
    );
    res.status(500);
    return next(new Error("Internal server error"));
  }

  try {
    const query = `
    SELECT 
  SUM(
    sh.days_sick_leave + sh.days_on_demand_leave + sh.days_worked + sh.days_vacation
  ) AS days_total, 
  c.max_days_per_month 
FROM 
  salary_history sh 
  JOIN employees e ON sh."employeeId" = e.id 
  JOIN companies c ON e."companyId" = c.id 
WHERE 
  date_trunc('month', sh.period) = date_trunc('month', current_date) 
  AND sh."employeeId" = $1 
GROUP BY 
  c.max_days_per_month, 
  sh.days_sick_leave, 
  sh.days_on_demand_leave, 
  sh.days_worked, 
  sh.days_vacation;

    `;

    const [row] = await AppDataSource.query(query, [employee_id]);

    row.days_total = Number(row.days_total);

    if (row.days_total >= row.max_days_per_month) {
      logger.info(`Employee has already marked maximum days for the month`);
      return res.redirect("/employee/attendance?error=days_exceeded");
    }
  } catch (error) {
    logger.error(
      `Error checking if employee has already marked maximum days for the month: ${error}`
    );
    res.status(500);
    return next(new Error("Internal server error"));
  }

  // 1) Query to update days in sh
  // 2) Query to update last_marked_day in employees

  const first_query = `
    UPDATE salary_history SET 
  days_worked = salary_history.days_worked + 1 * $1, 
  days_sick_leave = salary_history.days_sick_leave + 1 * $2, 
  days_vacation = salary_history.days_vacation + 1 * $3, 
  days_on_demand_leave = salary_history.days_on_demand_leave + 1 * $4
FROM 
  employees e 
  JOIN companies c ON e."companyId" = c.id 
WHERE 
  salary_history."employeeId" = $5
  AND date_trunc('month', salary_history.period) = date_trunc('month', current_date) 
  AND e.id = salary_history."employeeId" 
  AND e."companyId" = c.id;
  `;

  const base_retirement_factor = `c.retirement_rate * e.salary_per_hour`;
  const base_disability_factor = `c.disability_rate * e.salary_per_hour`;
  const base_healthcare_factor = `c.healthcare_rate * e.salary_per_hour`;
  const base_income_tax_factor = `c.income_tax_rate * e.salary_per_hour`;

  const retiremet_contributions_assignment = `
    retirement_contributions = ${base_retirement_factor} * 
    (sh.days_worked * c.hours_per_day +
    sh.days_sick_leave * c.sick_leave_percent_factor +
    sh.days_vacation * c.vacation_percent_factor +
    sh.days_on_demand_leave * c.on_demand_percent_factor),
  `;

  const disability_contributions_assignment = `
    disability_contributions = ${base_disability_factor} * 
    (sh.days_worked * c.hours_per_day +
    sh.days_sick_leave * c.sick_leave_percent_factor +
    sh.days_vacation * c.vacation_percent_factor +
    sh.days_on_demand_leave * c.on_demand_percent_factor),
  `;

  const healthcare_contributions_assignment = `
    healthcare_contributions = ${base_healthcare_factor} * 
    (sh.days_worked * c.hours_per_day +
    sh.days_sick_leave * c.sick_leave_percent_factor +
    sh.days_vacation * c.vacation_percent_factor +
    sh.days_on_demand_leave * c.on_demand_percent_factor),
  `;

  const income_tax_assignment = `
    income_tax = ${base_income_tax_factor} * 
    (sh.days_worked * c.hours_per_day +
    sh.days_sick_leave * c.sick_leave_percent_factor +
    sh.days_vacation * c.vacation_percent_factor +
    sh.days_on_demand_leave * c.on_demand_percent_factor)
  `;

  const second_query = `
    UPDATE salary_history sh
    SET
    ${retiremet_contributions_assignment}
    ${disability_contributions_assignment}
    ${healthcare_contributions_assignment}
    ${income_tax_assignment}
    FROM employees e
    JOIN companies c ON c.id = e."companyId"
    WHERE sh."employeeId" = e.id
    AND DATE_TRUNC('month', sh.period) = DATE_TRUNC('month', CURRENT_DATE)
    AND sh."employeeId" = $1
  `;

  try {
    await queryRunner.startTransaction();

    await queryRunner.query(first_query, [
      days_change.days_worked,
      days_change.days_sick_leave,
      days_change.days_vacation,
      days_change.days_on_demand_leave,
      employee_id,
    ]);

    await queryRunner.query(second_query, [employee_id]);

    await queryRunner.commitTransaction();
  } catch (error) {
    await queryRunner.rollbackTransaction();
    logger.error(`Error updating employee attendance: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  } finally {
    await queryRunner.release();
  }

  try {
    await AppDataSource.getRepository(Employee).update(
      {
        id: employee_id!,
      },
      {
        last_marked_day: new Date(),
      }
    );

    return res.redirect("/employee/attendance");
  } catch (error) {
    logger.error(`Error updating employee attendance: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }
};
