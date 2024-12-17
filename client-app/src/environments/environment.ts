import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  apiUrl: 'http://localhost:5175',
  retryCount: 1,
  requestTimeout: 10000,
  maxPageSize: 20
}; 