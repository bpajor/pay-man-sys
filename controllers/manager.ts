import { NextFunction, Request, Response } from "express";
import { Logger } from "winston";
import { AppDataSource } from "../data-source";
import { SalaryHistory } from "../entity/SalaryHistory";
import { User } from "../entity/User";
import { Employee } from "../entity/Employee";
import { Company } from "../entity/Company";
import { JoinRequest } from "../entity/JoinRequest";

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
      payoutsHistory: [],
      accountType: user.account_type,
      jrequestsPending: req.session.jrequests_pending,
    });
  }

  const present_year = new Date().getFullYear();

  let payouts_history;
  try {
    payouts_history = await getGeneralYearPayment(
      present_year,
      logger,
      user.company_id
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
      accountType: user.account_type,
      jrequestsPending: req.session.jrequests_pending,
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
    // logger.error(`Company id not found`);
    // res.status(400);
    // return next(new Error("Company id not found"));
    try {
      return res.render("manager/employees-details", {
        baseUrl: `${process.env.BASE_URL}`,
        loggedUser: uid,
        nonce: res.locals.nonce,
        companyId: null,
        accountType: user.account_type,
        jrequestsPending: req.session.jrequests_pending,
      });
    } catch (error) {
      logger.error(`Error rendering manager employees details: ${error}`);
      res.status(500);
      return next(error);
    }
  }

  const companyId = user.company_id;

  try {
    logger.info(`Rendering manager employees details`);
    return res.render("manager/employees-details", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: uid,
      nonce: res.locals.nonce,
      companyId: companyId,
      accountType: user.account_type,
      jrequestsPending: req.session.jrequests_pending,
    });
  } catch (error) {
    logger.error(`Error rendering manager employees details: ${error}`);
    res.status(500).send("Error rendering manager employees details");
  }
};

export const getManagerSingleEmployeeDetails = async (
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
    try {
      return res.render("manager/single-emp-details", {
        baseUrl: `${process.env.BASE_URL}`,
        loggedUser: uid,
        nonce: res.locals.nonce,
        companyId: null,
        accountType: user.account_type,
        jrequestsPending: req.session.jrequests_pending,
      });
    } catch (error) {
      logger.error(`Error rendering manager single employee details: ${error}`);
      res.status(500);
      return next(error);
    }
  }

  const companyId = user.company_id;

  const employee_id = req.params.employee_id;

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
    return next(error);
  }

  try {
    logger.info(`Rendering manager single employee details`);
    return res.render("manager/single-emp-details", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: uid,
      nonce: res.locals.nonce,
      companyId: companyId,
      employeeId: employee_id,
      accountType: user.account_type,
      jrequestsPending: req.session.jrequests_pending,
    });
  } catch (error) {
    logger.error("Error rendering manager single employee details");
    res.status(500);
    return next(error);
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

      // employee.net_pay =
      //   employee.salary_per_hour * employee.hours_present_in_month +
      //   employee.bonus;
      // employee.total_pay =
      //   employee.net_pay +
      //   employee.retirement_contributions +
      //   employee.disability_contributions +
      //   employee.healthcare_contributions +
      //   employee.income_tax;
    });

    return res.json(employees_data);
  } catch (error) {
    logger.error(`Error getting employees details: ${error}`);
    return res.status(500).json({ error: "Error getting employees details" });
  }
};

export const getManagerSingleEmpDetailsJSON = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  logger.info("Getting Single Employee Details");

  const { month, year, company_id, employee_id, with_details } = req.query;

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

  if (!company_id || !employee_id || !month || !year) {
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

    // employee_data.net_pay =
    //   employee_data.salary_per_hour * employee_data.hours_present_in_month +
    //   employee_data.bonus;

    // employee_data.total_pay =
    //   employee_data.net_pay +
    //   employee_data.retirement_contributions +
    //   employee_data.disability_contributions +
    //   employee_data.healthcare_contributions +
    //   employee_data.income_tax;

    logger.info("gathered employee data correctly");
    return res.json(employee_data);
  } catch (err) {
    logger.error("gathering employee data failed");
    return res
      .status(500)
      .json({ error: "Error getting single employee details" });
  }
};

