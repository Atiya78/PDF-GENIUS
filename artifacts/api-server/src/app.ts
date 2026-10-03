import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger";
import { registerRoutes } from "./routes";
import { educationApp } from "./education/routes";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
// Education owns a bounded JSON/multipart parser; keep the existing API parser
// and payment webhook raw-body capture exactly as they are.
app.use("/api/education", educationApp);
// Capture the raw request body so the Dodo Payments webhook route can verify the
// Standard-Webhooks HMAC signature against the exact bytes Dodo signed.
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as any).rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

export { app, registerRoutes };
export default app;
