import { NextFunction, Request, Response } from "express";
import { Logger } from "winston";
import { AppDataSource } from "../data-source";
import {
  translateExpensesResults,
  translateHoursWorkedResults,
} from "./helpers/translate";
import { JoinRequest } from "../entity/JoinRequest";
import { User } from "../entity/User";
import OTPAuth from "otpauth";
import { encode } from "hi-base32";
import QRCode from "qrcode";
import { userInSessionFieldsExist } from "./helpers/validator";
import {
  ALL_EARNINGS_DETAILS_PER_YEAR,
  ALL_EMPLOYEE_EARNINGS_DETAILS_PER_YEAR,
  ALL_EMPLOYEES_EARNINGS,
  AVERAGE_SALARY_AND_BONUSES_PER_YEAR,
  HOURS_WORKED_IN_COMPANY_BY_YEAR,
} from "./helpers/queries";
import { getPeriod } from "./helpers/builders";
import { Employee } from "../entity/Employee";

export type HoursWorkedResult = {
  period_month: Date;
  total_hours_worked: number;
};

export type ExpensesResponse = {
  total_contributions: number | null;
  total_salary: number | null;
  total_bonuses: number | null;
  month?: string;
};

type EmployeeEarningsResponse = {
  month: string;
  total_salary: number;
  retirement_contributions: number;
  disability_contributions: number;
  healthcare_contributions: number;
  income_tax: number;
  bonus: number;
}[];

