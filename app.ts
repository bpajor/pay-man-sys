import express from "express";
import { Client } from "pg";

let client;

if (process.env.NODE_ENVIRONMENT === 'local') {
  client = new Client({
    connectionString: process.env.DATABASE_URL,
  })
} else {
  client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

try {
  client.connect();
} catch (error) {
  console.log(`problem connecting: ${error}`);
}

const app = express();
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(
    `Example app listening on port ${port} and env: ${process.env.NODE_ENVIRONMENT}`
  );
});

app.get("/", (req, res) => {
  client.query("SELECT * FROM pets;", (err, res) => {
    if (err) throw err;
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
  client.query(
    `CREATE TABLE pets (
    id SERIAL PRIMARY KEY,         -- Automatycznie zwiększany identyfikator
    name VARCHAR(100) NOT NULL,    -- Kolumna na nazwę o maksymalnej długości 100 znaków
    description TEXT,              -- Kolumna na dłuższy tekst
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- Data utworzenia z domyślną wartością aktualnego czasu
);
`,
    (err, res) => {
      if (err) throw err;
      console.log("Table created");
    }
  );
});

// Gracefully close the client when the application is shutting down
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing PostgreSQL client");
  client.end(err => {
    if (err) {
      console.error("Error closing PostgreSQL client", err);
    } else {
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
    } else {
      console.log("PostgreSQL client closed");
    }
    process.exit(err ? 1 : 0);
  });
});
