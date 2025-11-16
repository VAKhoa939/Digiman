import api, { setAccessToken } from "./api";

export async function register(username, email, password, remember) {
  const res = await api.post("auth/register/", { username, email, password, remember });
  if (res.data?.detail) throw new Error(res.data.detail);
  if (res.data?.access) setAccessToken(res.data.access);
  return res.data;
}

export async function login(identifier, password, remember) {
  const res = await api.post("auth/login/", { identifier, password, remember });
  if (res.data?.detail) throw new Error(res.data.detail);
  if (res.data?.access) setAccessToken(res.data.access);
  return res.data;
}

export async function logout() {
  try {
    const res = await api.post("auth/logout/");
    if (res.data?.detail) throw new Error(res.data.detail);
  } finally {
    // Always clear client-side token state even if server call fails
    setAccessToken(null);
  }
}

export async function fetchUser() {
  const res = await api.get("auth/me/");
  if (res.data?.detail) {
    setAccessToken(null);
    throw new Error(res.data.detail);
  }
  return res.data;
}

// Attempt to update the current user's profile. Backend may or may not
// support this endpoint; callers should catch errors and fallback as needed.
export async function updateProfile(payload) {
  // Try a PATCH first, then fall back to PUT
  try {
    const res = await api.patch('auth/me/', payload);
    return res.data;
  } catch (err) {
    // If PATCH not supported, try PUT
    const res = await api.put('auth/me/', payload);
    return res.data;
  }
}
