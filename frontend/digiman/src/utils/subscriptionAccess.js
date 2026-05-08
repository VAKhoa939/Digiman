export function hasFeatureAccess(subscription, featureName) {
    if (!subscription?.isActive) return false;
    return (subscription.features?.[featureName].toLowerCase() === "true");
}