export const postUpdateEmployeePresentEarnings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  logger.info("Received employee present earnings update request");

  const update_dependency_map = new Map<string, string>();

  // update_dependency_map.set("salary_update", "salary_per_hour,bonus");
  // update_dependency_map.set("hours_update", "hours_change");

  const employee_id = req.params.employee_id;
  const { type, hours_change, salary, bonus } = req.body as {
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

  //TODO -> add transactions

  if (type == "salary_update") {
    try {
      await updatePresentMonthEmployeeSalary(employee_id, salary, logger);
      await updatePresentMonthEmployeeSalaryHistoryByBonus(
        employee_id,
        bonus,
        logger
      );

      return res.redirect(`/manager/single-emp-details/${employee_id}`);
    } catch (err) {
      logger.error(`Error updating present employee details: ${err}`);
      res.status(500);
      return next(new Error("Internal server error"));
    }
  }

  //TODO -> utilize this as update hours when employee request it
  // try {
  //   await updatePresentMonthEmployeeSalaryHistoryByHours(
  //     employee_id,
  //     hours_change,
  //     logger
  //   );

  //   return res.json({ success: true });
  // } catch (err) {
  //   logger.error(`Error updating present employee details: ${err}`);
  //   return res.status(500).json({ success: false });
  // }

  // if (!update_dependency_map.has(type)) {
  //   logger.error("Invalid type");
  //   return res.status(400).json({success: false, message: "Invalid type"});
  // }
};

//TODO -> utilize this also
// const updatePresentMonthEmployeeSalaryHistoryByHours = async (
//   employee_id: string,
//   hours_change: HoursChange,
//   logger: Logger
// ) => {
//   logger.info("Updating present employee details with given hours change");

//   const base_retirement_factor = `c.retirement_rate * e.salary_per_hour`;
//   const base_disability_factor = `c.disability_rate * e.salary_per_hour`;
//   const base_healthcare_factor = `c.healthcare_rate * e.salary_per_hour`;
//   const base_income_tax_factor = `c.income_tax_rate * e.salary_per_hour`;

//   try {
//     await AppDataSource.query(
//       `
//         UPDATE salary_history sh
//         SET days_worked = sh.days_worked + $1,
//         days_sick_leave = sh.days_sick_leave + $2,
//         days_vacation = sh.days_vacation + $3,
//         days_on_demand_leave = sh.days_on_demand_leave + $4
//         WHERE DATE_TRUNC('month', sh.period) = DATE_TRUNC('month', CURRENT_DATE)
//         AND sh."employeeId" = $5
//       `,
//       [
//         hours_change.day_worked,
//         hours_change.day_sick_leave,
//         hours_change.day_vacation,
//         hours_change.day_on_demand_leave,
//         employee_id,
//       ]
//     );
//   } catch (err) {
//     logger.error(`Error updating present employee details: ${err}`);
//     throw err;
//   }

//   try {
//     const [test] = await AppDataSource.query(
//       `SELECT bonus FROM salary_history WHERE "employeeId" = $1 AND period = DATE_TRUNC('month', CURRENT_DATE)`,
//       [employee_id]
//     );

//     const bonus = test.bonus;

