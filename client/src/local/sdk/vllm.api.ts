import axios from 'axios';
import { LLM_URL } from '@/config';

// Create axios instance for LLM server (VLLM endpoints)
const llmAxios = axios.create({
  baseURL: LLM_URL,
  timeout: 30000, // 30 seconds timeout
});

// VLLM API Types
export interface VLLMServerStartRequest {
  fine_tune_name: string;
}

export interface VLLMServerResponse {
  status: string;
  message: string;
  server_url?: string;
  pid?: number;
}

export default {
  // Start VLLM server
  startServer: async (data: VLLMServerStartRequest): Promise<void> => {
    await llmAxios.post('/start-vllm-server', data);
  },

  // Stop VLLM server
  stopServer: async (): Promise<VLLMServerResponse> => {
    const response = await llmAxios.post<VLLMServerResponse>('/stop-vllm-server');
    return response.data;
  },

  // Get VLLM server status
  getStatus: async (): Promise<VLLMServerResponse> => {
    const response = await llmAxios.get<VLLMServerResponse>('/vllm-server-status');
    return response.data;
  },

  // Health check
  healthCheck: async () => {
    const response = await llmAxios.get('/health');
    return response.data;
  },
};
