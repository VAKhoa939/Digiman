import { useState } from "react";
import { PREMIUM_FEATURES, hasFeatureAccess } from "../utils/subscriptionAccess";

const usePremiumModal = () => {
	const [showPremiumModal, setShowPremiumModal] = useState(false);
	const [clickedPremiumFeature, setClickedPremiumFeature] = useState("");

	const onCheckPremiumFeature = (subscription, feature) => {
		if (hasFeatureAccess(subscription, feature)) return true;
		setShowPremiumModal(true);
		setClickedPremiumFeature(feature);
		return false;
	};

	const onClosePremiumModal = () => {
		setShowPremiumModal(false);
		setClickedPremiumFeature("");
	};

	const hasPremiumChapterAccess = (subscription, chosenChapter) => {
		return (
			chosenChapter.isPremium === false
			|| onCheckPremiumFeature(subscription, PREMIUM_FEATURES.PREMIUM_CHAPTERS)
		);
	};

	const hasOfflineReadingAccess = (subscription) => {
		return onCheckPremiumFeature(subscription, PREMIUM_FEATURES.OFFLINE_READING);
	};

	return { 
		showPremiumModal, clickedPremiumFeature, 
		onClosePremiumModal, hasPremiumChapterAccess, hasOfflineReadingAccess 
	};
};
export default usePremiumModal;