import { NextFunction, Request, Response } from "express";
import { Logger } from "winston";
import { AppDataSource } from "../data-source";
import { SalaryHistory } from "../entity/SalaryHistory";
import { User } from "../entity/User";
import { Employee } from "../entity/Employee";
import { Company } from "../entity/Company";
import { JoinRequest } from "../entity/JoinRequest";
import { userInSessionFieldsExist } from "./helpers/validator";
import Tokens from "csrf";
import { selectFields } from "express-validator/lib/field-selection";
import { sanitizeReturnProps } from "./helpers/sanitize";
import { validatorError } from "./helpers/validator_errors";
import { validationResult } from "express-validator";
import xss from "xss";

type PayoutsHistory = {
  month: number;
  totalSalary: number;
  totalBonus: number;
};

type HoursChange = {
  day_worked: 0 | 1;
  day_sick_leave: 0 | 1;
  day_vacation: 0 | 1;
  day_on_demand_leave: 0 | 1;
};

export const getManagerDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  const tokens = new Tokens();

  const csrf_token = tokens.create(req.session.csrf_secret!);

  //TODO add case (in frontent also when company_id is null)

  const user_session = req.session.user!;

  if (!userInSessionFieldsExist(["uid", "account_type"], user_session)) {
    logger.error(`Session data not found`);
    res.status(400);
    return next(new Error("Requested resources not found"));
  }

  const { uid, account_type } = user_session;

  if (!user_session.company_id) {
    try {
      return res.render(
        "manager/dashboard",
        sanitizeReturnProps({
          baseUrl: `${process.env.BASE_URL}`,
          loggedUser: uid,
          nonce: res.locals.nonce,
          companyId: null,
          payoutsHistory: [],
          accountType: account_type,
          jrequestsPending: req.session.jrequests_pending,
          csrfToken: csrf_token,
        })
      );
    } catch (error) {
      logger.error(`Error rendering manager dashboard: ${error}`);
      res.status(500);
      return next(new Error("Internal server error"));
    }
  }

  const present_year = new Date().getFullYear();

  let payouts_history;
  try {
    payouts_history = await getGeneralYearPayment(
      present_year,
      logger,
      user_session.company_id
    );
  } catch (error) {
    logger.error(`Error getting salary history: ${error}`);
    res.status(500);
    return next(error);
  }

  let total_payouts_history_amount = 0;

  payouts_history.forEach((payout) => {
    total_payouts_history_amount += payout.totalSalary! + payout.totalBonus!;
  });

  const currentMonthIndex = new Date().getMonth();
  const present_month_total_salary =
    payouts_history[currentMonthIndex].totalSalary;
  const present_month_total_bonus =
    payouts_history[currentMonthIndex].totalBonus;

  let top_employees;

  try {
    top_employees = await getTopEmployees(present_year, uid, logger);
  } catch (error) {
    logger.error(`Error fetching top 5 employees: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }

  const sanitized_output_obj = sanitizeReturnProps({
    baseUrl: `${process.env.BASE_URL}`,
    loggedUser: uid,
    nonce: res.locals.nonce,
    totalSalary: present_month_total_salary,
    totalBonus: present_month_total_bonus,
    payoutsHistory: payouts_history,
    totalPayoutsHistoryAmount: total_payouts_history_amount,
    topEmployees: top_employees,
    companyId: user_session.company_id,
    accountType: account_type,
    jrequestsPending: req.session.jrequests_pending,
    csrfToken: csrf_token,
  });

  try {
    logger.info(`Rendering manager dashboard`);
    res.render("manager/dashboard", sanitized_output_obj);
  } catch (error) {
    logger.error(`Error rendering manager dashboard: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }
};

