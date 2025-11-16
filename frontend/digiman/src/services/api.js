import axios from "axios";

let accessToken = null;
export const setAccessToken = (t) => (accessToken = t);

const rawBase = import.meta.env.VITE_API_URL || '/api';
// Ensure baseURL always ends with a single trailing slash so requests like
// `auth/login/` concatenate to `${baseURL}auth/login/` reliably.
const normalizedBase = rawBase.replace(/\/+$/, '') + '/';

const api = axios.create({
  baseURL: normalizedBase,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (err) => {
    const originalConfig = err.config;

    if (err.response?.status === 401 && !originalConfig._retry) {
      originalConfig._retry = true;

      try {
        const refreshResponse = await axios.post(
          `${normalizedBase}auth/refresh/`, 
          {}, {withCredentials: true}
        );
        const newAccessToken = refreshResponse.data.access;
        setAccessToken(newAccessToken);

        originalConfig.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalConfig);
      } catch (refreshErr) {
        console.log("Token refresh failed:", refreshErr);
      }
    }
    return Promise.reject(err);
  }
);

export default api;
