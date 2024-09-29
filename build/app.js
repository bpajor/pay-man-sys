"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const express_1 = __importDefault(require("express"));
const body_parser_1 = __importDefault(require("body-parser"));
const employee_1 = require("./routes/employee");
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// import rateLimit from "express-rate-limit";
// const __filename = fileURLToPath(import.meta.url);
console.log(__filename);
const app = (0, express_1.default)();
app.set("view engine", "ejs");
app.set("views", "views");
app.use((0, helmet_1.default)()); //Set security headers
const limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again after 15 minutes",
});
app.use(limiter);
app.use(body_parser_1.default.urlencoded({ extended: false }));
const publicPath = process.env.NODE_ENVIRONMENT === "local"
    ? path_1.default.join(__dirname, "public")
    : path_1.default.join(__dirname, "../public");
app.use(express_1.default.static(publicPath, {
    maxAge: "1y", //Cache static files for 1 year since they will not change
}));
// Will be needed probably
// app.use(
//   session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//     store: store,
//   })
// );
app.use(employee_1.employee_router);
try {
    app.listen(process.env.PORT || 3000);
}
catch (error) {
    console.log(`problem connecting: ${error}`);
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
