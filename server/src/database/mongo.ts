import { MONGO_URL } from "@/config/server.config";
import { DataBoost } from "@/shared/models/data-boost.model";
import { Dataset } from "@/shared/models/dataset.model";
import { OutputFormat } from "@/shared/models/output-format.model";
import { Prompt } from "@/shared/models/prompt.model";
import logger from "@/utils/logger";
import { Db, MongoClient } from "mongodb";

// Enable command monitoring for debugging
const client = new MongoClient(MONGO_URL, {
  monitorCommands: true,
  ignoreUndefined: true,
});

client.on("commandFailed", (event) => {
  logger.error("MongoDB command failed", {
    command: event.commandName,
    requestId: event.requestId,
    duration: event.duration,
    error: event.failure,
  });
});

const db: Db = client.db("MultisensoryExperience");

export const dataBoostCollection = db.collection<DataBoost>("dataBoost");
export const datasetCollection = db.collection<Dataset>("dataset");
export const promptCollection = db.collection<Prompt>("prompt");
export const outputFormatCollection = db.collection<OutputFormat>("outputFormat");

export default db;
