import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PREMIUM_FEATURES } from '../../utils/subscriptionAccess';
import ConfirmModal from './ConfirmModal';

const PremiumModal = ({
	showPremiumModal, clickedPremiumFeature, onClosePremiumModal
}) => {
	const navigate = useNavigate();
	
  return (
    <ConfirmModal
			show={showPremiumModal}
			onClose={() => onClosePremiumModal()}
			confirmLabel='Go To Pricing'
			onConfirm={() => navigate('/pricing')}
			title='Premium Subscription Required'
			body={
				<div>
					<p>
						{clickedPremiumFeature === PREMIUM_FEATURES.PREMIUM_CHAPTERS && 'This chapter '} 
						{clickedPremiumFeature === PREMIUM_FEATURES.OFFLINE_READING && 'The download feature '}
						is premium and requires an active subscription to read.
					</p>
					<p>Do you want to go to the pricing page to subscribe?</p>
				</div>
			}
		/>
  )
};

export default PremiumModal;