import api, { setAccessToken } from "./api";

export async function register(username, email, password, remember) {
  const res = await api.post("/auth/register/", { username, email, password, remember });
  setAccessToken(res.data.access);
  return res.data;
}

export async function login(identifier, password, remember) {
  const res = await api.post("/auth/login/", { username: identifier, password, remember });
  setAccessToken(res.data.access);
  return res.data;
}

export async function logout() {
  await api.post("/auth/logout/");
  setAccessToken(null);
}
