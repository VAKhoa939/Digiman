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
  (r) => r,
  async (err) => {
    if (err.response?.status === 401 && !err.config._retry) {
      err.config._retry = true;
  const res = await api.post("auth/refresh/");
      accessToken = res.data.access;
      err.config.headers.Authorization = `Bearer ${accessToken}`;
      return api.request(err.config);
    }
    return Promise.reject(err);
  }
);

export default api;
