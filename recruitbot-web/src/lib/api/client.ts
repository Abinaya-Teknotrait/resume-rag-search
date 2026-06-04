import axios from 'axios';
import { API_BASE_URL } from '@/config/api.config';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  if (config.headers && typeof config.headers !== 'string') {
    (config.headers as Record<string, string>)['X-Request-Source'] = 'recruitbot-web';
  }
  return config;
});

export default apiClient;
