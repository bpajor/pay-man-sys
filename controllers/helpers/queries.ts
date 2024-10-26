export const ALL_EMPLOYEES_EARNINGS = `
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

export const HOURS_WORKED_IN_COMPANY_BY_YEAR = `
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

export const AVERAGE_SALARY_AND_BONUSES_PER_YEAR = `
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

export const ALL_EARNINGS_DETAILS_PER_YEAR = `
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

export const ALL_EMPLOYEE_EARNINGS_DETAILS_PER_YEAR = `
    SELECT 
  TO_CHAR(months.month, 'FMMonth') AS month_name,  -- Nazwa miesiąca bez dodatkowych spacji
  COALESCE(SUM(
    sh.salary_per_hour * c.hours_per_day * (
      sh.days_worked + 
      sh.days_vacation * c.vacation_percent_factor + 
      sh.days_sick_leave * c.sick_leave_percent_factor + 
      sh.days_on_demand_leave * c.on_demand_percent_factor
    ) + sh.bonus
  ), 0) AS total_salary,
  COALESCE(sh.retirement_contributions, 0) as retirement_contributions,
  COALESCE(sh.disability_contributions, 0) as disability_contributions,
  COALESCE(sh.healthcare_contributions, 0) as healthcare_contributions,
  COALESCE(sh.income_tax, 0) as income_tax,
  COALESCE(sh.bonus, 0) as bonus
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
  months.month, sh.retirement_contributions, sh.disability_contributions, sh.healthcare_contributions, sh.income_tax, sh.bonus
ORDER BY 
  months.month;
`;
