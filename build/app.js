<<<<<<< Updated upstream
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const pg_1 = require("pg");
let client;
if (process.env.NODE_ENVIRONMENT === 'local') {
    client = new pg_1.Client({
        connectionString: process.env.DATABASE_URL,
    });
}
else {
    client = new pg_1.Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });
}
=======
import path from "path";
import { fileURLToPath } from "url";
import Express from "express";
import bodyParser from "body-parser";
import { employee_router as employee_routes } from "./routes/employee.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = Express();
app.set("view engine", "ejs");
app.set("views", "views");
app.use(bodyParser.urlencoded({ extended: false }));
const publicPath = process.env.NODE_ENVIRONMENT === "local"
    ? path.join(__dirname, "public")
    : path.join(__dirname, "dist", "../public");
app.use(Express.static(publicPath));
// Will be needed probably
// app.use(
//   session({
//     secret: process.env.SESSION_SECRET,
//     resave: false,
//     saveUninitialized: false,
//     store: store,
//   })
// );
app.use(employee_routes);
>>>>>>> Stashed changes
try {
    client.connect();
}
catch (error) {
    console.log(`problem connecting: ${error}`);
}
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Example app listening on port ${port} and env: ${process.env.NODE_ENVIRONMENT}`);
});
app.get("/", (req, res) => {
    client.query("SELECT * FROM pets;", (err, res) => {
        if (err)
            throw err;
        const pets = [];
        for (let row of res.rows) {
            // console.log(JSON.stringify(row));
            pets.push(row);
        }
        console.log(pets);
    });
    res.send("Hello World!");
});
app.get("/create", (req, res) => {
    client.query(`CREATE TABLE pets (
    id SERIAL PRIMARY KEY,         -- Automatycznie zwiększany identyfikator
    name VARCHAR(100) NOT NULL,    -- Kolumna na nazwę o maksymalnej długości 100 znaków
    description TEXT,              -- Kolumna na dłuższy tekst
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- Data utworzenia z domyślną wartością aktualnego czasu
);
`, (err, res) => {
        if (err)
            throw err;
        console.log("Table created");
    });
});
// Gracefully close the client when the application is shutting down
process.on("SIGTERM", () => {
    console.log("SIGTERM signal received: closing PostgreSQL client");
    client.end(err => {
        if (err) {
            console.error("Error closing PostgreSQL client", err);
        }
        else {
            console.log("PostgreSQL client closed");
        }
        process.exit(err ? 1 : 0);
    });
});
process.on("SIGINT", () => {
    console.log("SIGINT signal received: closing PostgreSQL client");
    client.end(err => {
        if (err) {
            console.error("Error closing PostgreSQL client", err);
        }
        else {
            console.log("PostgreSQL client closed");
        }
        process.exit(err ? 1 : 0);
    });
});
