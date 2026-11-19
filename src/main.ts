import { run } from "./server";

// Both apps run in this one process/container, on separate ports.
const apps = [
  run({
    title: "Land & Air Animals",
    table: "observations_land_air",
    port: Number(process.env.LAND_AIR_PORT ?? 8001),
  }),
  run({
    title: "Sea Animals",
    table: "observations_sea",
    port: Number(process.env.SEA_PORT ?? 8002),
  }),
];

const shutdown = (signal: string) => {
  console.log(`${signal} received; shutting down...`);
  // Force shutdown if existing connections do not close.
  setTimeout(() => process.exit(1), 10000).unref();
  void Promise.all(apps.map((stop) => stop())).then(() => process.exit(0));
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