//     await updatePresentMonthEmployeeSalaryHistoryByBonus(employee_id, bonus, logger);
//   } catch (error) {
//     logger.error(`Error updating present employee details: ${error}`);
//     throw error;
//   }
// };
const updatePresentMonthEmployeeSalary = async (
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

const updatePresentMonthEmployeeSalaryHistoryByBonus = async (
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

  try {
    logger.info(`Rendering manager raports`);
    return res.render("manager/raports", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: uid,
      nonce: res.locals.nonce,
      accountType: user.account_type,
      jrequestsPending: req.session.jrequests_pending,
    });
  } catch (err) {
    logger.error(`Error getting manager raports: ${err}`);
    res.status(500);
    return next(err);
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

  const user_repo = AppDataSource.getRepository(User);

  if (!req.session.user) {
    logger.error(`Session data not found`);
    res.status(400);
    return next(new Error("Session data not found"));
  }

  const { uid } = req.session.user;

  if (!uid) {
    logger.error(`Session data not found`);
    res.status(400);
    return next(new Error("Session data not found"));
  }

  if (req.session.user.account_type !== "manager") {
    logger.error(`User is not a manager`);
    res.status(403);
    return next(new Error("Unauthorized"));
  }

  let user;
  try {
    logger.info(`Getting user data`);
    user = await user_repo.findOneBy({ id: uid });
  } catch (error) {
    logger.error(`Error getting user data: ${error}`);
    res.status(500);
    return next(error);
  }

  if (!user) {
    logger.error(`User not found`);
    res.status(404);
    return next(new Error("User not found"));
  }

  const is_2fa_enabled = user.two_fa_secret ? true : false;

  const { error } = req.query;

  // TODO -> should pass company here
  if (error) {
    logger.warn(`Error happened before rendering settings page: ${error}`);
    return res.status(400).render("manager/settings", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: req.session.user.uid,
      user: user,
      is2faEnabled: is_2fa_enabled,
      nonce: res.locals.nonce,
      accountType: req.session.user.account_type,
      error: error,
      jrequestsPending: req.session.jrequests_pending,
    });
  }

  if (!req.session.user.company_id) {
    return res.status(200).render("manager/settings", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: req.session.user.uid,
      user: user,
      is2faEnabled: is_2fa_enabled,
      nonce: res.locals.nonce,
      accountType: req.session.user.account_type,
      error: null,
      company: null,
      jrequestsPending: req.session.jrequests_pending,
    });
  }

  let company;
  try {
    company = await AppDataSource.getRepository(Company).findOneBy({
      id: req.session.user.company_id as number,
    });

    company!.sick_leave_percent_factor =
      company!.sick_leave_percent_factor * 100;
    company!.vacation_percent_factor = company!.vacation_percent_factor * 100;
    company!.on_demand_percent_factor = company!.on_demand_percent_factor * 100;
    company!.retirement_rate = company!.retirement_rate * 100;
    company!.disability_rate = company!.disability_rate * 100;
    company!.healthcare_rate = company!.healthcare_rate * 100;
    company!.income_tax_rate = company!.income_tax_rate * 100;

    // company_to_return = {
    //   ...company,
    //   sick_leave_percent_factor: `${company!.sick_leave_percent_factor * 100}`,
    //   vacation_percent_factor: `${company!.vacation_percent_factor * 100}%`,
    //   on_demand_percent_factor: `${company!.on_demand_percent_factor * 100}%`,
    //   retirement_rate: `${company!.retirement_rate * 100}%`,
    //   disability_rate: `${company!.disability_rate * 100}%`,
    //   healthcare_rate: `${company!.healthcare_rate * 100}%`,
    //   income_tax_rate: `${company!.income_tax_rate * 100}%`,
    // };
  } catch (error) {
    logger.error(`Error getting company data: ${error}`);
    res.status(500);
    return next(error);
  }

  try {
    logger.info(`Rendering employee settings page`);
    res.render("manager/settings", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: req.session.user.uid,
      user: user,
      is2faEnabled: is_2fa_enabled,
      nonce: res.locals.nonce,
      accountType: req.session.user.account_type,
      error: null,
      company,
      jrequestsPending: req.session.jrequests_pending,
    });
  } catch (error) {
    logger.error(`Error rendering employee settings page: ${error}`);
    res.status(500);
    return next(error);
  }
};