export const getManagerEmployeesDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  const tokens = new Tokens();

  const csrf_token = tokens.create(req.session.csrf_secret!);

  const user_session = req.session.user!;

  if (!userInSessionFieldsExist(["uid", "account_type"], user_session)) {
    logger.error(`Session data not found`);
    res.status(400);
    return next(new Error("Requested resources not found"));
  }

  const { uid, account_type } = user_session;

  if (!user_session.company_id) {
    // logger.error(`Company id not found`);
    // res.status(400);
    // return next(new Error("Company id not found"));
    try {
      return res.render("manager/employees-details", {
        baseUrl: `${process.env.BASE_URL}`,
        loggedUser: uid,
        nonce: res.locals.nonce,
        companyId: null,
        accountType: account_type,
        jrequestsPending: req.session.jrequests_pending,
        csrfToken: csrf_token,
      });
    } catch (error) {
      logger.error(`Error rendering manager employees details: ${error}`);
      res.status(500);
      return next(new Error("Internal server error"));
    }
  }

  const companyId = user_session.company_id;

  try {
    logger.info(`Rendering manager employees details`);
    return res.render("manager/employees-details", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: uid,
      nonce: res.locals.nonce,
      companyId: companyId,
      accountType: account_type,
      jrequestsPending: req.session.jrequests_pending,
      csrfToken: csrf_token,
    });
  } catch (error) {
    logger.error(`Error rendering manager employees details: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }
};

export const getManagerSingleEmployeeDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  const tokens = new Tokens();

  const csrf_token = tokens.create(req.session.csrf_secret!);

  const user_session = req.session.user!;

  if (!userInSessionFieldsExist(["uid", "account_type"], user_session)) {
    logger.error(`Session data not found`);
    res.status(400);
    return next(new Error("Requested resources not found"));
  }

  const { uid, account_type } = user_session;

  if (!user_session.company_id) {
    try {
      return res.render("manager/single-emp-details", {
        baseUrl: `${process.env.BASE_URL}`,
        loggedUser: uid,
        nonce: res.locals.nonce,
        companyId: null,
        employeeId: null,
        accountType: user_session.account_type,
        jrequestsPending: req.session.jrequests_pending,
        csrfToken: csrf_token,
      });
    } catch (error) {
      logger.error(`Error rendering manager single employee details: ${error}`);
      res.status(500);
      return next(error);
    }
  }

  const companyId = user_session.company_id;

  const employee_id = req.params.employee_id;

  if (
    !req.session.user!.authorized_employees_ids.includes(Number(employee_id))
  ) {
    logger.warn("Unauthorized");
    res.status(403);
    return next(new Error("Unauthorized"));
  }

  let does_employee_exist: Boolean;

  try {
    does_employee_exist = await AppDataSource.getRepository(Employee).exists({
      where: { id: Number(employee_id), company: { id: companyId } },
    });

    if (!does_employee_exist) {
      logger.warn("Employee does not exist");
      res.status(404);
      return next(new Error("Bad request"));
    }
  } catch (error) {
    logger.error(`Error checking if employee exists: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }

  try {
    logger.info(`Rendering manager single employee details`);
    return res.render("manager/single-emp-details", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: uid,
      nonce: res.locals.nonce,
      companyId: companyId,
      employeeId: employee_id,
      accountType: account_type,
      jrequestsPending: req.session.jrequests_pending,
      csrfToken: csrf_token,
    });
  } catch (error) {
    logger.error("Error rendering manager single employee details");
    res.status(500);
    return next(error);
  }
};

export const postUpdateEmployeePresentEarnings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;
  const query_runner = AppDataSource.createQueryRunner();

  logger.info("Received employee present earnings update request");

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    logger.error(`Validation errors: ${errors.array()}`);
    res.status(400);
    return next(new Error(`Bad request: ${errors.array()[0].msg}`));
  }

  let employee_id = req.params.employee_id;

  employee_id = xss(employee_id);

  if (
    !req.session.user!.authorized_employees_ids.includes(Number(employee_id))
  ) {
    logger.warn("Unauthorized");
    res.status(403);
    return next(new Error("Unauthorized"));
  }

  let { type, hours_change, salary, bonus } = req.body as {
    type: "hours_change" | "salary_update";
    hours_change: HoursChange;
    salary: number;
    bonus: number;
  };

  if (!type) {
    logger.error("Type is required");
    res.status(500);
    return next(new Error("Internal server error"));
  }

  if (!["hours_change", "salary_update"].includes(type)) {
    logger.error("Invalid type");
    res.status(500);
    return next(new Error("Internal server error"));
  }

  if (type === "hours_change" && !hours_change) {
    logger.error("Hours change is required");
    res.status(500);
    return next(new Error("Internal server error"));
  }

  if (type === "salary_update" && (!salary || !bonus)) {
    logger.error("Salary and bonus are required");
    res.status(500);
    return next(new Error("Internal server error"));
  }


  if (type == "salary_update") {
    try {
      await query_runner.connect();
      await query_runner.startTransaction();
      await updatePresentMonthEmployeeSalary(employee_id, salary, logger);
      await updatePresentMonthEmployeeSalaryHistoryByBonus(
        employee_id,
        bonus,
        logger
      );

      await query_runner.commitTransaction();

      return res.redirect(`/manager/single-emp-details/${employee_id}`);
    } catch (err) {
      await query_runner.rollbackTransaction();
      logger.error(`Error updating present employee details: ${err}`);
      res.status(500);
      return next(new Error("Internal server error"));
    } finally {
      await query_runner.release();
    }
  }
};

