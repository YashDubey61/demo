// Try to get API URL from environment, with fallback
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.stat-vision.xyz';

console.log('API Base URL configured as:', API_BASE_URL);

export const getApiUrl = (endpoint: string): string => {
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  const cleanBaseUrl = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${cleanBaseUrl}/${cleanEndpoint}`;
};
