import { NextFunction, Request, Response } from "express";
import { Logger } from "winston";
import { AppDataSource } from "../data-source";
import {
  translateExpensesResults,
  translateHoursWorkedResults,
} from "./helpers/translate";
import { JoinRequest } from "../entity/JoinRequest";
import { User } from "../entity/User";

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

export const getAllExpensesDetailsJSON = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  const user = req.session.user;

  if (!user) {
    logger.error(`Session data not found`);
    return res.status(403).json({ message: "Unathorized" });
  }

  if (user.account_type !== "manager") {
    logger.error(`User is not a manager`);
    return res.status(403).json({ message: "Unathorized" });
  }

  const uid = user.uid;

  if (!uid) {
    logger.error(`Session data not found`);
    return res.status(400).json({ message: "Bad request" });
  }

  if (!user.company_id) {
    logger.error(`Company id not found`);
    return res.status(400).json({ message: "Bad request" });
  }

  const company_id = user.company_id;

  const { year, month } = req.query;

  const period = `${year}-${month}-01`;

  const query = `
SELECT 
  ROUND(
    SUM(
      sh.retirement_contributions + 
      sh.disability_contributions + 
      sh.healthcare_contributions + 
      sh.income_tax
    ), 
    2
  ) AS total_contributions, 

  ROUND(
    SUM(sh.bonus), 
    2
  ) AS total_bonuses, 

  ROUND(
    SUM(
      sh.salary_per_hour * c.hours_per_day * (
        sh.days_worked + 
        sh.days_sick_leave * c.sick_leave_percent_factor + 
        sh.days_vacation * c.vacation_percent_factor + 
        sh.days_on_demand_leave * c.on_demand_percent_factor
      ) + sh.bonus
    ), 
    2
  ) AS total_salary 
FROM 
  salary_history sh 
  JOIN employees e ON sh."employeeId" = e.id 
  JOIN companies c ON e."companyId" = c.id 
WHERE 
  date_trunc('month', sh.period) = date_trunc('month', $1::date) 
  AND c.id = $2;
    `;

  try {
    const [results]: ExpensesResponse[] = await AppDataSource.query(query, [
      period,
      company_id,
    ]);

    const results_to_return = translateExpensesResults(results);

    // for (const key in results) {
    //   results[key] = Number(results[key]);
    // }

    // results.net_without_bonus_pay =
    //   results.total_salary -
    //   results.total_contributions -
    //   results.total_bonuses;

    return res.status(200).json(results_to_return);
  } catch (err) {
    logger.error(`Error getting expenses details: ${err}`);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllHoursWorkedByYearJSON = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  const user = req.session.user;

  if (!user) {
    logger.error(`Session data not found`);
    return res.status(403).json({ message: "Unathorized" });
  }

  if (user.account_type !== "manager") {
    logger.error(`User is not a manager`);
    return res.status(403).json({ message: "Unathorized" });
  }

  const uid = user.uid;

  if (!uid) {
    logger.error(`Session data not found`);
    return res.status(400).json({ message: "Bad request" });
  }

  if (!user.company_id) {
    logger.error(`Company id not found`);
    return res.status(400).json({ message: "Bad request" });
  }

  const company_id = user.company_id;

  const { year } = req.query;

  const query = `
SELECT
    date_trunc('month', sh.period) AS period_month,
    SUM(sh.days_worked * c.hours_per_day)::integer AS total_hours_worked
FROM
    salary_history sh
    JOIN employees e ON sh."employeeId" = e.id
    JOIN companies c ON e."companyId" = c.id
WHERE
    c.id = $1
    AND EXTRACT(YEAR FROM sh.period) = $2
GROUP BY
    period_month
ORDER BY
    period_month;

  `;

  try {
    const results: HoursWorkedResult[] = await AppDataSource.query(query, [
      company_id,
      year,
    ]);

    const res_to_return = translateHoursWorkedResults(results);

    return res.status(200).json(res_to_return);
    // return res.status(200).json(results);
  } catch (err) {
    logger.error(`Error getting hours worked by year: ${err}`);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getAverageSalaryAndBonusbByYearJSON = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  const user = req.session.user;

  if (!user) {
    logger.error(`Session data not found`);
    return res.status(403).json({ message: "Unathorized" });
  }

  if (user.account_type !== "manager") {
    logger.error(`User is not a manager`);
    return res.status(403).json({ message: "Unathorized" });
  }

  const uid = user.uid;

  if (!uid) {
    logger.error(`Session data not found`);
    return res.status(400).json({ message: "Bad request" });
  }

  if (!user.company_id) {
    logger.error(`Company id not found`);
    return res.status(400).json({ message: "Bad request" });
  }

  const company_id = user.company_id;

  const { year } = req.query;

  const query = `
        SELECT
    TRIM(TO_CHAR(sh.period, 'Month')) AS month, 
    ROUND(
        AVG(
            sh.salary_per_hour * c.hours_per_day * (
                sh.days_worked + 
                sh.days_sick_leave * c.sick_leave_percent_factor + 
                sh.days_vacation * c.vacation_percent_factor + 
                sh.days_on_demand_leave * c.on_demand_percent_factor
            ) + sh.bonus
        ), 
        2
    )::numeric(10,2) AS average_salary, 
    ROUND(
        AVG(sh.bonus), 
        2
    )::numeric(10,2) AS average_bonus 
FROM 
    salary_history sh 
    JOIN employees e ON sh."employeeId" = e.id 
    JOIN companies c ON e."companyId" = c.id 
WHERE 
    c.id = $1
    AND EXTRACT(YEAR FROM sh.period) = $2 
GROUP BY 
    EXTRACT(MONTH FROM sh.period), 
    TO_CHAR(sh.period, 'Month') 
ORDER BY 
    EXTRACT(MONTH FROM sh.period);
    `;

  try {
    const results = await AppDataSource.query(query, [company_id, year]);

    return res.status(200).json(results);
  } catch (err) {
    logger.error(`Error getting average salary and bonus by year: ${err}`);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllExpensesDetailsByYearJSON = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  const user = req.session.user;

  if (!user) {
    logger.error(`Session data not found`);
    return res.status(403).json({ message: "Unathorized" });
  }

  if (user.account_type !== "manager") {
    logger.error(`User is not a manager`);
    return res.status(403).json({ message: "Unathorized" });
  }

  const uid = user.uid;

  if (!uid) {
    logger.error(`Session data not found`);
    return res.status(400).json({ message: "Bad request" });
  }

  if (!user.company_id) {
    logger.error(`Company id not found`);
    return res.status(400).json({ message: "Bad request" });
  }

  const company_id = user.company_id;

  const { year } = req.query;

  const query = `
        SELECT 
    TRIM(TO_CHAR(sh.period, 'Month')) AS month, 

    COALESCE(
        ROUND(
            SUM(
                sh.retirement_contributions + 
                sh.disability_contributions + 
                sh.healthcare_contributions + 
                sh.income_tax
            ), 
            2
        )::numeric(10,2), 
        0.00
    ) AS total_contributions, 

    COALESCE(
        ROUND(
            SUM(sh.bonus), 
            2
        )::numeric(10,2), 
        0.00
    ) AS total_bonuses, 

    COALESCE(
        ROUND(
            SUM(
                sh.salary_per_hour * c.hours_per_day * (
                    sh.days_worked + 
                    sh.days_sick_leave * c.sick_leave_percent_factor + 
                    sh.days_vacation * c.vacation_percent_factor + 
                    sh.days_on_demand_leave * c.on_demand_percent_factor
                ) + sh.bonus
            ), 
            2
        )::numeric(10,2), 
        0.00
    ) AS total_salary 
FROM 
    salary_history sh 
    JOIN employees e ON sh."employeeId" = e.id 
    JOIN companies c ON e."companyId" = c.id 
WHERE 
    EXTRACT(YEAR FROM sh.period) = $1
    AND c.id = $2
GROUP BY 
    EXTRACT(MONTH FROM sh.period), 
    TO_CHAR(sh.period, 'Month') 
ORDER BY 
    EXTRACT(MONTH FROM sh.period);
    `;

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

export const deleteJoinRequestByEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
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

  const join_request_repo = AppDataSource.getRepository(JoinRequest);

  try {
    await join_request_repo.delete({
      user: {id: user_id},
    });

    logger.info(`Join request deleted`);

    return res.status(200).json({success: true});
  } catch (err) {
    logger.error(`Error deleting join request: ${err}`);
    return res.status(500).json({ message: "Internal server error" });
  }
};
