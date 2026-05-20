import React, { useState } from 'react'
import { useAuth } from '../../context/AuthContext';
import Spinner from '../smallComponents/Spinner';
import ConfirmModal from '../smallComponents/ConfirmModal';
import { useNavigate } from 'react-router';
import useSubscriptionStatusPage from '../../customHooks/useSubscriptionStatusPage';

const SUBSCRIPTION_STATUS = {
  "active": "Active",
  "inactive": "Inactive",
  "past_due": "Past Due"
}

const LAST_PAYMENT_STATUS = {
  "paid": "Paid",
  "failed": "Failed"
}

function SubscriptionStatusPage() {
  const { subscription, fetchUserLoading, isErrorFetchingUser, refetchSubscription } = useAuth();
  const { toggleAutoRenewalLoading, runToggleAutoRenewal } = useSubscriptionStatusPage(
    subscription,
    refetchSubscription
  );
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const navigate = useNavigate();

  const onConfirmClick = async (event) => {
    event.preventDefault();
    await runToggleAutoRenewal();
    setShowConfirmModal(false);
  }

  return (
    <div className='container py-4'>
      <h1>Subscription Status</h1>
      <div className="card p-4 my-3" style={{ maxWidth: 640 }}>
        {isErrorFetchingUser && <p className="text-danger">Error fetching subscription data.</p>}
        {fetchUserLoading ? <Spinner /> : <>
          <h2>{subscription.planName} Plan</h2>
          
          {subscription.planName !== 'Free' ? <>
            <p>Status: {SUBSCRIPTION_STATUS[subscription.status]}</p>
            <p>Start Date: {subscription.startDate}</p>
            {subscription.lastPaymentTransaction && <>
              <p>Last Payment Date: {subscription.lastPaymentTransaction.createdAt}</p>
              <p>Last Payment Status: {LAST_PAYMENT_STATUS[subscription.lastPaymentTransaction.status]}</p>
            </>}
            <hr/>
            <p>Auto-renewal: {subscription.isAutoRenewal ? 'ON' : 'OFF'}</p>
            {subscription.isAutoRenewal ? 
              <p>Your subscription will renew automatically on {subscription.nextBillingDate}.</p>
              :
              <p>Your subscription will not renew automatically and will expire on {subscription.nextBillingDate}.</p>
            }
            <button 
              type='button'
              className="btn btn-primary"
              onClick={() => setShowConfirmModal(true)}>
              {subscription.isAutoRenewal ? 'Turn Off Auto-Renewal' : 'Turn On Auto-Renewal'}
            </button>
          </> : <>
            <p>You are not subscribed to a premium plan.</p>
            <p>Do you want to go to the pricing page to subscribe?</p>
            <button 
              type='button'
              className="btn btn-primary"
              onClick={() => navigate('/pricing')}>
              Go to Pricing
            </button>
          </>}
        </>}
      </div>
      <ConfirmModal 
        show={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={(e) => onConfirmClick(e)}
        title="Toggle Auto-Renewal"
        body={
          <p>
            Are you sure you want to turn {subscription.isAutoRenewal ? 'off' : 'on'} auto-renewal?
          </p>
        }
        confirmLabel={subscription.isAutoRenewal ? 'Turn Off' : 'Turn On'}
        loading={toggleAutoRenewalLoading}
      />
    </div>
  )
}

export default SubscriptionStatusPage