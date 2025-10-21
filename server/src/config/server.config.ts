import "@/config";

export const DEV_ENV = ["development", "test"].includes(
  process.env.NODE_ENV || "development"
);
export const PORT = process.env.PORT || 3110;
export const CLIENT_URL = process.env.CLIENT_URL || "http://127.0.0.1:9000";
export const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017";

export const JWT_SECRET =
  process.env.JWT_SECRET || "linkard_jwt_secret_linkard";


