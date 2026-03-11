// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError {
  error: string;
  status: number;
}

export interface ApiErrorResponse {
  error: string;
}

// Resource Types
export interface CreateResourceRequest {
  file: File;
  language: string;
}

export interface ResourceResponse {
  id: string;
  title: string;
  language: string;
  createdAt: string;
}

export interface CreateResourceResponse {
  success: boolean;
  resource: ResourceResponse;
}
