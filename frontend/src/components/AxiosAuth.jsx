import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import axios from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;

export default function AxiosAuth() {
  const { getToken } = useAuth();

  useEffect(() => {
    const interceptorId = axios.interceptors.request.use(async (config) => {
      const requestUrl = config.url || '';
      if (apiBaseUrl && requestUrl.startsWith(apiBaseUrl)) {
        const token = await getToken();
        if (token) {
          config.headers = config.headers ?? {};
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    });

    return () => axios.interceptors.request.eject(interceptorId);
  }, [getToken]);

  return null;
}
