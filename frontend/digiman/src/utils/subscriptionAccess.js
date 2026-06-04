export const PREMIUM_FEATURES = {
    PREMIUM_CHAPTERS: "premium_chapters",
    OFFLINE_READING: "offline_reading",
};

export function hasFeatureAccess(subscription, featureName) {
    if (!subscription?.isActive) return false;
    return (subscription.features?.[featureName].toLowerCase() === "true");
}