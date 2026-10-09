import { logger } from "./lib/logger";
import app from "./app";
import { registerRoutes } from "./routes";
import { serveWebApp } from "./static";
import { startConversionCleanup } from "./lib/conversionRetention";

if (!process.env.REPLICATE_API_TOKEN) {
  logger.warn("REPLICATE_API_TOKEN is missing. Configure it in Railway → Service → Variables for production AI image tools. An attached Replit connection is only available in Replit.");
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

registerRoutes(app).then((httpServer) => {
  // Co-host the built web frontend on the same origin (no-op if absent).
  serveWebApp(app);

  httpServer.listen(port, (err?: Error) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
    startConversionCleanup();
  });
}).catch((err) => {
  logger.error({ err }, "Failed to register routes");
  process.exit(1);
});
