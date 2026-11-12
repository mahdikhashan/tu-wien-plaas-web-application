
import express from "express";
import pg from "pg";
import path from "node:path";
import os from "node:os";
import { readFile } from "node:fs/promises";

const app = express();
const port = Number(process.env.PORT ?? 8000);
const hostname = os.hostname();

const pool = new pg.Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 5,
  connectionTimeoutMillis: 5000,
});

// Without this, an idle client dropped by a DB restart crashes the process.
pool.on("error", (error) => console.error("Idle DB client error:", error));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

app.use(express.urlencoded({ extended: false, limit: "10kb" }));

app.get("/", async (_req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT id, animal, stream, observed_at, notes
      FROM observations
      ORDER BY observed_at DESC, id DESC
    `);

    const observations = result.rows.map((row) => ({
      ...row,
      observed_at:
        new Date(row.observed_at)
          .toISOString()
          .replace("T", " ")
          .slice(0, 19) + " UTC",
    }));

    // Default for the datetime-local field: current UTC time, YYYY-MM-DDTHH:mm.
    const now = new Date().toISOString().slice(0, 16);

    res.render("index", { observations, now, hostname });
  } catch (error) {
    next(error);
  }
});

app.post("/observations", async (req, res, next) => {
  try {
    const animal =
      typeof req.body.animal === "string" ? req.body.animal.trim() : "";

    const stream =
      typeof req.body.stream === "string" ? req.body.stream.trim() : "";

    const observedAt =
      typeof req.body.observed_at === "string"
        ? req.body.observed_at.trim()
        : "";

    const notes =
      typeof req.body.notes === "string" ? req.body.notes.trim() : "";

    // Validate required fields and maximum lengths.
    if (
      !animal ||
      animal.length > 200 ||
      !stream ||
      stream.length > 500 ||
      notes.length > 2000
    ) {
      return res.status(400).send("Invalid observation data.");
    }

    // datetime-local format: YYYY-MM-DDTHH:mm
    // Interpret the submitted date and time as UTC.
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(observedAt)) {
      return res.status(400).send("Invalid observation date and time.");
    }

    const parsedDate = new Date(`${observedAt}:00Z`);

    // Reject invalid dates, including impossible calendar dates.
    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 16) !== observedAt
    ) {
      return res.status(400).send("Invalid observation date and time.");
    }

    // Use parameterized SQL to prevent SQL injection.
    await pool.query(
      `INSERT INTO observations (animal, stream, observed_at, notes)
       VALUES ($1, $2, $3, $4)`,
      [animal, stream, parsedDate.toISOString(), notes || null],
    );

    return res.redirect(303, "/");
  } catch (error) {
    next(error);
  }
});

app.get("/heartbeat", (_req, res) => {
  res.status(200).type("text/plain").send("OK");
});

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Request failed:", error);
    res.status(500).send("Internal server error.");
  },
);

// Retry until the DB is reachable: 1s, 2s, 4s ... capped at 30s.
async function initSchema(schema: string) {
  for (let attempt = 1; ; attempt++) {
    try {
      await pool.query(schema);
      console.log("Database schema ready.");
      return;
    } catch (error) {
      const delay = Math.min(1000 * 2 ** (attempt - 1), 30000);
      console.error(
        `Database not ready (attempt ${attempt}): ${(error as Error).message}; retrying in ${delay / 1000}s`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

async function main() {
  const schemaPath = path.join(__dirname, "schema.sql");
  const schema = await readFile(schemaPath, "utf8");

  // Listen first so SIGTERM is handled even while waiting for the DB.
  // Until the schema exists, GET / fails and Traefik keeps the replica out.
  const server = app.listen(port, "0.0.0.0", () => {
    console.log(`NERDS uc Wild Cam app listening on port ${port}`);
  });

  // Gracefully shut down when Docker stops the container.
  const shutdown = (signal: string) => {
    console.log(`${signal} received; shutting down...`);

    server.close(() => {
      void pool.end().then(() => {
        process.exit(0);
      });
    });

    // Force shutdown if existing connections do not close.
    setTimeout(() => process.exit(1), 10000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  await initSchema(schema);
}

main().catch(async (error: unknown) => {
  console.error("Failed to start application:", error);
  await pool.end();
  process.exit(1);
});
