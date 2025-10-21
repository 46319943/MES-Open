import type {
    CreateOutputFormatBody,
    CreateOutputFormatResponse,
    DeleteOutputFormatParams,
    DeleteOutputFormatResponse,
    GetOutputFormatParams,
    GetOutputFormatResponse,
    ListOutputFormatsResponse,
    UpdateOutputFormatBody,
    UpdateOutputFormatParams,
    UpdateOutputFormatResponse,
} from '@/shared/api-schemas/output-format.api-schema';
import { axiosInstance } from 'boot/axios';

export default {
  // List all output formats
  listOutputFormats: async (): Promise<ListOutputFormatsResponse> => {
    const response = await axiosInstance.get<ListOutputFormatsResponse>('/output-formats');
    return response.data;
  },

  // Get a specific output format by ID
  getOutputFormat: async (
    id: GetOutputFormatParams['id']
  ): Promise<GetOutputFormatResponse> => {
    const response = await axiosInstance.get<GetOutputFormatResponse>(`/output-formats/${id}`);
    return response.data;
  },

  // Create a new output format
  createOutputFormat: async (
    data: CreateOutputFormatBody
  ): Promise<CreateOutputFormatResponse> => {
    const response = await axiosInstance.post<CreateOutputFormatResponse>('/output-formats', data);
    return response.data;
  },

  // Update an output format
  updateOutputFormat: async (
    id: UpdateOutputFormatParams['id'],
    data: UpdateOutputFormatBody
  ): Promise<UpdateOutputFormatResponse> => {
    const response = await axiosInstance.put<UpdateOutputFormatResponse>(
      `/output-formats/${id}`,
      data
    );
    return response.data;
  },

  // Delete an output format
  deleteOutputFormat: async (
    id: DeleteOutputFormatParams['id']
  ): Promise<DeleteOutputFormatResponse> => {
    const response = await axiosInstance.delete<DeleteOutputFormatResponse>(`/output-formats/${id}`);
    return response.data;
  },
};