export const updatePresentMonthEmployeeSalary = async (
  employee_id: string,
  salary: number,
  logger: Logger
) => {
  logger.info(`Updating present employee salary`);

  const employee_repo = AppDataSource.getRepository(Employee);

  try {
    await employee_repo.update(employee_id, { salary_per_hour: salary });
  } catch (err) {
    logger.error(`Error updating present employee salary: ${err}`);
    throw err;
  }
};

export const updatePresentMonthEmployeeSalaryHistoryByBonus = async (
  employee_id: string,
  bonus: number,
  logger: Logger
) => {
  logger.info(`Updating present employee details with given salary and bonus`);

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

  const query = `
    UPDATE salary_history sh
    SET salary_per_hour = e.salary_per_hour,
    bonus = $1,
    ${retiremet_contributions_assignment}
    ${disability_contributions_assignment}
    ${healthcare_contributions_assignment}
    ${income_tax_assignment}
    FROM employees e
    JOIN companies c ON c.id = e."companyId"
    WHERE sh."employeeId" = e.id
    AND DATE_TRUNC('month', sh.period) = DATE_TRUNC('month', CURRENT_DATE)
    AND sh."employeeId" = $2
  `;

  try {
    const [, rows_affected] = await AppDataSource.query(query, [
      bonus,
      employee_id,
    ]);
    if (!rows_affected) {
      const insertQuery = `
  INSERT INTO salary_history (
    "employeeId",
    period,
    salary_per_hour,
    bonus,
    retirement_contributions,
    disability_contributions,
    healthcare_contributions,
    income_tax,
    days_worked,
    days_sick_leave,
    days_vacation,
    days_on_demand_leave
  )
  SELECT
    e.id AS "employeeId",
    DATE_TRUNC('month', CURRENT_DATE) AS period,
    e.salary_per_hour,
    $1 AS bonus,
    ${base_retirement_factor} * 
      (0 * c.hours_per_day +
       0 * c.sick_leave_percent_factor +
       0 * c.vacation_percent_factor +
       0 * c.on_demand_percent_factor) AS retirement_contributions,
    ${base_disability_factor} * 
      (0 * c.hours_per_day +
       0 * c.sick_leave_percent_factor +
       0 * c.vacation_percent_factor +
       0 * c.on_demand_percent_factor) AS disability_contributions,
    ${base_healthcare_factor} * 
      (0 * c.hours_per_day +
       0 * c.sick_leave_percent_factor +
       0 * c.vacation_percent_factor +
       0 * c.on_demand_percent_factor) AS healthcare_contributions,
    ${base_income_tax_factor} * 
      (0 * c.hours_per_day +
       0 * c.sick_leave_percent_factor +
       0 * c.vacation_percent_factor +
       0 * c.on_demand_percent_factor) AS income_tax,
    0 AS days_worked,
    0 AS days_sick_leave,
    0 AS days_vacation,
    0 AS days_on_demand_leave
  FROM employees e
  JOIN companies c ON c.id = e."companyId"
  WHERE e.id = $2
`;

      await AppDataSource.query(insertQuery, [bonus, employee_id]);
    }
  } catch (err) {
    logger.error(`Error inserting/updating present employee details: ${err}`);
    throw err;
  }
};

