import type {
  CreateDatasetBody,
  CreateDatasetResponse,
  DeleteDatasetParams,
  GetDatasetParams,
  GetDatasetResponse,
  ListDatasetsResponse,
  UpdateDatasetBody,
  UpdateDatasetParams,
  UpdateDatasetResponse,
} from '@/shared/api-schemas/dataset.api-schema';
import { axiosInstance } from 'boot/axios';

export default {
  // List all datasets
  listDatasets: async (): Promise<ListDatasetsResponse> => {
    const response = await axiosInstance.get<ListDatasetsResponse>('/datasets');
    return response.data;
  },

  // Get a specific dataset by ID
  getDataset: async (id: GetDatasetParams['id']): Promise<GetDatasetResponse> => {
    const response = await axiosInstance.get<GetDatasetResponse>(`/datasets/${id}`);
    return response.data;
  },

  // Create a new dataset
  createDataset: async (data: CreateDatasetBody): Promise<CreateDatasetResponse> => {
    const response = await axiosInstance.post<CreateDatasetResponse>('/datasets', data);
    return response.data;
  },

  // Update a dataset
  updateDataset: async (
    id: UpdateDatasetParams['id'],
    data: UpdateDatasetBody
  ): Promise<UpdateDatasetResponse> => {
    const response = await axiosInstance.put<UpdateDatasetResponse>(
      `/datasets/${id}`,
      data
    );
    return response.data;
  },

  // Delete a dataset
  deleteDataset: async (id: DeleteDatasetParams['id']): Promise<void> => {
    await axiosInstance.delete(`/datasets/${id}`);
  },
};
