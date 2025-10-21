import type {
    CreatePromptBody,
    CreatePromptResponse,
    DeletePromptParams,
    DeletePromptResponse,
    GetPromptParams,
    GetPromptResponse,
    ListPromptsResponse,
    UpdatePromptBody,
    UpdatePromptParams,
    UpdatePromptResponse,
} from '@/shared/api-schemas/prompt.api-schema';
import { axiosInstance } from 'boot/axios';

export default {
  // List all prompts
  listPrompts: async (): Promise<ListPromptsResponse> => {
    const response = await axiosInstance.get<ListPromptsResponse>('/prompts');
    return response.data;
  },

  // Get a specific prompt by ID
  getPrompt: async (
    id: GetPromptParams['id']
  ): Promise<GetPromptResponse> => {
    const response = await axiosInstance.get<GetPromptResponse>(`/prompts/${id}`);
    return response.data;
  },

  // Create a new prompt
  createPrompt: async (
    data: CreatePromptBody
  ): Promise<CreatePromptResponse> => {
    const response = await axiosInstance.post<CreatePromptResponse>('/prompts', data);
    return response.data;
  },

  // Update a prompt
  updatePrompt: async (
    id: UpdatePromptParams['id'],
    data: UpdatePromptBody
  ): Promise<UpdatePromptResponse> => {
    const response = await axiosInstance.put<UpdatePromptResponse>(
      `/prompts/${id}`,
      data
    );
    return response.data;
  },

  // Delete a prompt
  deletePrompt: async (
    id: DeletePromptParams['id']
  ): Promise<DeletePromptResponse> => {
    const response = await axiosInstance.delete<DeletePromptResponse>(`/prompts/${id}`);
    return response.data;
  },
};
