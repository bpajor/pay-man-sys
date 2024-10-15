import { NextFunction, Request, Response } from "express";
import { Logger } from "winston";
import { AppDataSource } from "../data-source";
import { SalaryHistory } from "../entity/SalaryHistory";
import { User } from "../entity/User";
import { Employee } from "../entity/Employee";

type PayoutsHistory = {
  month: number;
  totalSalary: number;
  totalBonus: number;
};

export const getManagerDashboard = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  //TODO add case (in frontent also when company_id is null)

  const user = req.session.user;

  if (!user) {
    logger.error(`Session data not found`);
    res.status(400);
    return next(new Error("Session data not found"));
  }

  const uid = user.uid;

  if (!uid) {
    logger.error(`Session data not found`);
    res.status(400);
    return next(new Error("Session data not found"));
  }

  if (user.account_type !== "manager") {
    logger.error(`User is not a manager`);
    res.status(403);
    return next(new Error("Unauthorized"));
  }

  if (!user.company_id) {
    return res.render("manager/dashboard", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: uid,
      nonce: res.locals.nonce,
      companyId: null,
    });
  }

  const present_year = new Date().getFullYear();

  let payouts_history;
  try {
    payouts_history = await getGeneralYearPayment(present_year, logger);
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
    return next(error);
  }

  try {
    logger.info(`Rendering manager dashboard`);
    res.render("manager/dashboard", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: uid,
      nonce: res.locals.nonce,
      totalSalary: present_month_total_salary,
      totalBonus: present_month_total_bonus,
      payoutsHistory: payouts_history,
      totalPayoutsHistoryAmount: total_payouts_history_amount,
      topEmployees: top_employees,
      companyId: user.company_id,
    });
  } catch (error) {
    logger.error(`Error rendering manager dashboard: ${error}`);
    res.status(500).send("Error rendering manager dashboard");
  }
};

export const getManagerEmployeesDetails = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  const user = req.session.user;

  if (!user) {
    logger.error(`Session data not found`);
    res.status(400);
    return next(new Error("Session data not found"));
  }

  const uid = user.uid;

  if (!uid) {
    logger.error(`Session data not found`);
    res.status(400);
    return next(new Error("Session data not found"));
  }

  if (user.account_type !== "manager") {
    logger.error(`User is not a manager`);
    res.status(403);
    return next(new Error("Unauthorized"));
  }

  if (!user.company_id) {
    logger.error(`Company id not found`);
    res.status(400);
    return next(new Error("Company id not found"));
  }

  const companyId = user.company_id;
  // const month = 3;
  // const year = new Date().getFullYear();

  // try {
  //   const date = `${year}-${month.toString().padStart(2, "0")}-01`;
  //   const res = await AppDataSource.getRepository(User).query(
  //     `
  //       SELECT 
  //           u.name AS first_name,
  //           u.last_name AS last_name,
  //           sh.salary_per_hour,
  //           e.retirement_contributions,
  //           e.disability_contributions,
  //           e.healthcare_contributions,
  //           e.income_tax,
  //           e.net_pay,
  //           sh.hours_worked AS hours_present_in_month,
  //           DATE_PART('month', AGE($1, first_entry.first_period)) 
  //               + DATE_PART('year', AGE($1, first_entry.first_period)) * 12 AS employment_duration_months
  //       FROM 
  //           public.users u
  //       INNER JOIN 
  //           public.employees e ON u.id = e."userId"
  //       INNER JOIN 
  //           public.salary_history sh ON e.id = sh."employeeId"
  //       INNER JOIN (
  //           SELECT "employeeId", MIN(period) AS first_period
  //           FROM public.salary_history
  //           GROUP BY "employeeId"
  //       ) AS first_entry ON e.id = first_entry."employeeId"
  //       WHERE 
  //           e."companyId" = $2
  //           AND EXTRACT(MONTH FROM sh.period) = $3
  //           AND EXTRACT(YEAR FROM sh.period) = $4
  //       GROUP BY 
  //           u.name, u.last_name, sh.salary_per_hour, e.retirement_contributions, 
  //           e.disability_contributions, e.healthcare_contributions, e.income_tax, 
  //           e.net_pay, sh.hours_worked, e.id, first_entry.first_period
  //       `,
  //     [date, companyId, month, year]
  //   );

  //   logger.info(`Employees details fetched`);
  // } catch (error) {
  //   logger.error(`Error getting employees details: ${error}`);
  //   res.status(500);
  //   return next(error);
  // }

  try {
    logger.info(`Rendering manager employees details`);
    return res.render("manager/employees-details", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: uid,
      nonce: res.locals.nonce,
      companyId: companyId,
    });
  } catch (error) {
    logger.error(`Error rendering manager employees details: ${error}`);
    res.status(500).send("Error rendering manager employees details");
  }
};

