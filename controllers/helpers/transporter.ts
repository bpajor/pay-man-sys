import nodemailer from "nodemailer";

import * as dotenv from "dotenv";

dotenv.config();

export const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  auth: {
    user: process.env.GMAIL_EMAIL,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export const getAllowedHosts = () => {
  const allowed_hosts = [
    "pay-man-sys-dev-446440bbf36f.herokuapp.com",
    "paymansys.org",
  ];

  if (process.env.NODE_ENVIRONMENT === "local") {
    allowed_hosts.push(process.env.BASE_URL!.split("//")[1]);
  }

  return allowed_hosts;
};
