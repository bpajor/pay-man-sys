import path from "path";
import Express, { Application, NextFunction, Request, Response } from "express";
import bodyParser from "body-parser";
import { employee_router as employee_routes } from "./routes/employee";
import { auth_router as auth_routes } from "./routes/auth";
import { manager_router as manager_routes } from "./routes/manager";
import { api_router as api_routes } from "./routes/api";
import { user_router as user_routes } from "./routes/user";
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
import Tokens from "csrf";
import expressWinston from "express-winston";

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

    // app.use((req: Request, res: Response, next: NextFunction) => {
    //   res.locals.enable_csrf = false;

    //   return next();
    // })

    let redisClient = createClient({
      url: process.env.REDIS_TEMPORARY_URL,
      socket: {
        reconnectStrategy: (retries) => {
          const delay = Math.min(retries * 50, 2000);
          logger.warn(`Reconnecting to Redis in ${delay}ms`);
          return delay;
        },
      },
    });

    redisClient.on("error", (error) => {
      logger.error("Error in Redis client:", error);
    });

    redisClient.on("end", () => {
      logger.warn("Redis client disconnected");
    });

    redisClient.on("connect", () => {
      logger.info("Connected to Redis");
    });

    try {
      await redisClient.connect();
    } catch (error) {
      logger.error("Error connecting to Redis:", error);
      process.exit(1);
    }

    // Pass redis to request
    app.use((req: Request, res: Response, next: NextFunction) => {
      res.locals.redisClient = redisClient;
      next();
    });

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
          // maxAge: 1000 * 60 * 60 * 24, // 1 dzień
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

    app.get(
      "/css/:account_type/*",
      (req: Express.Request, res: Express.Response, next: NextFunction) => {
        console.log("In middleware");
        let account_type;
        if (req.session.user) {
          account_type = req.session.user.account_type;
        }

        const is_css_route = req.path.startsWith("/css");

        if (is_css_route) {
          const acc_type_from_path = req.path.split("/")[2];

          if (["manager", "employee"].includes(acc_type_from_path)) {
            if (acc_type_from_path !== account_type) {
              logger.error("Unauthorized access to CSS file");
              res.status(403);
              return next(new Error("Unauthorized"));
            }
            return next();
          }

          // if (acc_type_from_path === "common") {
          //   if (!account_type) {
          //     logger.error("Unauthorized access to CSS file");
          //   res.status(403);
          //   return next(new Error("Unauthorized"));
          //   }
          // }

          return next();
        }

        return next();
      }
    );

    const publicPath =
      process.env.NODE_ENVIRONMENT === "local"
        ? path.join(__dirname, "public")
        : path.join(__dirname, "../public");

    app.use(
      Express.static(publicPath, {
        maxAge: process.env.NODE_ENVIRONMENT === "local" ? undefined : "1y", //Cache static files for 1 year since they will not change
      })
    );

    app.get("/temp-error", (req, res) => {
      const code = 500;
      const message = "Internal server error. Please try again later.";
      res.status(code).render("error/error", {
        code: code,
        message: message,
      });
    });

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

    // express-winston logger makes sense BEFORE the router
    app.use(
      expressWinston.logger({
        transports: [new winston.transports.Console()],
        format: winston.format.combine(winston.format.json()),
        requestFilter: (req, propName) => {
          if (propName === "headers") {
            // Maskowanie ciasteczek - pozostawienie tylko connect.sid
            if (req.headers.cookie) {
              req.headers.cookie = req.headers.cookie
                .split(";")
                .filter((cookie) => cookie.trim().startsWith("connect.sid="))
                .map(() => "connect.sid=****")
                .join("; ");
            }
        
            // Maskowanie innych nagłówków
            const headersToMask = ["authorization", "x-api-key", "referer"];
            headersToMask.forEach(header => {
              if (req.headers[header]) {
                req.headers[header] = "****";
              }
            });
          }
          return req[propName];
        }
        
      })
    );

    app.use(auth_routes);
    app.use(employee_routes);
    app.use(manager_routes);
    app.use(api_routes);
    app.use(user_routes);

    app.use(
      expressWinston.errorLogger({
        transports: [new winston.transports.Console()],
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.json()
        ),
      })
    );

    // Obsługa błędu 404 - nieznaleziono strony
    app.use((req: Request, res: Response) => {
      let csrf_token;
      if (req.session.not_authenticated_csrf_secret) {
        csrf_token = new Tokens().create(
          req.session.not_authenticated_csrf_secret
        );
      } else if (req.session.csrf_secret) {
        csrf_token = new Tokens().create(req.session.csrf_secret);
      } else {
        req.session.not_authenticated_csrf_secret = new Tokens().secretSync();
        csrf_token = new Tokens().create(
          req.session.not_authenticated_csrf_secret
        );
      }

      res.status(404).render("error/error", {
        code: 404,
        message: "Page not found. Please check the URL and try again.",
        baseUrl: `${process.env.BASE_URL}`,
        loggedUser: req.session.user ? req.session.user.uid : null,
        accountType: req.session.user ? req.session.user.account_type : null,
        csrfToken: csrf_token,
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

      let csrf_token;
      if (req.session.not_authenticated_csrf_secret) {
        csrf_token = new Tokens().create(
          req.session.not_authenticated_csrf_secret
        );
      } else if (req.session.csrf_secret) {
        csrf_token = new Tokens().create(req.session.csrf_secret);
      } else {
        req.session.not_authenticated_csrf_secret = new Tokens().secretSync();
        csrf_token = new Tokens().create(
          req.session.not_authenticated_csrf_secret
        );
      }

      res.status(statusCode).render("error/error", {
        code: statusCode,
        message: errorMessage,
        baseUrl: `${process.env.BASE_URL}`,
        loggedUser: req.session.user ? req.session.user.uid : null,
        accountType: req.session.user ? req.session.user.account_type : null,
        csrfToken: csrf_token,
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
