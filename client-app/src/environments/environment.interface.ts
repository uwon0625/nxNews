export interface Environment {
  production: boolean;
  apiUrl: string;
  retryCount: number;
  requestTimeout: number;
  maxPageSize: number;
} 