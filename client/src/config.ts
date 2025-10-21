export const API_URL = process.env.API_URL || '';
export const LLM_URL = process.env.LLM_URL || '';
export const VLLM_URL = process.env.VLLM_URL || '';
export const VLLM_KEY = process.env.VLLM_KEY || '';
export const VLLM_MODEL = process.env.VLLM_MODEL || '';
export const VLLM_POOL_SIZE = parseInt(process.env.VLLM_POOL_SIZE || '10', 10);