export const getManagerEmployeesDetailsJSON = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  const { company_id, month, year } = req.query;

  if (!company_id || !month || !year) {
    logger.error(`Missing required query parameters`);
    return res.status(400).json({ error: "Missing required query parameters" });
  }

  try {
    const date = `${year}-${month.toString().padStart(2, "0")}-01`;
    const results = await AppDataSource.getRepository(User).query(
      `
                   SELECT 
                u.name AS first_name,
                u.last_name AS last_name,
                sh.salary_per_hour,
                e.retirement_contributions,
                e.disability_contributions,
                e.healthcare_contributions,
                e.income_tax,
                e.net_pay,
                sh.hours_worked AS hours_present_in_month,
                DATE_PART('month', AGE($1::DATE, first_entry.first_period)) 
                    + DATE_PART('year', AGE($1::DATE, first_entry.first_period)) * 12 AS employment_duration_months
            FROM 
                public.users u
            INNER JOIN 
                public.employees e ON u.id = e."userId"
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
                u.name, u.last_name, sh.salary_per_hour, e.retirement_contributions, 
                e.disability_contributions, e.healthcare_contributions, e.income_tax, 
                e.net_pay, sh.hours_worked, e.id, first_entry.first_period
        `,
      [date, company_id, month, year]
    );

    logger.info(`Employees details fetched`);

    return res.json(results);
  } catch (error) {
    logger.error(`Error getting employees details: ${error}`);
    return res.status(500).json({ error: "Error getting employees details" });
  }
};

const getGeneralYearPayment = async (
  year: number,
  logger: Logger
): Promise<PayoutsHistory[]> => {
  const salary_map = new Map<number, number>();
  const bonus_map = new Map<number, number>();
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  try {
    const res = await AppDataSource.getRepository(SalaryHistory)
      .createQueryBuilder("salaryHistory")
      .select("EXTRACT(MONTH FROM salaryHistory.period)", "month")
      .addSelect(
        "SUM(salaryHistory.salary_per_hour * salaryHistory.hours_worked)",
        "totalSalary"
      )
      .addSelect("SUM(salaryHistory.bonus)", "totalBonus")
      .where("EXTRACT(YEAR FROM salaryHistory.period) = :year", { year })
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
    const results = await AppDataSource.getRepository(SalaryHistory)
      .createQueryBuilder("salaryHistory")
      .innerJoin("salaryHistory.employee", "employee")
      .innerJoin("employee.company", "company")
      .innerJoin("company.manager", "manager")
      .innerJoin("employee.user", "user") // Join z tabelą users, aby pobrać name i lastName
      .select("employee.id", "employeeId")
      .addSelect("user.name", "employeeName")
      .addSelect("user.last_name", "employeeLastName") // Dodanie lastName pracownika
      .addSelect(
        "SUM(salaryHistory.salary_per_hour * salaryHistory.hours_worked)",
        "totalSalary"
      )
      .addSelect("SUM(salaryHistory.bonus)", "totalBonus")
      .addSelect(
        "SUM(salaryHistory.salary_per_hour * salaryHistory.hours_worked + salaryHistory.bonus)",
        "totalEarnings"
      )
      .where("company.managerId = :managerId", { managerId })
      .andWhere("EXTRACT(YEAR FROM salaryHistory.period) = :year", { year })
      .groupBy("employee.id")
      .addGroupBy("user.name")
      .addGroupBy("user.last_name") // Dodanie grupowania po lastName
      .orderBy(
        "SUM(salaryHistory.salary_per_hour * salaryHistory.hours_worked + salaryHistory.bonus)",
        "DESC"
      ) // Zamiast aliasu, bezpośrednie wyrażenie
      .limit(5)
      .getRawMany();

    const top_employees = results.map((result) => ({
      employee: `${result.employeeName} ${result.employeeLastName}`,
      payout: parseFloat(result.totalEarnings),
    }));

    logger.info(`Top 5 employees fetched`);

    return top_employees;
  } catch (error) {
    throw error;
  }
};
