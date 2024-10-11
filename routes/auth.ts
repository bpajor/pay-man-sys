import { Application, Router } from "express";
import { getLogin, getSignup, postSignup } from "../controllers/auth";
import { body } from "express-validator";

const postSignupValidators = [
  body("name")
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
      return value
        .split(" ")
        .map(
          (word: string) =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ");
    }),
  body("last_name")
    .exists()
    .withMessage("Last name is required")
    .isString()
    .withMessage("Last name must be a string")
    .isLength({ min: 2, max: 50 })
    .withMessage("Last name must be between 2 and 50 characters")
    .matches(/^[A-Za-zÀ-ÖØ-öø-ÿĀ-žḀ-ỿ'’\- ]+$/)
    .withMessage("Last name in an invalid format")
    .trim()
    .escape()
    .customSanitizer((value) => {
      return value
        .split(" ")
        .map(
          (word: string) =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ");
    }),
  body("email")
    .exists()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Email is invalid")
    .isLength({ max: 254 })
    .normalizeEmail(),
  body(["password", "confirm_password"])
    .exists()
    .withMessage("Password is required")
    .isString()
    .withMessage("Password must be a string")
    .isLength({ min: 15, max: 255 })
    .withMessage("Password must be between 15 and 255 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character"
    )
    .trim(),
  body("account_type")
    .exists()
    .withMessage("Account type is required")
    .isString()
    .withMessage("Account type must be a string")
    .isIn(["employee", "manager"])
    .withMessage("Account type must be either employee or manager"),
];

export const auth_router = Router();

auth_router.get("/login", getLogin);

auth_router.get("/signup", getSignup);

// Use Application type to avoid ts complaints
auth_router.post("/signup", postSignupValidators, postSignup as Application);
