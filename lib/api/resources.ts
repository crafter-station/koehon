import { apiClient } from "./client";
import type {
  CreateResourceRequest,
  CreateResourceResponse,
  ResourcePageResponse,
} from "./types";

export const resourcesApi = {
  async create(
    data: CreateResourceRequest
  ): Promise<CreateResourceResponse> {
    const formData = new FormData();
    formData.append("file", data.file);
    formData.append("cover", data.cover);
    formData.append("language", data.language);

    return apiClient.postFormData<CreateResourceResponse>(
      "/resources",
      formData
    );
  },

  async getPage(
    resourceId: string,
    page: number,
    language: string
  ): Promise<ResourcePageResponse> {
    return apiClient.get<ResourcePageResponse>(
      `/resources/${resourceId}/pages/${page}?language=${language}`
    );
  },
};
