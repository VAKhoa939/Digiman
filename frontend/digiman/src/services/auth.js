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
    if (res.status === 200) setAccessToken(null);
  } catch (err) {
    if (err.response?.status === 401) {
      setAccessToken(null);
      if (err.response?.data?.detail) throw new Error(res.data.detail);
    }
    throw err;
  }
}

export async function fetchUser() {
  const res = await api.get("auth/me/");
  if (res.status === 401) {
    setAccessToken(null);
    throw new Error("Not Authorized");
  }
  if (res.data?.detail) {
    throw new Error(res.data.detail);
  }
  return res.data;
}

// Attempt to update the current user's profile. Backend may or may not
// support this endpoint; callers should catch errors and fallback as needed.
export async function updateProfile(payload) {
  // Try a PATCH first, then fall back to PUT
  try {
    const resPatch = await api.patch('auth/me/', payload);
    if (resPatch.data?.detail) throw new Error(resPatch.data.detail);
    return resPatch.data;
  } catch (err) {
    // If PATCH not supported, try PUT
    try {
      const resPut = await api.put('auth/me/', payload);
      if (resPut.data?.detail) throw new Error(resPut.data.detail);
      return resPut.data;
    } catch (newErr) {
      throw new Error("Both PATCH and PUT profile update failed" + 
        '\n' + err.message + '\n' + newErr.message);
    }
  }
}
