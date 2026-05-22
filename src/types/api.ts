import type { User, Token } from './auth';

/**
 * Standard envelope for all single item responses from the CronFlow API.
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

/**
 * Standard envelope for paginated collection responses from the CronFlow API.
 */
export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

/**
 * Response structure for authentication requests (Login / Signup / Refresh).
 */
export interface AuthResponseData {
  user: User;
  token: Token;
}

export type AuthResponse = ApiResponse<AuthResponseData>;
