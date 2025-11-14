import axios from "axios";

let accessToken = null;
export const setAccessToken = (t) => (accessToken = t);

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
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
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/refresh/`,
        {},
        { withCredentials: true }
      );
      accessToken = res.data.access;
      err.config.headers.Authorization = `Bearer ${accessToken}`;
      return api.request(err.config);
    }
    return Promise.reject(err);
  }
);

export default api;
