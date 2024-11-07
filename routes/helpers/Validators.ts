import { body } from "express-validator";
import xss from "xss";

export const validators = {
  name: body("name")
    .exists()
    .withMessage("Name is required")
    .isString()
    .withMessage("Name must be a string")
    .isLength({ min: 2, max: 50 })
    .withMessage("Name must be between 2 and 50 characters")
    .matches(/^[A-Za-zÀ-ÖØ-öø-ÿĀ-žḀ-ỿ'’\- ]+$/)
    .withMessage("Name in an invalid format")
    .trim()
    .escape()
    .customSanitizer((value) => {
      return xss(value);
    }),
  last_name: body("last_name")
    .exists()
    .withMessage("Last Name is required")
    .isString()
    .withMessage("Last Name must be a string")
    .isLength({ min: 2, max: 50 })
    .withMessage("Last Name must be between 2 and 50 characters")
    .matches(/^[A-Za-zÀ-ÖØ-öø-ÿĀ-žḀ-ỿ'’\- ]+$/)
    .withMessage("Last Name in an invalid format")
    .trim()
    .escape()
    .customSanitizer((value) => {
      return xss(value);
    }),
  email: body("email")
    .exists()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email is invalid")
    .isLength({ max: 254 })
    .normalizeEmail()
    .customSanitizer((value) => {
      return xss(value);
    }),
  phone_number: body("phone_number")
    .exists()
    .withMessage("Phone number is required")
    .isMobilePhone("any")
    .withMessage("Phone number is invalid")
    .customSanitizer((value) => {
      return xss(value);
    }),
  phone: body("phone")
    .exists()
    .withMessage("Phone number is required")
    .isMobilePhone("any")
    .withMessage("Phone number is invalid")
    .customSanitizer((value) => {
      return xss(value);
    }),
  home_address: body("home_address")
    .exists()
    .withMessage("Home address is required")
    .isString()
    .withMessage("Home address must be a string")
    .isLength({ min: 5, max: 255 })
    .withMessage("Home address must be between 5 and 255 characters")
    .matches(/^[a-zA-ZÀ-ž0-9\s,./-]*$/)
    .withMessage("Home address contains invalid characters")
    .trim()
    .escape()
    .customSanitizer((value) => {
      // Konfiguracja xss bez kodowania HTML
      return xss(value, {
        whiteList: {}, // Usuwa wszystkie znaczniki HTML
        stripIgnoreTag: true, // Usuwa nieznane znaczniki HTML
        stripIgnoreTagBody: ["script"], // Usuwa zawartość tagów <script>
        escapeHtml: (html) => html, // Pomija automatyczne kodowanie HTML
      });
    }),
  address: body("address")
    .exists()
    .withMessage("Address is required")
    .isString()
    .withMessage("Address must be a string")
    .isLength({ min: 5, max: 255 })
    .withMessage("Address must be between 5 and 255 characters")
    .matches(/^[a-zA-ZÀ-ž0-9\s,./-]*$/)
    .withMessage("Address contains invalid characters")
    .trim()
    .escape()
    .customSanitizer((value) => {
      // Konfiguracja xss bez kodowania HTML
      return xss(value, {
        whiteList: {}, // Usuwa wszystkie znaczniki HTML
        stripIgnoreTag: true, // Usuwa nieznane znaczniki HTML
        stripIgnoreTagBody: ["script"], // Usuwa zawartość tagów <script>
        escapeHtml: (html) => html, // Pomija automatyczne kodowanie HTML
      });
    }),
  date_of_birth: body("date_of_birth")
    .exists()
    .withMessage("Date of birth is required")
    .isDate()
    .withMessage("Date of birth is invalid")
    .customSanitizer((value) => {
      return value.replace(/<\/?[^>]+(>|$)/g, "");
    }),
  daily_hours: body("hours_per_day")
    .exists()
    .withMessage("Daily hours are required")
    .isNumeric()
    .withMessage("Daily hours must be a number")
    .isInt({ min: 1, max: 12 })
    .withMessage("Daily hours must be between 1 and 12")
    .customSanitizer((value) => {
      return xss(value);
    }),
  sick_leave_percent_factor: body("sick_leave_percent_factor")
    .exists()
    .withMessage("Sick leave percent factor is required")
    .isNumeric()
    .withMessage("Sick leave percent factor must be a number")
    .isInt({ min: 1, max: 100 })
    .withMessage("Sick leave percent factor must be between 1 and 100")
    .customSanitizer((value) => {
      return xss(value);
    }),
  vacation_percent_factor: body("vacation_percent_factor")
    .exists()
    .withMessage("Vacation percent factor is required")
    .isNumeric()
    .withMessage("Vacation percent factor must be a number")
    .isInt({ min: 1, max: 100 })
    .withMessage("Vacation percent factor must be between 1 and 100")
    .customSanitizer((value) => {
      return xss(value);
    }),
  on_demand_percent_factor: body("on_demand_percent_factor")
    .exists()
    .withMessage("On demand percent factor is required")
    .isNumeric()
    .withMessage("On demand percent factor must be a number")
    .isInt({ min: 1, max: 100 })
    .withMessage("On demand percent factor must be between 1 and 100")
    .customSanitizer((value) => {
      return xss(value);
    }),
  retirement_rate: body("retirement_rate")
    .exists()
    .withMessage("Retirement rate is required")
    .isNumeric()
    .withMessage("Retirement rate must be a number")
    .isInt({ min: 1, max: 50 })
    .withMessage("Retirement rate must be between 1 and 50")
    .customSanitizer((value) => {
      return xss(value);
    }),
  disability_rate: body("disability_rate")
    .exists()
    .withMessage("Disability rate is required")
    .isNumeric()
    .withMessage("Disability rate must be a number")
    .isInt({ min: 1, max: 50 })
    .withMessage("Disability rate must be between 1 and 50")
    .customSanitizer((value) => {
      return xss(value);
    }),
  healthcare_rate: body("healthcare_rate")
    .exists()
    .withMessage("Healthcare rate is required")
    .isNumeric()
    .withMessage("Healthcare rate must be a number")
    .isInt({ min: 1, max: 50 })
    .withMessage("Healthcare rate must be between 1 and 50")
    .customSanitizer((value) => {
      return xss(value);
    }),
  income_tax_rate: body("income_tax_rate")
    .exists()
    .withMessage("Income tax rate is required")
    .isNumeric()
    .withMessage("Income tax rate must be a number")
    .isInt({ min: 1, max: 50 })
    .withMessage("Income tax rate must be between 1 and 50")
    .customSanitizer((value) => {
      return xss(value);
    }),
  max_days_per_month: body("max_days_per_month")
    .exists()
    .withMessage("Max days per month are required")
    .isNumeric()
    .withMessage("Max days per month must be a number")
    .isInt({ min: 1, max: 31 })
    .withMessage("Max days per month must be between 1 and 31")
    .customSanitizer((value) => {
      return xss(value);
    }),
  salary: body("salary")
    .exists()
    .withMessage("Salary is required")
    .isNumeric()
    .withMessage("Salary must be a number")
    .isFloat({ min: 1, max: 1000000 })
    .withMessage("Salary must be between 1 and 1000000")
    .customSanitizer((value) => {
      return xss(value);
    }),
  hi_number: body("hi_number")
    .exists()
    .withMessage("Health insurance number is required")
    .isNumeric()
    .withMessage("Health insurance number must be a number")
    .isLength({ min: 6, max: 20 })
    .withMessage("Health insurance number must be between 6 and 20 characters")
    .customSanitizer((value) => {
      return xss(value);
    }),
  hi_provider: body("hi_provider")
    .exists()
    .withMessage("Health insurance provider is required")
    .isString()
    .withMessage("Health insurance provider must be a string")
    .isLength({ min: 2, max: 50 })
    .withMessage("Health insurance provider must be between 2 and 50 characters")
    .matches(/^[A-Za-zÀ-ÖØ-öø-ÿĀ-žḀ-ỿ'’\- ]+$/)
    .withMessage("Health insurance provider in an invalid format")
    .trim()
    .escape()
    .customSanitizer((value) => {
      return xss(value);
    }),
  exp_date: body("exp_date")
    .exists()
    .withMessage("Expiration date is required")
    .isDate()
    .withMessage("Expiration date is invalid")
    .customSanitizer((value) => {
      return value.replace(/<\/?[^>]+(>|$)/g, "");
    }),
  notes: body("notes")
    .isString()
    .withMessage("Notes must be a string")
    .isLength({ max: 255 })
    .withMessage("Notes must be less than 255 characters")
    .trim()
    .escape()
    .customSanitizer((value) => {
      return xss(value);
    }),
  type: body("type")
    .exists()
    .withMessage("Type is required")
    .isString()
    .withMessage("Type must be a string")
    .isIn(["salary_update", "hours_change"])
    .withMessage("Invalid type")
    .customSanitizer((value) => {
      return xss(value);
    }),
  bonus: body("bonus")
    .exists()
    .withMessage("Bonus is required")
    .isNumeric()
    .withMessage("Bonus must be a number")
    .isInt({ min: 1, max: 1000000 })
    .withMessage("Bonus must be between 1 and 1000000")
    .customSanitizer((value) => {
      return xss(value);
    }),
    attendance_type: body("attendance_type")
    .exists()
    .withMessage("Attendance type is required")
    .isString()
    .withMessage("Attendance type must be a string")
    .isIn(["normal", "sick", "vacation", "on_demand"])
    .withMessage("Invalid attendance type")
    .customSanitizer((value) => {
      return xss(value);
    }),
    company_name: body("company_name")
    .exists()
    .withMessage("Company name is required")
    .isString()
    .withMessage("Company name must be a string")
    .isLength({ min: 2, max: 50 })
    .withMessage("Company name must be between 2 and 50 characters")
    .matches(/^[A-Za-zÀ-ÖØ-öø-ÿĀ-žḀ-ỿ'’\- ]+$/)
    .withMessage("Company name in an invalid format")
    .trim()
    .escape()
    .customSanitizer((value) => {
      return xss(value);
    }),
};
