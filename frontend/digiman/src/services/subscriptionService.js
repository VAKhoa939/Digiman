import api from "./api";

export async function fetchMySubscription() {
    const res = await api.get('subscriptions/me/');
    if (res.data.detail) throw new Error(res.data.detail);
    return res.data.results ?? res.data;
}