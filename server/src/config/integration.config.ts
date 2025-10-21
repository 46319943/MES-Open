import "@/config";

// LLM Configuration
export const LLM_RETRY_INTERVAL = parseInt(
  process.env.LLM_RETRY_INTERVAL || "5000"
); // 5 seconds

export const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
export const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