export const postUpdateCompanySettings = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  logger.info(`Updating company settings`);

  const user = req.session.user;

  if (!user) {
    logger.error(`Session data not found`);
    res.status(400);
    return next(new Error("Session data not found"));
  }

  if (!user.company_id) {
    logger.error(`Company id not found`);
    res.status(400);
    return next(new Error("Company id not found"));
  }

  const company_id = user.company_id;

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
    await AppDataSource.getRepository(Company).update(company_id, {
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

  const user = req.session.user;

  if (!user) {
    logger.error(`Session data not found`);
    res.status(400);
    return next(new Error("Session data not found"));
  }

  if (user.account_type !== "manager") {
    logger.error(`User is not a manager`);
    res.status(403);
    return next(new Error("Unauthorized"));
  }

  const is_company_created = user.company_id ? true : false;

  if (is_company_created) {
    logger.error(`Company already created`);
    res.status(400);
    return next(new Error("Company already created"));
  }

  try {
    logger.info(`Rendering create company page`);
    return res.render("manager/create-company", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: user.uid,
      nonce: res.locals.nonce,
      accountType: "manager",
      jrequestsPending: req.session.jrequests_pending,
    });
  } catch (error) {
    logger.error(`Error rendering create company page: ${error}`);
    res.status(500);
    return next(error);
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

  const user = req.session.user;

  if (!user) {
    logger.error(`Session data not found`);
    res.status(400);
    return next(new Error("Session data not found"));
  }

  if (user.account_type !== "manager") {
    logger.error(`User is not a manager`);
    res.status(403);
    return next(new Error("Unauthorized"));
  }

  const is_company_created = user.company_id ? true : false;

  if (is_company_created) {
    logger.error(`Company already created`);
    res.status(400);
    return next(new Error("Company already created"));
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

  const does_company_exist = Boolean(
    await AppDataSource.getRepository(Company).findOneBy({ name })
  );

  if (does_company_exist) {
    logger.error(`Company already exists`);
    res.status(400);
    return next(new Error("Company already exists"));
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
      id: user.uid,
    });

    if (!user_from_db) {
      logger.error(`User not found`);
      res.status(404);
      return next(new Error("User not found"));
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
      manager: user_from_db!,
    });

    await company_repo.save(company);

    const new_company = await AppDataSource.getRepository(Company).findOneBy({
      name,
    });

    if (!new_company) {
      logger.error(`Newly created company not found`);
      res.status(404);
      return next(new Error("Newly created company not found"));
    }

    user_from_db.company = company;

    //Session user
    user.company_id = new_company.id;

    await AppDataSource.getRepository(User).save(user_from_db);

    logger.info(`Company created`);
    return res.redirect("/manager/settings");
  } catch (error) {
    logger.error(`Error creating company: ${error}`);
    res.status(500);
    return next(error);
  }
};

export const getManagerJoinRequests = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  logger.info(`Getting join requests`);

  const user = req.session.user;

  if (!user) {
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
      user.company_id,
    ]);

    logger.info(`Join requests gathered`);
  } catch (error) {
    logger.error(`Error getting join requests: ${error}`);
    res.status(500);
    return next(error);
  }

  try {
    return res.render("manager/join-requests", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: user.uid,
      nonce: res.locals.nonce,
      accountType: user.account_type,
      jrequestsPending: req.session.jrequests_pending,
      joinRequests: join_requests,
    });
  } catch (error) {
    logger.error(`Error getting join requests: ${error}`);
    res.status(500);
    return next(error);
  }
};

export const getManagerJoinRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  logger.info(`Getting join request`);

  const user = req.session.user;

  if (!user) {
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

  const uid = req.params.id;

  if (!uid) {
    logger.error(`Missing id`);
    res.status(400);
    return next(new Error("Missing id"));
  }

  let user_from_db;

  try {
    user_from_db = await AppDataSource.getRepository(User).findOneBy({
      id: Number(uid),
    });

    if (!user_from_db) {
      logger.error(`User not found`);
      res.status(404);
      return next(new Error("User not found"));
    }

    logger.info(`User found`);
  } catch (error) {
    logger.error(`Error getting user: ${error}`);
    res.status(500);
    return next(error);
  }

  try {
    return res.render("manager/join-request", {
      baseUrl: `${process.env.BASE_URL}`,
      loggedUser: user.uid,
      nonce: res.locals.nonce,
      accountType: user.account_type,
      jrequestsPending: req.session.jrequests_pending,
      user: user_from_db,
    });
  } catch (error) {
    logger.error(`Error getting join request: ${error}`);
    res.status(500);
    return next(error);
  }
};

export const postManagerJoinRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const logger: Logger = res.locals.logger;

  logger.info(`Handling join request`);

  const user = req.session.user;

  if (!user) {
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
      id: user.company_id,
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
    return next(error);
  }
};
