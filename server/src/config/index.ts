import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
dotenv.config({ path: path.resolve(__dirname, `../../.env.${process.env.NODE_ENV || "development"}`) });