export const getManagerRaports = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  const tokens = new Tokens();
  const csrf_token = tokens.create(req.session.csrf_secret!);

  const user_session = req.session.user!;

  if (!userInSessionFieldsExist(["uid", "account_type"], user_session)) {
    logger.error(`Session data not found`);
    res.status(400);
    return next(new Error("Bad request"));
  }

  const { uid, account_type } = user_session;

  try {
    logger.info(`Rendering manager raports`);
    return res.render("manager/raports", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: user_session,
      nonce: res.locals.nonce,
      accountType: account_type,
      jrequestsPending: req.session.jrequests_pending,
      csrfToken: csrf_token,
    });
  } catch (err) {
    logger.error(`Error getting manager raports: ${err}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }
};

const getGeneralYearPayment = async (
  year: number,
  logger: Logger,
  company_id: number
): Promise<PayoutsHistory[]> => {
  const salary_map = new Map<number, number>();
  const bonus_map = new Map<number, number>();
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  try {
    const res = await AppDataSource.getRepository(SalaryHistory)
      .createQueryBuilder("salaryHistory")
      .leftJoin(
        "employees",
        "employee",
        "employee.id = salaryHistory.employeeId"
      )
      .leftJoin("companies", "company", "company.id = employee.companyId")
      .select("EXTRACT(MONTH FROM salaryHistory.period)", "month")
      .addSelect(
        "SUM(salaryHistory.salary_per_hour * company.hours_per_day * salaryHistory.days_worked)",
        "totalSalary"
      )
      .addSelect("SUM(salaryHistory.bonus)", "totalBonus")
      .where("EXTRACT(YEAR FROM salaryHistory.period) = :year", { year })
      .where("company.id = :company_id", { company_id })
      .groupBy("month")
      .orderBy("month")
      .getRawMany();

    res.forEach((row) => {
      salary_map.set(parseInt(row.month), parseFloat(row.totalSalary));
      bonus_map.set(parseInt(row.month), parseFloat(row.totalBonus));
    });

    const payouts_history: PayoutsHistory[] = months.map((month) => ({
      month,
      totalSalary: salary_map.has(month) ? salary_map.get(month)! : 0,
      totalBonus: bonus_map.has(month) ? bonus_map.get(month)! : 0,
    }));

    logger.info(`History gathered`);

    return payouts_history;
  } catch (error) {
    throw error;
  }
};

const getTopEmployees = async (
  year: number,
  managerId: number,
  logger: Logger
) => {
  try {
    logger.info(`Fetching top 5 employees`);

    const results = await AppDataSource.query(
      `
      SELECT "employee"."id" AS "employeeId", "user"."name" AS "employeeName", "user"."last_name" AS "employeeLastName", SUM("salaryHistory"."salary_per_hour" * company.hours_per_day * "salaryHistory"."days_worked") AS "totalSalary", SUM("salaryHistory"."bonus") AS "totalBonus", SUM("salaryHistory"."salary_per_hour" * company.hours_per_day * "salaryHistory"."days_worked" + "salaryHistory"."bonus") AS "totalEarnings" FROM "salary_history" "salaryHistory" INNER JOIN "employees" "employee" ON "employee"."id"="salaryHistory"."employeeId" INNER JOIN "companies" "company" ON "company"."id"="employee"."companyId" INNER JOIN "users" "manager" ON "manager"."id"="company"."managerId" INNER JOIN "users" "user" ON "user"."id"="employee"."userId" WHERE "company"."managerId" = $1 AND EXTRACT(YEAR FROM "salaryHistory"."period") = $2 GROUP BY "employee"."id", "user"."name", "user"."last_name" ORDER BY SUM("salaryHistory"."salary_per_hour" * company.hours_per_day * "salaryHistory"."days_worked" + "salaryHistory"."bonus") DESC LIMIT $3
      `,
      [managerId, year, 5]
    );

    const top_employees = results.map((result: Record<string, string>) => ({
      employee: `${result.employeeName} ${result.employeeLastName}`,
      payout: parseFloat(result.totalEarnings),
    }));

    logger.info(`Top 5 employees fetched`);

    return top_employees;
  } catch (error) {
    throw error;
  }
};

export const getManagerSettings = async (
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

  if (!userInSessionFieldsExist(["uid", "account_type"], user_session)) {
    logger.error(`Session data not found`);
    res.status(400);
    return next(new Error("Session data not found"));
  }

  const { uid, account_type } = user_session;

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
    return next(new Error("Requested resources not found"));
  }

  const is_2fa_enabled = user.two_fa_secret ? true : false;

  const { error } = req.query;

  // TODO -> should pass company here
  if (error) {
    logger.warn(`Error happened before rendering settings page: ${error}`);
    return res.status(400).render(
      "manager/settings",
      sanitizeReturnProps({
        baseUrl: `${process.env.BASE_URL}`,
        loggedUser: user_session,
        user: user,
        is2faEnabled: is_2fa_enabled,
        nonce: res.locals.nonce,
        accountType: account_type,
        error: error,
        jrequestsPending: req.session.jrequests_pending,
        csrfToken: csrf_token,
      })
    );
  }

  if (!user_session.company_id) {
    try {
      return res.status(200).render(
        "manager/settings",
        sanitizeReturnProps({
          baseUrl: `${process.env.BASE_URL}`,
          loggedUser: user_session,
          user: user,
          is2faEnabled: is_2fa_enabled,
          nonce: res.locals.nonce,
          accountType: user_session.account_type,
          error: null,
          company: null,
          jrequestsPending: req.session.jrequests_pending,
          csrfToken: csrf_token,
        })
      );
    } catch (error) {
      logger.error(`Error rendering employee settings page: ${error}`);
      res.status(500);
      return next(new Error("Internal server error"));
    }
  }

  let company;
  try {
    company = await AppDataSource.getRepository(Company).findOneBy({
      id: user_session.company_id as number,
    });

    company!.sick_leave_percent_factor =
      company!.sick_leave_percent_factor * 100;
    company!.vacation_percent_factor = company!.vacation_percent_factor * 100;
    company!.on_demand_percent_factor = company!.on_demand_percent_factor * 100;
    company!.retirement_rate = company!.retirement_rate * 100;
    company!.disability_rate = company!.disability_rate * 100;
    company!.healthcare_rate = company!.healthcare_rate * 100;
    company!.income_tax_rate = company!.income_tax_rate * 100;
  } catch (error) {
    logger.error(`Error getting company data: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }

  try {
    logger.info(`Rendering employee settings page`);
    res.render(
      "manager/settings",
      sanitizeReturnProps({
        baseUrl: `${process.env.BASE_URL}`,
        loggedUser: user_session,
        user: user,
        is2faEnabled: is_2fa_enabled,
        nonce: res.locals.nonce,
        accountType: account_type,
        error: null,
        company,
        jrequestsPending: req.session.jrequests_pending,
        csrfToken: csrf_token,
      })
    );
  } catch (error) {
    logger.error(`Error rendering employee settings page: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }
};

export const postUpdateCompanySettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  logger.info(`Updating company settings`);

  const user_session = req.session.user!;

  if (
    !userInSessionFieldsExist(
      ["uid", "account_type", "company_id"],
      user_session
    )
  ) {
    logger.error(`Session data not found`);
    res.status(400);
    return next(new Error("Session data not found"));
  }

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    logger.error(`Validation errors: ${errors.array()}`);
    res.status(400);
    return next(new Error(`Bad request: ${errors.array()[0].msg}`));
  }

  const { uid, account_type, company_id } = user_session;

  let {
    name,
    hours_per_day,
    sick_leave_percent_factor,
    vacation_percent_factor,
    on_demand_percent_factor,
    retirement_rate,
    disability_rate,
    healthcare_rate,
    income_tax_rate,
  } = req.body as {
    name: string;
    hours_per_day: number;
    sick_leave_percent_factor: number;
    vacation_percent_factor: number;
    on_demand_percent_factor: number;
    retirement_rate: number;
    disability_rate: number;
    healthcare_rate: number;
    income_tax_rate: number;
  };

  if (
    !name ||
    !hours_per_day ||
    !sick_leave_percent_factor ||
    !vacation_percent_factor ||
    !on_demand_percent_factor ||
    !retirement_rate ||
    !disability_rate ||
    !healthcare_rate ||
    !income_tax_rate
  ) {
    logger.error(`Missing required fields`);
    res.status(400);
    return next(new Error("Missing required fields"));
  }

  sick_leave_percent_factor = sick_leave_percent_factor / 100;
  vacation_percent_factor = vacation_percent_factor / 100;
  on_demand_percent_factor = on_demand_percent_factor / 100;
  retirement_rate = retirement_rate / 100;
  disability_rate = disability_rate / 100;
  healthcare_rate = healthcare_rate / 100;
  income_tax_rate = income_tax_rate / 100;

  try {
    await AppDataSource.getRepository(Company).update(company_id!, {
      name,
      hours_per_day,
      sick_leave_percent_factor,
      vacation_percent_factor,
      on_demand_percent_factor,
      retirement_rate,
      disability_rate,
      healthcare_rate,
      income_tax_rate,
    });
  } catch (error) {
    logger.error(`Error updating company settings: ${error}`);
    res.status(500);
    return next(error);
  }

  // Records in salary_history should be updated for present month

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

  const query = `
    UPDATE salary_history sh
    SET
    ${retiremet_contributions_assignment}
    ${disability_contributions_assignment}
    ${healthcare_contributions_assignment}
    ${income_tax_assignment}
    FROM employees e
    JOIN companies c ON c.id = e."companyId"
    WHERE sh."employeeId" = e.id
    AND DATE_TRUNC('month', sh.period) = DATE_TRUNC('month', CURRENT_DATE);
  `;

  try {
    await AppDataSource.query(query);

    logger.info(`Company settings updated`);
    return res.redirect("/manager/settings");
  } catch (error) {
    logger.error(`Error updating company settings: ${error}`);
    res.status(500);
    res.redirect(`/manager/settings?error=${error}`);
  }
};

export const getManagerCreateCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  logger.info(`Getting create company page`);

  const tokens = new Tokens();
  const csrf_token = tokens.create(req.session.csrf_secret!);

  const user_session = req.session.user!;

  const is_company_created = user_session.company_id ? true : false;

  if (is_company_created) {
    logger.error(`Company already created`);
    res.status(400);
    return next(new Error("Bad request"));
  }

  try {
    logger.info(`Rendering create company page`);
    return res.render("manager/create-company", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: user_session,
      nonce: res.locals.nonce,
      accountType: "manager",
      jrequestsPending: req.session.jrequests_pending,
      csrfToken: csrf_token,
    });
  } catch (error) {
    logger.error(`Error rendering create company page: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }
};

export const postManagerCreateCompany = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const company_repo = AppDataSource.getRepository(Company);
  const logger: Logger = res.locals.logger;

  logger.info(`Creating company`);

  const user_session = req.session.user!;

  const is_company_created = user_session.company_id ? true : false;
  
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    logger.error(`Bad request data`);
    res.status(400);
    return next(new Error(`Bad request: ${errors.array()[0].msg}`));
  }

  let {
    name,
    hours_per_day,
    sick_leave_percent_factor,
    vacation_percent_factor,
    on_demand_percent_factor,
    retirement_rate,
    disability_rate,
    healthcare_rate,
    income_tax_rate,
    max_days_per_month,
  } = req.body as {
    name: string;
    hours_per_day: number;
    sick_leave_percent_factor: number;
    vacation_percent_factor: number;
    on_demand_percent_factor: number;
    retirement_rate: number;
    disability_rate: number;
    healthcare_rate: number;
    income_tax_rate: number;
    max_days_per_month: number;
  };

  if (
    !name ||
    !hours_per_day ||
    !sick_leave_percent_factor ||
    !vacation_percent_factor ||
    !on_demand_percent_factor ||
    !retirement_rate ||
    !disability_rate ||
    !healthcare_rate ||
    !income_tax_rate ||
    !max_days_per_month
  ) {
    logger.error(`Missing required fields`);
    res.status(400);
    return next(new Error("Bad request"));
  }

  const does_company_exist = Boolean(
    await AppDataSource.getRepository(Company).findOneBy({ name })
  );

  if (does_company_exist) {
    logger.error(`Company already exists`);
    res.status(400);
    return next(new Error("Bad request"));
  }

  sick_leave_percent_factor = sick_leave_percent_factor / 100;
  vacation_percent_factor = vacation_percent_factor / 100;
  on_demand_percent_factor = on_demand_percent_factor / 100;
  retirement_rate = retirement_rate / 100;
  disability_rate = disability_rate / 100;
  healthcare_rate = healthcare_rate / 100;
  income_tax_rate = income_tax_rate / 100;

  try {
    const user_from_db = await AppDataSource.getRepository(User).findOneBy({
      id: user_session.uid,
    });

    if (!user_from_db) {
      logger.error(`User not found`);
      res.status(404);
      return next(new Error("Requested resources not found"));
    }

    const company = company_repo.create({
      name,
      hours_per_day,
      sick_leave_percent_factor,
      vacation_percent_factor,
      on_demand_percent_factor,
      retirement_rate,
      disability_rate,
      healthcare_rate,
      income_tax_rate,
      max_days_per_month,
      manager: user_from_db!,
    });

    await company_repo.save(company);

    const new_company = await AppDataSource.getRepository(Company).findOneBy({
      name,
    });

    if (!new_company) {
      logger.error(`Newly created company not found`);
      res.status(500);
      return next(new Error("Internal server error"));
    }

    user_from_db.company = company;

    req.session.user!.company_id = new_company.id;

    await AppDataSource.getRepository(User).save(user_from_db);

    logger.info(`Company created`);
    return res.redirect("/manager/settings");
  } catch (error) {
    logger.error(`Error creating company: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }
};

export const getManagerJoinRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;
  const tokens = new Tokens();

  const csrf_token = tokens.create(req.session.csrf_secret!);

  logger.info(`Getting join requests`);

  const user_session = req.session.user!;

  if (!user_session.company_id) {
    logger.info("No join requests, since company not created");
    try {
      return res.status(400).render("manager/join-requests", {
        baseUrl: `${process.env.BASE_URL}`,
        loggedUser: user_session,
        nonce: res.locals.nonce,
        accountType: user_session.account_type,
        jrequestsPending: req.session.jrequests_pending,
        joinRequests: [],
        csrfToken: csrf_token,
      });
    } catch (error) {
      logger.error(`Error getting join requests: ${error}`);
      res.status(500);
      return next(error);
    }
  }

  let join_requests;
  try {
    const query = `
      SELECT 
  u.email, 
  u.name, 
  u.last_name, 
  u.phone_number, 
  u.date_of_birth, 
  u.home_address,
  u.id
from 
  join_requests jr 
  join users u on jr."userId" = u.id 
WHERE 
  status = $1 
  and "companyId" = $2;
    `;

    join_requests = await AppDataSource.query(query, [
      "pending",
      user_session.company_id,
    ]);

    logger.info(`Join requests gathered`);
  } catch (error) {
    logger.error(`Error getting join requests: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }

  try {
    return res.render("manager/join-requests", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: user_session,
      nonce: res.locals.nonce,
      accountType: user_session.account_type,
      jrequestsPending: req.session.jrequests_pending,
      joinRequests: join_requests,
      csrfToken: csrf_token,
    });
  } catch (error) {
    logger.error(`Error getting join requests: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }
};

export const getManagerJoinRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  logger.info(`Getting join request`);

  const tokens = new Tokens();
  const csrf_token = tokens.create(req.session.csrf_secret!);

  const user_session = req.session.user!;

  if (!userInSessionFieldsExist(["account_type", "company_id"], user_session)) {
    logger.error(`Session data not found`);
    res.status(400);
    return next(new Error("Bad request"));
  }

  const uid = req.params.id;

  if (!uid) {
    logger.error(`Missing id`);
    res.status(400);
    return next(new Error("Bad request"));
  }

  let user_from_db;

  try {
    user_from_db = await AppDataSource.getRepository(User).findOneBy({
      id: Number(uid),
    });

    if (!user_from_db) {
      logger.error(`User not found`);
      res.status(404);
      return next(new Error("Resources not found"));
    }

    logger.info(`User found`);
  } catch (error) {
    logger.error(`Error getting user: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }

  try {
    const employee = await AppDataSource.getRepository(Employee).findOneBy({
      user: { id: user_from_db.id },
    });

    if (employee) {
      logger.error(`Employee exist`);
      res.status(400);
      return next(new Error("Bad request"));
    }
  } catch (error) {
    logger.error(`Error getting employee: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }

  try {
    const [jrequest] = await AppDataSource.query(
      `SELECT
      "companyId"
      FROM
      join_requests
      WHERE
      "userId" = $1`,
      [uid]
    );

    if (!jrequest) {
      logger.error(`Join request not found`);
      res.status(404);
      return next(new Error("Resources not found"));
    }

    if (jrequest.companyId !== user_session.company_id) {
      logger.error(`Unauthorized`);
      res.status(403);
      return next(new Error("Unauthorized"));
    }
  } catch (error) {
    logger.error(`Error checking if join request exists: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }

  try {
    return res.render("manager/join-request", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: user_session,
      nonce: res.locals.nonce,
      accountType: user_session.account_type,
      jrequestsPending: req.session.jrequests_pending,
      user: user_from_db,
      csrfToken: csrf_token,
    });
  } catch (error) {
    logger.error(`Error getting join request: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }
};

export const postManagerJoinRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  logger.info(`Handling join request`);

  const user_session = req.session.user!;

  if (!userInSessionFieldsExist(["account_type", "company_id"], user_session)) {
    logger.error(`Session data not found`);
    res.status(400);
    return next(new Error("Bad request"));
  }

  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    logger.error(`Bad request data`);
    res.status(400);
    return next(new Error(`Bad request: ${errors.array()[0].msg}`));
  }

  const {
    salary,
    phone,
    address,
    date_of_birth,
    hi_number,
    hi_provider,
    exp_date,
    notes,
  } = req.body;

  const uid = req.params.id;

  if (!uid) {
    logger.error(`Missing id`);
    res.status(400);
    return next(new Error("Missing id"));
  }

  try {
    const [jrequest] = await AppDataSource.query(
      `SELECT
      "companyId"
      FROM
      join_requests
      WHERE
      "userId" = $1`,
      [uid]
    );

    if (!jrequest) {
      logger.error(`Join request not found`);
      res.status(404);
      return next(new Error("Resources not found"));
    }

    if (jrequest.companyId !== user_session.company_id) {
      logger.error(`Unauthorized`);
      res.status(403);
      return next(new Error("Unauthorized"));
    }
  } catch (error) {
    logger.error(`Error checking if join request exists: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }

  if (
    !salary ||
    !phone ||
    !address ||
    !date_of_birth ||
    !hi_number ||
    !hi_provider ||
    !exp_date
  ) {
    logger.error(`Missing required fields`);
    res.status(400);
    return next(new Error("Missing required fields"));
  }

  try {
    const company = await AppDataSource.getRepository(Company).findOneBy({
      id: user_session.company_id!,
    });

    const user_from_db = await AppDataSource.getRepository(User).findOneBy({
      id: Number(uid),
    });

    if (!company) {
      logger.error(`Company not found`);
      res.status(404);
      return next(new Error("Company not found"));
    }

    if (!user_from_db) {
      logger.error(`User not found`);
      res.status(404);
      return next(new Error("User not found"));
    }

    const employee = new Employee();
    employee.salary_per_hour = salary;
    employee.phone_number = phone;
    employee.home_address = address;
    employee.date_of_birth = date_of_birth;
    employee.health_insurance_metadata = {
      policy_number: hi_number,
      provider: hi_provider,
      expiration_date: exp_date,
      notes: notes,
    };
    employee.company = company;
    employee.user = user_from_db;

    await AppDataSource.getRepository(Employee).save(employee);

    await AppDataSource.getRepository(JoinRequest).delete({
      user: user_from_db,
    });

    const jrequests_pending = await AppDataSource.getRepository(
      JoinRequest
    ).exists({
      where: { company, status: "pending" },
    });

    req.session.jrequests_pending = jrequests_pending;
    req.session.user?.authorized_employees_ids.push(employee.id);

    const new_salary_history_record = new SalaryHistory();
    new_salary_history_record.employee = employee;
    new_salary_history_record.period = new Date();
    new_salary_history_record.salary_per_hour = salary;
    new_salary_history_record.bonus = 0;

    await AppDataSource.getRepository(SalaryHistory).save(
      new_salary_history_record
    );

    return res.redirect("/manager/join-requests");
  } catch (error) {
    logger.error(`Error handling join request: ${error}`);
    res.status(500);
    return next(new Error("Internal server error"));
  }
};
