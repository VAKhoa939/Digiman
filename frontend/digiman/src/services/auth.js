import api, { setAccessToken } from "./api";

export async function register(username, email, password, remember) {
  const res = await api.post("/auth/register/", { username, email, password, remember });
  if (res.data.detail) throw new Error(res.data.detail);
  setAccessToken(res.data.access);
  return res.data;
}

export async function login(identifier, password, remember) {
  const res = await api.post("/auth/login/", { identifier, password, remember });
  if (res.data.detail) throw new Error(res.data.detail);
  setAccessToken(res.data.access);
  return res.data;
}

export async function logout() {
  const res = await api.post("/auth/logout/");
  if (res.data.detail) throw new Error(res.data.detail);
  setAccessToken(null);
}
