import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { fetchMySubscription } from "../services/subscriptionService";
import { mapReaderSubscription } from "../utils/transform";

export function useSubscriptionSuccess(contextSubscription) {
	const startTime = useRef(Date.now());
	const [status, setStatus] = useState("pending");
	const [elapsedTime, setElapsedTime] = useState(0);

	function isSubscriptionPending(subscription) {
		return !subscription 
			|| subscription.lastPaymentStatus === "none";
	}

	const shouldFetch = isSubscriptionPending(contextSubscription);
	console.log("shouldFetch", shouldFetch, contextSubscription);

	const {data, isLoading, isError} = useQuery({
		queryKey: ["subscription-success"],
		queryFn: () => fetchMySubscription(),
		staleTime: 0,
		cacheTime: 0,
		enabled: shouldFetch,
		refetchInterval: (data) => {
			if (elapsedTime >= 1000 * 15) return false;

			const mappedData = mapReaderSubscription(data);
			if (isSubscriptionPending(mappedData)) {
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
			
			const mappedData = mapReaderSubscription(data);
			if (!mappedData || mappedData.lastPaymentStatus === "none") return "pending";
			if (mappedData.lastPaymentStatus === "failed") return "failed";
			return "success";
		}

		if (data || isError) setStatus(checkStatus(data, status, elapsedTime, shouldFetch));
	}, [data, isError, status, elapsedTime, shouldFetch]);

	const subscriptionData = shouldFetch ? mapReaderSubscription(data) : contextSubscription;

	const restart = (queryClient) => {
		startTime.current = Date.now();
		setStatus("pending");
		setElapsedTime(0);
		queryClient.invalidateQueries({ queryKey: ["subscription-success"] });
	};

	return {status, data: subscriptionData, isLoading, isError, restart};
}