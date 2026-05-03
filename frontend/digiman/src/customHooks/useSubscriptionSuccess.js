import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { fetchMySubscription } from "../services/subscriptionService";

export function useSubscriptionSuccess(contextSubscription) {
	const startTime = useRef(Date.now());
	const [status, setStatus] = useState("pending");
	const [elapsedTime, setElapsedTime] = useState(0);

	const shouldFetch = !contextSubscription 
	|| contextSubscription.plan_name === "Free"
	|| (contextSubscription.status === "inactive"
	&& contextSubscription.last_payment_status === "pending");

	const {data, isLoading, isError} = useQuery({
		queryKey: ["subscription-status-check"],
		queryFn: () => fetchMySubscription(),
		staleTime: 0,
		cacheTime: 0,
		enabled: shouldFetch,
		refetchInterval: (data) => {
			if (elapsedTime >= 1000 * 15) return false;
			if (!data 
				|| data.plan_name === "Free" 
				|| (data.status === "inactive"
				&& data.last_payment_status === "pending")
			) {
				console.log("Refetching subscription status...", elapsedTime);
				return 1000 * 2;
			}
			return false;
		}
	});

	useEffect(() => {
		const interval = setInterval(() => {
			setElapsedTime(Date.now() - startTime.current);
		}, 1000);

		if (elapsedTime >= 1000 * 15) clearInterval(interval);

		return () => clearInterval(interval);
	}, [elapsedTime]);

	// UseEffect to check status
	useEffect(() => {
		function checkStatus(data, status, elapsedTime, shouldFetch) {
			if (!shouldFetch) return "success";
			if (isError) return "failed";
			if (elapsedTime >= 1000 * 15) return "timeout";
			if (data 
				&& data.plan_name !== "Free" 
				&& data.status === "inactive"
				&& data.last_payment_status === "failed"
			) return "failed";
			if (data 
				&& data.plan_name !== "Free" 
				&& data.status === "active"
				&& data.last_payment_status === "paid"
			) return "success";
			return "pending";
		}

		if (data || isError) setStatus(checkStatus(data, status, elapsedTime, shouldFetch));
	}, [data, isError, status, elapsedTime, shouldFetch]);

	const subscriptionData = shouldFetch ? data : contextSubscription;

	const restart = (queryClient) => {
		startTime.current = Date.now();
		setStatus("pending");
		setElapsedTime(0);
		queryClient.invalidateQueries({ queryKey: ["subscription-status-check"] });
	};

	return {status, data: subscriptionData, isLoading, isError, restart};
}