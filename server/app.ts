import { errorMiddleware } from "@/middlewares/error.middleware";
import { setupGlobalErrorHandlers } from "@/utils/global-error-handler";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import createError from "http-errors";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import router from "@/routes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enable trust proxy to trust X-Forwarded-* headers
app.set("trust proxy", true);

// Set up global error handlers
setupGlobalErrorHandlers();

// Add CORS middleware
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? [
            "http://localhost",
            "https://localhost",
            process.env.CLIENT_URL || "https://ten.linkard.uk",
          ]
        : [
            "http://localhost",
            "https://localhost",
            `${process.env.CLIENT_URL?.slice(0, -5)}:9500`,
            "http://192.168.10.104:9500",
            process.env.CLIENT_URL || "http://localhost:9000",
          ], // Development origins
    credentials: true, // Required for cookies, authorization headers with HTTPS
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Authorization"],
  })
);

app.use(morgan("dev"));

app.use(express.json({ limit: '500mb' }));
app.use(express.urlencoded({ extended: false, limit: '500mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use("/", router);

// catch 404 and forward to error handler
app.use((req: Request, res: Response, next: NextFunction) => {
  next(createError(404));
});

// Use the error middleware
app.use(errorMiddleware);

export default app;
