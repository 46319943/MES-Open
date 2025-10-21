import type {
    CreateDataBoostBody,
    CreateDataBoostResponse,
    DeleteDataBoostParams,
    DeleteDataBoostResponse,
    GetDataBoostParams,
    GetDataBoostResponse,
    ListDataBoostsResponse,
    UpdateDataBoostBody,
    UpdateDataBoostParams,
    UpdateDataBoostResponse,
} from '@/shared/api-schemas/data-boost.api-schema';
import { axiosInstance } from 'boot/axios';

export default {
  // List all data boosts
  listDataBoosts: async (): Promise<ListDataBoostsResponse> => {
    const response = await axiosInstance.get<ListDataBoostsResponse>('/data-boosts');
    return response.data;
  },

  // Get a specific data boost by ID
  getDataBoost: async (
    id: GetDataBoostParams['id']
  ): Promise<GetDataBoostResponse> => {
    const response = await axiosInstance.get<GetDataBoostResponse>(`/data-boosts/${id}`);
    return response.data;
  },

  // Create a new data boost
  createDataBoost: async (
    data: CreateDataBoostBody
  ): Promise<CreateDataBoostResponse> => {
    const response = await axiosInstance.post<CreateDataBoostResponse>('/data-boosts', data);
    return response.data;
  },

  // Update a data boost
  updateDataBoost: async (
    id: UpdateDataBoostParams['id'],
    data: UpdateDataBoostBody
  ): Promise<UpdateDataBoostResponse> => {
    const response = await axiosInstance.put<UpdateDataBoostResponse>(
      `/data-boosts/${id}`,
      data
    );
    return response.data;
  },

  // Delete a data boost
  deleteDataBoost: async (
    id: DeleteDataBoostParams['id']
  ): Promise<DeleteDataBoostResponse> => {
    const response = await axiosInstance.delete<DeleteDataBoostResponse>(`/data-boosts/${id}`);
    return response.data;
  },
};
