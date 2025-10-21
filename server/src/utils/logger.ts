import fs from "fs";
import path from "path";
import winston from "winston";

const logDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

function replaceAxiosErrorInCauseChain(obj: any): any {
  const visited = new Set<object>();

  function walk(node: unknown): void {
    if (!node || typeof node !== "object") return;
    const objectNode = node as Record<string, unknown>;
    if (visited.has(objectNode)) return;
    visited.add(objectNode);

    if ("cause" in objectNode) {
      const cause = objectNode["cause"] as any;
      if (cause && typeof cause === "object") {
        if ((cause.name ?? "") === "AxiosError") {
          objectNode["cause"] = cause.response?.data ?? { name: "AxiosError" };
        } else {
          walk(cause);
        }
      }
    }
  }

  walk(obj);
  return obj;
}

const stackFormatter = winston.format.printf(
  ({ level, message, timestamp, ...metadata }) => {
    let formattedMessage = `${timestamp} ${level}: ${message}`;
    if (Object.keys(metadata).length > 0) {
      if (metadata.stack) {
        formattedMessage += "\nStack Trace:\n" + metadata.stack;
        delete metadata.stack;
      }
      if (Object.keys(metadata).length > 0) {
        // Recursively sanitize AxiosError in the cause chain to avoid verbose logs
        metadata = replaceAxiosErrorInCauseChain(metadata);

        // axios.isAxiosError do not work in this case, as the metadata is modified and not the original object
        if ((metadata.name ?? "") === "AxiosError") {
          metadata = (metadata as any).response?.data;
          if (typeof metadata === "string") {
            return (formattedMessage += "\nLogged String:\n" + metadata);
          }
        }

        formattedMessage +=
          "\nLogged Object:\n" + JSON.stringify(metadata, undefined, 2);
      }
    }
    return formattedMessage;
  }
);

const logger = winston.createLogger({
  level: "debug",
  format: winston.format.combine(
    winston.format.timestamp({
      format: () =>
        new Date().toLocaleString("en-US", { timeZone: "Asia/Hong_Kong" }),
    })
  ),
  transports: [
    new winston.transports.Console({
      forceConsole: true,
      level: "info", // Only show info and above on console
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf((info) => {
          return `${info.timestamp} ${info.level}: ${info.message}`;
        })
      ),
    }),
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
      format: stackFormatter,
    }),
    new winston.transports.File({
      filename: path.join(logDir, "info.log"),
      level: "info",
      format: stackFormatter,
    }),
    new winston.transports.File({
      filename: path.join(logDir, "debug.log"),
      level: "debug",
      format: stackFormatter
    }),
  ],
});

export default logger;
