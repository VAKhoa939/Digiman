import api from "./api";

export async function fetchMySubscription() {
    const res = await api.get('subscriptions/me/');
    if (res.data.detail) throw new Error(res.data.detail);
    return res.data.results ?? res.data;
}

export async function fetchSubscriptionPlans() {
    const res = await api.get('subscriptions/plans/');
    if (res.data.detail) throw new Error(res.data.detail);
    return res.data.results ?? res.data;
}

export async function createCheckoutSession(planId, provider) {
    const res = await api.post('payments/create-checkout-session', {
        planId: planId,
        provider: provider,
    });
    if (res.data.detail) throw new Error(res.data.detail);
    return res.data.results ?? res.data;
}

export async function toggleAutoRenewal() {
    const res = await api.post('subscriptions/toggle-auto-renewal/');
    if (res.data.detail) throw new Error(res.data.detail);
    return res.data.results ?? res.data;
}