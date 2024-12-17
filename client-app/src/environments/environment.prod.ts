import { Environment } from './environment.interface';

export const environment: Environment = {
  production: true,
  apiUrl: 'https://ntnewsapi.azurewebsites.net',
  retryCount: 3,
  requestTimeout: 30000,
  maxPageSize: 20
}; 
