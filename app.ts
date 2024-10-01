import path from "path";
import Express, {Request, Response } from "express";
import bodyParser from "body-parser";
import { employee_router as employee_routes } from "./routes/employee";
import {auth_router as auth_routes} from "./routes/auth";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { generateScriptNonce } from "./middlewares/generateScriptNonce";
import { customHelmet } from "./middlewares/customHelmet";
import { createLogger } from "./middlewares/createLogger";
// import rateLimit from "express-rate-limit";

// const __filename = fileURLToPath(import.meta.url);

const app = Express();

app.set("view engine", "ejs");
app.set("views", "views");

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

try {
  app.listen(process.env.PORT || 3000);
} catch (error) {
  console.error(`Error starting server: ${error}`);
}

// // --------------------------------------------

// import express from "express";
// import { Client } from "pg";

// let client;

// if (process.env.NODE_ENVIRONMENT === 'local') {
//   client = new Client({
//     connectionString: process.env.DATABASE_URL,
//   })
// } else {
//   client = new Client({
//     connectionString: process.env.DATABASE_URL,
//     ssl: { rejectUnauthorized: false },
//   });
// }

// try {
//   client.connect();
// } catch (error) {
//   console.log(`problem connecting: ${error}`);
// }

// const app = express();
// const port = process.env.PORT || 3000;

// app.listen(port, () => {
//   console.log(
//     `Example app listening on port ${port} and env: ${process.env.NODE_ENVIRONMENT}`
//   );
// });

// app.get("/", (req, res) => {
//   client.query("SELECT * FROM pets;", (err, res) => {
//     if (err) throw err;
//     const pets = [];
//     for (let row of res.rows) {
//       // console.log(JSON.stringify(row));
//       pets.push(row);
//     }
//     console.log(pets);
//   });
//   res.send("Hello World!");
// });

// app.get("/create", (req, res) => {
//   client.query(
//     `CREATE TABLE pets (
//     id SERIAL PRIMARY KEY,         -- Automatycznie zwiększany identyfikator
//     name VARCHAR(100) NOT NULL,    -- Kolumna na nazwę o maksymalnej długości 100 znaków
//     description TEXT,              -- Kolumna na dłuższy tekst
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- Data utworzenia z domyślną wartością aktualnego czasu
// );
// `,
//     (err, res) => {
//       if (err) throw err;
//       console.log("Table created");
//     }
//   );
// });

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
