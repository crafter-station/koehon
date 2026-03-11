import type { ApiError } from "./types";

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "/api") {
    this.baseUrl = baseUrl;
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options?.headers,
        },
      });

      // Parse response
      const data = await response.json();

      // Handle error responses
      if (!response.ok) {
        const error: ApiError = {
          error: data.error || "An error occurred",
          status: response.status,
        };
        throw error;
      }

      return data as T;
    } catch (error) {
      // Re-throw ApiError
      if (error && typeof error === "object" && "status" in error) {
        throw error;
      }

      // Handle network errors
      const apiError: ApiError = {
        error:
          error instanceof Error ? error.message : "Network error occurred",
        status: 0,
      };
      throw apiError;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: "GET",
    });
  }

  /**
   * POST request with JSON body
   */
  async post<T, B = unknown>(endpoint: string, body?: B): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * POST request with FormData (for file uploads)
   */
  async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: formData,
      // Don't set Content-Type header - browser will set it with boundary
    });
  }

  /**
   * PUT request with JSON body
   */
  async put<T, B = unknown>(endpoint: string, body?: B): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PATCH request with JSON body
   */
  async patch<T, B = unknown>(endpoint: string, body?: B): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, {
      method: "DELETE",
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
