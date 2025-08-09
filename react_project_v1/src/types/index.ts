// Global type definitions
export interface User {
  id: string;
  name: string;
  email: string;
  bio?: string;
  avatar?: string;
}

export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}