import path from "path";
import Express, { NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";
import { employee_router as employee_routes } from "./routes/employee";
import { auth_router as auth_routes } from "./routes/auth";
import rateLimit from "express-rate-limit";
import { generateScriptNonce } from "./middlewares/generateScriptNonce";
import { customHelmet } from "./middlewares/customHelmet";
import { createLogger } from "./middlewares/createLogger";
import { startServer } from "./helpers/startServer";
import winston from "winston";
import * as dotenv from "dotenv";
import { AppDataSource } from "./data-source";
import connectRedis from "connect-redis";
import session from "express-session";
import { createClient } from "redis";
import RedisStore from "connect-redis";

dotenv.config();

const app = Express();

app.set("view engine", "ejs");
app.set("views", "views");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(winston.format.json()),
  transports: [
    new winston.transports.Console({
      stderrLevels: ["error"],
    }),
  ],
});

AppDataSource.initialize()
  .then(async (client) => {
    logger.info("Connection with db established successfully");

    // Pass logger to middlewares
    app.use(createLogger);

    let redisClient = createClient({
      url: process.env.REDIS_URL,
    });

    await redisClient.connect();

    let redisStore = new RedisStore({
      client: redisClient,
    });

    if (!process.env.SESSION_SECRET) {
      logger.error("SESSION_SECRET is not defined in .env file");
      process.exit(1);
    }

    const session_secret_array = process.env.SESSION_SECRET.split("|||");

    app.use(
      session({
        store: redisStore,
        secret: session_secret_array,
        resave: false,
        saveUninitialized: false,
        cookie: {
          secure: process.env.NODE_ENVIRONMENT !== "local", // HTTPS w produkcji
          httpOnly: true,
          maxAge: 1000 * 60 * 60 * 24, // 1 dzień
          sameSite: "strict",
        },
      })
    );

    // Prevent cookie jar overflow attack
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (!req.cookies) {
        return next();
      }
      const cookies = Object.keys(req.cookies);
      if (cookies.length < 25) {
        next();
      }
      logger.error(
        `Too many cookies (${cookies.length}) in request: ${req.originalUrl}`
      );
      res.status(400).send("Too many cookies in request");
    });

    logger.info("Session middleware initialized");

    app.use(generateScriptNonce);

    app.use(customHelmet);

    app.set("trust proxy", 1); // trust only first proxy

    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      limit: 100, // limit each IP to 100 requests per windowMs
      message:
        "Too many requests from this IP, please try again after 15 minutes",
    });

    app.use(limiter);

    app.use(bodyParser.urlencoded({ extended: false }));

    app.use(Express.json());

    const publicPath =
      process.env.NODE_ENVIRONMENT === "local"
        ? path.join(__dirname, "public")
        : path.join(__dirname, "../public");

    app.use(
      Express.static(publicPath, {
        maxAge: "1y", //Cache static files for 1 year since they will not change
      })
    );

    app.get("/temp-error", (req, res) => {
      const code = 500;
      const message = "Internal server error. Please try again later.";
      res.status(code).render("error/error", {
        code: code,
        message: message,
      });
    })

    // app.get("/set-session", (req, res) => {
    //   // Ustawienie danych sesji
    //   // TODO ts-node throws error - probably it cant see types.d.ts
    //   req.session.username = "TestUser";
    //   res.send("Session set with username: TestUser");
    // });

    // app.get("/get-session", (req, res) => {
    //   // Sprawdzenie, czy dane sesji istnieją
    //   if (req.session.username) {
    //     res.send(`Session found with username: ${req.session.username}`);
    //   } else {
    //     res.send("No session found");
    //   }
    // });

    app.use(auth_routes);
    app.use(employee_routes);

    // Obsługa błędu 404 - nieznaleziono strony
    app.use((req: Request, res: Response) => {
      res.status(404).render("error/error", {
        code: 404,
        message: "Page not found. Please check the URL and try again.",
      });
    });

    // Middleware obsługi błędów - 4xx, 5xx
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error(`Error: ${err.message}`, { error: err });

      const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
      const errorMessage =
        statusCode === 500
          ? "Internal server error. Please try again later."
          : err.message;

      res.status(statusCode).render("error/error", {
        code: statusCode,
        message: errorMessage,
      });
    });

    startServer(app, logger!);
  })
  .catch((error) => {
    logger.error("Error connecting to the database:", error);
    process.exit(1);
  });

// app.use(createLogger)

// app.use(generateScriptNonce);

// app.use(customHelmet)

// app.set('trust proxy', 1); // trust only first proxy

// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   limit: 100, // limit each IP to 100 requests per windowMs
//   message: "Too many requests from this IP, please try again after 15 minutes",
// });

// app.use(limiter);

// app.use(bodyParser.urlencoded({ extended: false }));

// const publicPath =
//   process.env.NODE_ENVIRONMENT === "local"
//     ? path.join(__dirname, "public")
//     : path.join(__dirname, "../public");

// app.use(
//   Express.static(publicPath, {
//     maxAge: "1y", //Cache static files for 1 year since they will not change
//   })
// );

// // Will be needed probably
// // app.use(
// //   session({
// //     secret: process.env.SESSION_SECRET,
// //     resave: false,
// //     saveUninitialized: false,
// //     store: store,
// //   })
// // );

// app.use(auth_routes);
// app.use(employee_routes);

// startServer(app, logger!);

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
