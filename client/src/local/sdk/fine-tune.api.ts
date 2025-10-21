import type {
  FineTuneRequest,
  FineTuneResponse,
  ListFineTunesResponse,
  GetFineTuneParams,
  GetFineTuneResponse,
  DeleteFineTuneParams,
  DeleteFineTuneResponse,
} from 'src/local/api-schemas/fine-tune.api-schema';
import { ListFineTunesResponseSchema } from 'src/local/api-schemas/fine-tune.api-schema';
import axios from 'axios';
import { LLM_URL } from '@/config';

// Create axios instance for LLM server
const llmAxios = axios.create({
  baseURL: LLM_URL,
  timeout: 30000, // 30 seconds timeout
});

export default {
  // Fine-tune endpoints
  createFineTune: async (data: FineTuneRequest): Promise<FineTuneResponse> => {
    const response = await llmAxios.post<FineTuneResponse>('/fine-tune', data);
    return response.data;
  },

  listFineTunes: async (): Promise<ListFineTunesResponse> => {
    const response = await llmAxios.get<ListFineTunesResponse>('/fine-tunes');
    return ListFineTunesResponseSchema.parse(response.data);
  },

  getFineTune: async (
    fineTuneName: GetFineTuneParams['fine_tune_name'],
  ): Promise<GetFineTuneResponse> => {
    const response = await llmAxios.get<GetFineTuneResponse>(`/fine-tunes/${fineTuneName}`);
    return response.data;
  },

  deleteFineTune: async (
    fineTuneName: DeleteFineTuneParams['fine_tune_name'],
  ): Promise<DeleteFineTuneResponse> => {
    const response = await llmAxios.delete<DeleteFineTuneResponse>(`/fine-tunes/${fineTuneName}`);
    return response.data;
  },

  // Health check
  healthCheck: async () => {
    const response = await llmAxios.get('/health');
    return response.data;
  },
};
