import { apiClient } from "./client";
import type {
  CreateResourceRequest,
  CreateResourceResponse,
  ResourcePageResponse,
  BulkGeneratePagesRequest,
  BulkGeneratePagesResponse,
  GetBookmarksResponse,
  CreateBookmarkRequest,
  CreateBookmarkResponse,
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

  async bulkGeneratePages(
    resourceId: string,
    data: BulkGeneratePagesRequest
  ): Promise<BulkGeneratePagesResponse> {
    return apiClient.post<BulkGeneratePagesResponse, BulkGeneratePagesRequest>(
      `/resources/${resourceId}/pages/bulk`,
      data
    );
  },

  async updateTitle(
    resourceId: string,
    title: string
  ): Promise<{ success: boolean }> {
    return apiClient.patch<{ success: boolean }, { title: string }>(
      `/resources/${resourceId}`,
      { title }
    );
  },

  async delete(resourceId: string): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(`/resources/${resourceId}`);
  },

  getExportUrl(resourceId: string): string {
    return `/api/resources/${resourceId}/export`;
  },

  // Bookmarks
  async getBookmarks(resourceId: string): Promise<GetBookmarksResponse> {
    return apiClient.get<GetBookmarksResponse>(
      `/resources/${resourceId}/bookmarks`
    );
  },

  async createBookmark(
    resourceId: string,
    data: CreateBookmarkRequest
  ): Promise<CreateBookmarkResponse> {
    return apiClient.post<CreateBookmarkResponse, CreateBookmarkRequest>(
      `/resources/${resourceId}/bookmarks`,
      data
    );
  },

  async deleteBookmark(
    resourceId: string,
    bookmarkId: string
  ): Promise<{ success: boolean }> {
    return apiClient.delete<{ success: boolean }>(
      `/resources/${resourceId}/bookmarks/${bookmarkId}`
    );
  },
};
