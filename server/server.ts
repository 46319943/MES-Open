import "@/config";
import { DEV_ENV, PORT } from "@/config/server.config";
import fs from "fs";
import https from "https";
import path from "path";
import { fileURLToPath } from "url";
import app from "./app";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const certPath = path.resolve(
  __dirname,
  "ten-api.linkard.uk",
  "ten-api.linkard.uk.crt"
);
const keyPath = path.resolve(
  __dirname,
  "ten-api.linkard.uk",
  "ten-api.linkard.uk.key"
);

// Run database updates before starting the server
async function startServer() {
  try {
    // Run all database updates first
    
    if (!DEV_ENV) {
      // Production: Use HTTPS
      try {
        const credentials = {
          key: fs.readFileSync(keyPath, "utf8"),
          cert: fs.readFileSync(certPath, "utf8"),
        };
        const server = https.createServer(credentials, app);
        server.listen(PORT, () => {
          console.log(`HTTPS Server is running on port ${PORT}`);
        });
      } catch (err) {
        console.error("Failed to start HTTPS server in production. Reason:", err);
        process.exit(1);
      }
    } else {
      // Development or test: Use HTTP
      app.listen(PORT, () => {
        console.log(`HTTP Server is running on port ${PORT}`);
      });
    }
  } catch (error) {
    console.error("Failed to start server due to update script failure:", error);
    process.exit(1);
  }
}

// Start the server with updates
startServer();
