import type {
    CreateDataBody,
    CreateDataParams,
    CreateDataResponse,
    DeleteDataBody,
    DeleteDataParams,
    DeleteDataResponse,
    GetDataParams,
    GetDataResponse,
    ListDataParams,
    ListDataQuery,
    ListDataResponse,
    UpdateDataBody,
    UpdateDataParams,
    UpdateDataResponse,
} from '@/shared/api-schemas/data.api-schema';
import { axiosInstance } from 'boot/axios';

export default {
  // List all data items in a dataset with pagination
  listData: async (
    datasetId: ListDataParams['datasetId'],
    query?: ListDataQuery
  ): Promise<ListDataResponse> => {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.sortBy) params.append('sortBy', query.sortBy);
    if (query?.sortOrder) params.append('sortOrder', query.sortOrder);
    if (query?.filterByEmptySegments !== undefined) params.append('filterByEmptySegments', query.filterByEmptySegments.toString());
    if (query?.filterByPopulatedSegments !== undefined) params.append('filterByPopulatedSegments', query.filterByPopulatedSegments.toString());
    
    const url = `/data/${datasetId}${params.toString() ? '?' + params.toString() : ''}`;
    const response = await axiosInstance.get<ListDataResponse>(url);
    return response.data;
  },

  // Get a specific data item by ID
  getData: async (
    datasetId: GetDataParams['datasetId'],
    id: GetDataParams['id']
  ): Promise<GetDataResponse> => {
    const response = await axiosInstance.get<GetDataResponse>(`/data/${datasetId}/${id}`);
    return response.data;
  },

  // Create new data items (bulk operation)
  createData: async (
    datasetId: CreateDataParams['datasetId'],
    data: CreateDataBody
  ): Promise<CreateDataResponse> => {
    const response = await axiosInstance.post<CreateDataResponse>(`/data/${datasetId}`, data);
    return response.data;
  },

  // Update a data item
  updateData: async (
    datasetId: UpdateDataParams['datasetId'],
    id: UpdateDataParams['id'],
    data: UpdateDataBody
  ): Promise<UpdateDataResponse> => {
    const response = await axiosInstance.put<UpdateDataResponse>(
      `/data/${datasetId}/${id}`,
      data
    );
    return response.data;
  },

  // Delete data items (bulk operation)
  deleteData: async (
    datasetId: DeleteDataParams['datasetId'],
    data: DeleteDataBody
  ): Promise<DeleteDataResponse> => {
    const response = await axiosInstance.delete<DeleteDataResponse>(
      `/data/${datasetId}`,
      { data }
    );
    return response.data;
  },
};
