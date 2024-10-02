import path from "path";
import Express from "express";
import bodyParser from "body-parser";
import { employee_router as employee_routes } from "./routes/employee";
import {auth_router as auth_routes} from "./routes/auth";
import rateLimit from "express-rate-limit";
import { generateScriptNonce } from "./middlewares/generateScriptNonce";
import { customHelmet } from "./middlewares/customHelmet";
import { createLogger } from "./middlewares/createLogger";
import { startServer } from "./helpers/startServer";
import winston from "winston";
import * as dotenv from "dotenv";

dotenv.config();

const app = Express();

app.set("view engine", "ejs");
app.set("views", "views");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ["error"],
    }),
  ],
});

app.use(createLogger)

app.use(generateScriptNonce);

app.use(customHelmet)

app.set('trust proxy', 1); // trust only first proxy

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again after 15 minutes",
});

app.use(limiter);

app.use(bodyParser.urlencoded({ extended: false }));

const publicPath =
  process.env.NODE_ENVIRONMENT === "local"
    ? path.join(__dirname, "public")
    : path.join(__dirname, "../public");

app.use(
  Express.static(publicPath, {
    maxAge: "1y", //Cache static files for 1 year since they will not change
  })
);

// Will be needed probably
// app.use(
//   session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//     store: store,
//   })
// );

app.use(auth_routes);
app.use(employee_routes);

startServer(app, logger!);

// // Gracefully close the client when the application is shutting down
// process.on("SIGTERM", () => {
//   console.log("SIGTERM signal received: closing PostgreSQL client");
//   client.end(err => {
//     if (err) {
//       console.error("Error closing PostgreSQL client", err);
//     } else {
//       console.log("PostgreSQL client closed");
//     }
//     process.exit(err ? 1 : 0);
//   });
// });

// process.on("SIGINT", () => {
//   console.log("SIGINT signal received: closing PostgreSQL client");
//   client.end(err => {
//     if (err) {
//       console.error("Error closing PostgreSQL client", err);
//     } else {
//       console.log("PostgreSQL client closed");
//     }
//     process.exit(err ? 1 : 0);
//   });
// // });