export const getAllExpensesDetailsAPI = async (req: Request, res: Response) => {
  const logger: Logger = res.locals.logger;

  const user = req.session.user!;

  if (!userInSessionFieldsExist(["company_id"], user)) {
    logger.error(`Session data not found`);
    return res.status(400).json({ message: "Bad request" });
  }

  const { company_id } = user;

  const { year, month } = req.query;

  const period = getPeriod(year as string, month as string);

  const query = ALL_EMPLOYEES_EARNINGS;

  try {
    const [results]: ExpensesResponse[] = await AppDataSource.query(query, [
      period,
      company_id,
    ]);

    const results_to_return = translateExpensesResults(results);

    return res.status(200).json(results_to_return);
  } catch (err) {
    logger.error(`Error getting expenses details: ${err}`);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllHoursWorkedByYearAPI = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  const user = req.session.user!;

  if (!userInSessionFieldsExist(["company_id"], user)) {
    logger.error(`Session data not found`);
    return res.status(400).json({ message: "Bad request" });
  }

  const { company_id } = user;

  const { year } = req.query;

  const query = HOURS_WORKED_IN_COMPANY_BY_YEAR;

  try {
    const results: HoursWorkedResult[] = await AppDataSource.query(query, [
      company_id,
      year,
    ]);

    const res_to_return = translateHoursWorkedResults(results);

    return res.status(200).json(res_to_return);
  } catch (err) {
    logger.error(`Error getting hours worked by year: ${err}`);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getAverageSalaryAndBonusbByYearAPI = async (
  req: Request,
  res: Response
) => {
  const logger: Logger = res.locals.logger;

  const user = req.session.user!;

  if (!userInSessionFieldsExist(["company_id"], user)) {
    logger.error(`Session data not found`);
    return res.status(400).json({ message: "Bad request" });
  }

  const { company_id } = user;

  const { year } = req.query;

  const query = AVERAGE_SALARY_AND_BONUSES_PER_YEAR;

  try {
    const results = await AppDataSource.query(query, [company_id, year]);

    return res.status(200).json(results);
  } catch (err) {
    logger.error(`Error getting average salary and bonus by year: ${err}`);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllExpensesDetailsByYearAPI = async (
  req: Request,
  res: Response
) => {
  const logger: Logger = res.locals.logger;

  const user = req.session.user!;

  if (!userInSessionFieldsExist(["company_id"], user)) {
    logger.error(`Session data not found`);
    return res.status(400).json({ message: "Bad request" });
  }

  const { company_id } = user;

  const { year } = req.query;

  const query = ALL_EARNINGS_DETAILS_PER_YEAR;

  try {
    const results: ExpensesResponse[] = await AppDataSource.query(query, [
      year,
      company_id,
    ]);

    const results_to_return = results.map((result) => {
      return translateExpensesResults(result);
    });

    return res.status(200).json(results_to_return);
  } catch (err) {
    logger.error(`Error getting expenses details by year: ${err}`);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteJoinRequestByEmailAPI = async (
  req: Request,
  res: Response
) => {
  const logger: Logger = res.locals.logger;

  logger.info(`Deleting join request by email`);

  const { email } = req.body;

  if (!email) {
    logger.error(`Email not provided`);
    return res.status(400).json({ message: "Bad request" });
  }

  let user_id;

  try {
    const user_from_db = await AppDataSource.getRepository(User).findOneBy({
      email,
    });

    if (!user_from_db) {
      logger.error(`User not found`);
      return res.status(404).json({ message: "User not found" });
    }

    user_id = user_from_db.id;
  } catch (err) {
    logger.error(`Error getting user data: ${err}`);
    return res.status(500).json({ message: "Internal server error" });
  }

  try {
    const employee = await AppDataSource.getRepository(Employee).findOneBy({
      user: { id: user_id },
    });

    if (!req.session.user!.authorized_employees_ids.includes(employee!.id)) {
      logger.error(`Unauthorized`);
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (!employee) {
      logger.error(`Employee not found`);
      return res
        .status(404)
        .json({ message: "Requested resources cannot be found" });
    }
  } catch (err) {
    logger.error(`Error getting employee data: ${err}`);
    return res.status(500).json({ message: "Internal server error" });
  }

  const join_request_repo = AppDataSource.getRepository(JoinRequest);

  try {
    await join_request_repo.delete({
      user: { id: user_id },
    });

    logger.info(`Join request deleted`);

    return res.status(200).json({ success: true });
  } catch (err) {
    logger.error(`Error deleting join request: ${err}`);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getEmployeeEarningsDetailsByYearAPI = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  const user = req.session.user!;

  const { year } = req.query;

  if (!year) {
    logger.error(`Year not provided`);
    return res.status(400).json({ message: "Bad request" });
  }

  const employee_id = user.employee_id;
  if (!employee_id) {
    logger.error(`Employee id not found`);
    return res.status(400).json({ message: "Bad request" });
  }

  const query = ALL_EMPLOYEE_EARNINGS_DETAILS_PER_YEAR;

  try {
    const earnings: EmployeeEarningsResponse = await AppDataSource.query(
      query,
      [year, employee_id]
    );

    earnings.forEach((earning) => {
      earning.total_salary = Number(earning.total_salary);
      earning.retirement_contributions = Number(
        earning.retirement_contributions
      );
      earning.disability_contributions = Number(
        earning.disability_contributions
      );
      earning.healthcare_contributions = Number(
        earning.healthcare_contributions
      );
      earning.income_tax = Number(earning.income_tax);
      earning.bonus = Number(earning.bonus);
    });
    return res.status(200).json(earnings);
  } catch (error) {
    logger.error(`Error getting employee earnings details: ${error}`);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const deleteEmployeeEmployeeAPI = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  const query_runner = AppDataSource.createQueryRunner();

  logger.info(`Deleting employee account`);

  const user = req.session.user!;

  if (!userInSessionFieldsExist(["employee_id"], user)) {
    logger.error(`Session data not found`);
    return res.status(400).json({ success: false });
  }

  const employee_id = user.employee_id;

  try {
    await query_runner.startTransaction();

    await query_runner.query(
      `DELETE FROM salary_history WHERE "employeeId" = $1`,
      [employee_id]
    );

    await query_runner.query(`DELETE FROM employees WHERE id = $1`, [
      employee_id,
    ]);

    await query_runner.commitTransaction();
  } catch (error) {
    await query_runner.rollbackTransaction();
    logger.error(`Error deleting employee account: ${error}`);
    return res.status(500).json({ success: false });
  } finally {
    await query_runner.release();
  }

  req.session.user!.company_id = null;
  req.session.user!.employee_id = null;

  try {
    return res.json({ success: true });
  } catch (error) {
    logger.error(`Error deleting employee account: ${error}`);
    return res.status(500).json({ success: false });
  }
};

export const postEnable2faAPI = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;
  const user_repo = AppDataSource.getRepository(User);

  logger.info(`Enabling 2fa`);

  const user = req.session.user!;

  if (!userInSessionFieldsExist(["uid", "email"], user)) {
    logger.error(`Session data not found`);
    return res.status(400).json({ success: false });
  }

  const { email, uid } = user;

  const { secret, otpauthURL } = generate2FASecret(email);

  let qrCodeDataUrl;
  try {
    logger.info(`Generating QR code`);
    qrCodeDataUrl = await QRCode.toDataURL(otpauthURL);
  } catch (error) {
    logger.error(`Error generating QR code: ${error}`);
    return res.status(500).json({ success: false });
  }

  try {
    logger.info(`Updating user with 2fa secret`);
    await user_repo.update({ id: uid }, { two_fa_secret: secret });
  } catch (error) {
    logger.error(`Error updating user with 2fa secret: ${error}`);
    return res.status(500).json({ success: false });
  }

  return res.json({
    success: true,
    qrCode: qrCodeDataUrl,
  });
};

export const postDisable2faAPI = async (req: Request, res: Response) => {
  const logger = res.locals.logger;
  logger.info(`Disabling 2fa`);

  const user_repo = AppDataSource.getRepository(User);

  const user = req.session.user!;

  if (!userInSessionFieldsExist(["uid"], user)) {
    logger.error(`Session data not found`);
    return res.status(400).json({ success: false });
  }

  const { uid } = user;

  try {
    logger.info(`Disabling 2fa for user`);
    await user_repo.update({ id: uid }, { two_fa_secret: null });
  } catch (error) {
    logger.error(`Error disabling 2fa for user: ${error}`);
    return res.status(500).json({ success: false });
  }

  return res.json({ success: true });
};

export const getManagerEmployeesDetailsAPI = async (
  req: Request,
  res: Response
) => {
  const logger: Logger = res.locals.logger;

  const user = req.session.user!;

  if (!userInSessionFieldsExist(["company_id"], user)) {
    logger.error(`Session data not found`);
    return res.status(400).json({ error: "Session data not found" });
  }

  const company_id = user.company_id;

  const { month, year } = req.query;

  if (!month || !year) {
    logger.error(`Missing required query parameters`);
    return res.status(400).json({ error: "Missing required query parameters" });
  } //TODO validation should happen in route validators

  try {
    const date = `${year}-${month.toString().padStart(2, "0")}-01`;
    const results = await AppDataSource.getRepository(User).query(
      `
                   SELECT 
    e.id AS id,               
    u.name AS first_name,
    u.last_name AS last_name,
    sh.salary_per_hour,
    sh.retirement_contributions,
    sh.disability_contributions,
    sh.healthcare_contributions,
    sh.income_tax,
    sh.bonus,
    sh.days_sick_leave,
    sh.days_vacation,
    sh.days_on_demand_leave,
    c.hours_per_day,
    c.sick_leave_percent_factor,
    c.vacation_percent_factor,
    c.on_demand_percent_factor,
    (c.hours_per_day * sh.days_sick_leave) AS hours_on_sick_leave,
    (c.hours_per_day * sh.days_vacation ) AS hours_on_vacation,
    (c.hours_per_day * sh.days_on_demand_leave) AS hours_on_demand_leave,
    (c.hours_per_day * sh.days_worked) AS hours_present_in_month,
    DATE_PART('month', AGE($1::DATE, first_entry.first_period)) 
        + DATE_PART('year', AGE($1::DATE, first_entry.first_period)) * 12 AS employment_duration_months
FROM 
    public.users u
INNER JOIN 
    public.employees e ON u.id = e."userId" 
INNER JOIN  
    public.companies c ON e."companyId" = c.id
INNER JOIN (
    SELECT * 
    FROM public.salary_history 
    WHERE EXTRACT(MONTH FROM period) = $3 AND EXTRACT(YEAR FROM period) = $4 
) AS sh ON e.id = sh."employeeId"
INNER JOIN (
    SELECT "employeeId", MIN(period) AS first_period
    FROM public.salary_history
    GROUP BY "employeeId"
) AS first_entry ON e.id = first_entry."employeeId"
WHERE 
    e."companyId" = $2
GROUP BY 
    u.name, u.last_name, sh.salary_per_hour, sh.retirement_contributions, 
    sh.disability_contributions, sh.healthcare_contributions, sh.income_tax, sh.days_sick_leave, sh.days_vacation, sh.days_on_demand_leave, sh.bonus,
     c.hours_per_day, sh.days_worked, e.id, first_entry.first_period, c.sick_leave_percent_factor, c.vacation_percent_factor, c.on_demand_percent_factor, sh.days_sick_leave, sh.days_vacation, sh.days_on_demand_leave;
        `, //TODO adjust to the new schema
      [date, company_id, month, year]
    );

    const employees_data = results;

    employees_data.forEach((employee: any) => {
      employee.retirement_contributions = Number(
        employee.retirement_contributions
      );
      employee.disability_contributions = Number(
        employee.disability_contributions
      );
      employee.healthcare_contributions = Number(
        employee.healthcare_contributions
      );
      employee.income_tax = Number(employee.income_tax);
      employee.salary_per_hour = Number(employee.salary_per_hour);
      employee.bonus = Number(employee.bonus);
      employee.hours_present_in_month = Number(employee.hours_present_in_month);
      employee.hours_on_sick_leave = Number(employee.hours_on_sick_leave);
      employee.hours_on_vacation = Number(employee.hours_on_vacation);
      employee.hours_on_demand_leave = Number(employee.hours_on_demand_leave);
      employee.sick_leave_percent_factor = Number(
        employee.sick_leave_percent_factor
      );
      employee.vacation_percent_factor = Number(
        employee.vacation_percent_factor
      );
      employee.on_demand_percent_factor = Number(
        employee.on_demand_percent_factor
      );

      employee.total_pay =
        employee.salary_per_hour *
          (employee.hours_present_in_month +
            employee.hours_on_sick_leave * employee.sick_leave_percent_factor +
            employee.hours_on_vacation * employee.vacation_percent_factor +
            employee.hours_on_demand_leave *
              employee.on_demand_percent_factor) +
        employee.bonus;

      employee.net_pay =
        employee.total_pay -
        (employee.retirement_contributions +
          employee.disability_contributions +
          employee.healthcare_contributions +
          employee.income_tax);
    });

    return res.json(employees_data);
  } catch (error) {
    logger.error(`Error getting employees details: ${error}`);
    return res.status(500).json({ error: "Error getting employees details" });
  }
};

export const getManagerSingleEmpDetailsAPI = async (
  req: Request,
  res: Response
) => {
  const logger: Logger = res.locals.logger;

  logger.info("Getting Single Employee Details");

  const user = req.session.user!

  if (!userInSessionFieldsExist(["company_id",], user)) {
    logger.error(`Session data not found`);
    return res.status(400).json({ error: "Session data not found" });
  }

  const company_id = user.company_id;

  const { month, year, with_details, employee_id } = req.query;

  if (!req.session.user?.authorized_employees_ids.includes(Number(employee_id))) {
    logger.error(`Unauthorized`);
    return res.status(403).json({ error: "Unauthorized" });
  }

  let default_read_mask = `
    json_agg(e.health_insurance_metadata) AS health_insurance_metadata,
    sh.salary_per_hour,
    sh.bonus,
    (c.hours_per_day * sh.days_sick_leave) AS hours_on_sick_leave,
    (c.hours_per_day * sh.days_vacation ) AS hours_on_vacation,
    (c.hours_per_day * sh.days_on_demand_leave) AS hours_on_demand_leave,
    (c.hours_per_day * sh.days_worked) AS hours_present_in_month,
    c.sick_leave_percent_factor AS sick_leave_percent_factor,
    c.vacation_percent_factor AS vacation_percent_factor,
    c.on_demand_percent_factor AS on_demand_percent_factor,
    sh.retirement_contributions,
    sh.disability_contributions,
    sh.healthcare_contributions,
    sh.income_tax,
    (c.hours_per_day * sh.days_worked) AS hours_present_in_month,
    DATE_PART('month', AGE($1::DATE, first_entry.first_period)) 
        + DATE_PART('year', AGE($1::DATE, first_entry.first_period)) * 12 AS employment_duration_months
  `;
  let mask;
  if (with_details) {
    mask =
      `
      u.name AS first_name,
    u.last_name AS last_name,
    u.email,
    u.phone_number,
    u.home_address,
    u.date_of_birth,
    ` + default_read_mask;
    logger.info("Requested /manager/single-emp-details with personal details");
  } else {
    mask = default_read_mask;
    logger.info(
      "Requested /manager/single-emp-details without personal details"
    );
  }

  if (!month || !year) {
    logger.error(`Missing required query parameters`);
    return res.status(400).json({ error: "Missing required query parameters" });
  } //TODO this should also be validated earlier (Vulnerability)

  try {
    const date = `${year}-${month.toString().padStart(2, "0")}-01`;

    const results = await AppDataSource.query(
      `
        SELECT 
   ${mask}
FROM 
    public.users u
INNER JOIN 
    public.employees e ON u.id = e."userId"
INNER JOIN
    public.companies c ON e."companyId" = c.id
LEFT JOIN (
    SELECT * 
    FROM public.salary_history 
    WHERE EXTRACT(MONTH FROM period) = $2 AND EXTRACT(YEAR FROM period) = $3
) AS sh ON e.id = sh."employeeId"
INNER JOIN (
    SELECT "employeeId", MIN(period) AS first_period
    FROM public.salary_history
    GROUP BY "employeeId"
) AS first_entry ON e.id = first_entry."employeeId"
WHERE 
    e."companyId" = $4
    AND e.id = $5
GROUP BY 
    u.name, u.last_name, u.email, u.phone_number, u.home_address, u.date_of_birth, 
    sh.salary_per_hour, sh.retirement_contributions, 
    sh.disability_contributions, sh.healthcare_contributions, sh.income_tax, 
     c.hours_per_day, sh.days_worked, sh.bonus, e.id, first_entry.first_period, sh.days_sick_leave, sh.days_vacation, sh.days_on_demand_leave, c.sick_leave_percent_factor, c.vacation_percent_factor, c.on_demand_percent_factor;
      `,
      [date, month, year, company_id, employee_id]
    );

    const employee_data = results[0];

    if (!employee_data) {
      logger.error("No employee data found");
      return res.status(404).json({ error: "No employee data found" });
    }

    employee_data.bonus = Number(employee_data.bonus);
    employee_data.retirement_contributions = Number(
      employee_data.retirement_contributions
    );
    employee_data.disability_contributions = Number(
      employee_data.disability_contributions
    );
    employee_data.healthcare_contributions = Number(
      employee_data.healthcare_contributions
    );
    employee_data.income_tax = Number(employee_data.income_tax);
    employee_data.salary_per_hour = Number(employee_data.salary_per_hour);

    employee_data.total_pay =
      employee_data.salary_per_hour *
        (employee_data.hours_present_in_month +
          employee_data.hours_on_sick_leave *
            employee_data.sick_leave_percent_factor +
          employee_data.hours_on_vacation *
            employee_data.vacation_percent_factor +
          employee_data.hours_on_demand_leave *
            employee_data.on_demand_percent_factor) +
      employee_data.bonus;

    employee_data.net_pay =
      employee_data.total_pay -
      (employee_data.retirement_contributions +
        employee_data.disability_contributions +
        employee_data.healthcare_contributions +
        employee_data.income_tax);

    logger.info("gathered employee data correctly");
    return res.json(employee_data);
  } catch (err) {
    logger.error("gathering employee data failed");
    return res
      .status(500)
      .json({ error: "Error getting single employee details" });
  }
};

const generate2FASecret = (userEmail: string) => {
  // Utwórz obiekt OTPAuth.TOTP (czasowy kod jednorazowy)
  const totp = new OTPAuth.TOTP({
    issuer: "PayrollPro", // Nazwa Twojej aplikacji
    label: userEmail, // Email użytkownika jako identyfikator
    algorithm: "SHA1",
    digits: 6,
    period: 30,
  });

  // Wygeneruj tajny klucz (base32 encoded)
  const secret = encode(totp.secret.bytes);

  // Utwórz URL dla aplikacji uwierzytelniającej
  const otpauthURL = totp.toString();

  return { secret, otpauthURL };
};
