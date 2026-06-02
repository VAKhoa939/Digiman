import { useCallback, useState } from "react";
import emitToast from "../utils/toast";
import { toggleAutoRenewal } from "../services/subscriptionService";

export function useSubscriptionStatusPage(subscription, refetchSubscription) {
  const [toggleAutoRenewalLoading, setToggleAutoRenewalLoading] = useState(false);

  const runToggleAutoRenewal = useCallback(async () => {
    setToggleAutoRenewalLoading(true);
		const oldIsAutoRenewal = subscription.isAutoRenewal;
		
    try {
			await toggleAutoRenewal();

			const startTime = Date.now();
			const interval = setInterval(async () => {
				const newSubscription = await refetchSubscription();
				const newIsAutoRenewal = newSubscription.isAutoRenewal;
				
				const timeElapsed = Date.now() - startTime;
				console.log("Refetching subscription status...", timeElapsed, oldIsAutoRenewal, newIsAutoRenewal);

				if (newIsAutoRenewal !== oldIsAutoRenewal) {
					clearInterval(interval);
					setToggleAutoRenewalLoading(false);
					emitToast("success", "Auto-renewal has been " + (!oldIsAutoRenewal ? "enabled" : "disabled") + " successfully!");
				} else if (timeElapsed >= 1000 * 15) {
					clearInterval(interval);
					setToggleAutoRenewalLoading(false);
					emitToast("error", "Failed to " + (!oldIsAutoRenewal ? "enable" : "disable") + " auto-renewal. Please try again later.");
				}
			}, 1000 * 2);
    } catch (err) {
			setToggleAutoRenewalLoading(false);
			emitToast("error", "An error occurred while " + (!oldIsAutoRenewal ? "enabling" : "disabling") + " auto-renewal. Please try again later.");
		}
  }, [subscription, refetchSubscription]);

	return {
		toggleAutoRenewalLoading,
		runToggleAutoRenewal
	}
}

export default useSubscriptionStatusPage