import { ExpensesResponse, HoursWorkedResult } from "../api";

export const translateHoursWorkedResults = (results: HoursWorkedResult[]) => {
  const arr_to_return = [];
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  for (const result of results) {
    arr_to_return.push({
      month: monthNames[result.period_month.getMonth()],
      total_hours_worked: result.total_hours_worked,
    });
  }

  return arr_to_return;
};

export const translateExpensesResults = (
  results: ExpensesResponse
): ExpensesResponse & { net_without_bonus_pay: number } => {
  let net_without_bonus_pay = 0;
  results.total_bonuses = Number(results.total_bonuses);
  results.total_contributions = Number(results.total_contributions);
  results.total_salary = Number(results.total_salary);

  if (
    results.total_salary !== null &&
    results.total_contributions !== null &&
    results.total_bonuses !== null
  ) {
    net_without_bonus_pay =
      results.total_salary -
      results.total_contributions -
      results.total_bonuses;
    net_without_bonus_pay = Number(net_without_bonus_pay.toFixed(2));
  }

  const result_to_return: ExpensesResponse & { net_without_bonus_pay: number } =
    {
      total_contributions: results.total_contributions ?? 0,
      total_salary: results.total_salary ?? 0,
      total_bonuses: results.total_bonuses ?? 0,
      net_without_bonus_pay: net_without_bonus_pay,
    };

  if (results.month) {
    result_to_return["month"] = results.month;
  }

  return result_to_return;
};
