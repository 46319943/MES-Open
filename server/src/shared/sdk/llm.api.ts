import type {
    CallLLMBody,
    CallLLMResponse,
} from '@/shared/api-schemas/llm.api-schema';
import { axiosInstance } from 'boot/axios';

export default {
  // Call LLM with messages and model
  callLLM: async (
    data: CallLLMBody
  ): Promise<CallLLMResponse> => {
    const response = await axiosInstance.post<CallLLMResponse>('/llm/call', data);
    return response.data;
  },
};
