import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext';
import Spinner from '../smallComponents/Spinner';
import ConfirmModal from '../smallComponents/ConfirmModal';
import { useNavigate } from 'react-router';
import useSubscriptionStatusPage from '../../customHooks/useSubscriptionStatusPage';
import { createCustomerPortalSession } from '../../services/subscriptionService';

const SUBSCRIPTION_STATUS = {
  "active": "Active",
  "inactive": "Inactive",
  "past_due": "Past Due",
  "ended": "Ended"
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
  const [loadingCustomerPortal, setLoadingCustomerPortal] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const onConfirmClick = async (event) => {
    event.preventDefault();
    await runToggleAutoRenewal();
    setShowConfirmModal(false);
  }

  const onCustomerPortalClick = async (event) => {
    event.preventDefault();
    setLoadingCustomerPortal(true);
    setError(null);
    
    try {
      const data = await createCustomerPortalSession();
      if (data.url)
        window.location.href = data.url;
      else
        setError('Failed to create customer portal session.');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unexpected error creating customer portal session.');
    } finally {
      setLoadingCustomerPortal(false);
    }
  }

  return (
    <div className='container py-4'>
      <h1>Subscription Status</h1>

      {error && <div className="alert alert-danger text-center">{error}</div>}

      <div className="card p-4 my-3" style={{ maxWidth: 640 }}>
        {isErrorFetchingUser && <p className="text-danger">Error fetching subscription data.</p>}
        {fetchUserLoading ? <Spinner /> : <>
          <h2>{subscription.planName} Plan</h2>
          
          {subscription.planName !== 'Free' ? <>
            <p>Status: {SUBSCRIPTION_STATUS[subscription.status]}</p>
            <p>Start Date: {subscription.startDate}</p>
            {subscription.endedAt ? 
              <p>Ended At: {subscription.endedAt}</p> 
              : 
              <> 
                {subscription.lastPaymentTransaction && <>
                  <p>Last Payment Date: {subscription.lastPaymentTransaction.createdAt}</p>
                  <p>Last Payment Status: {LAST_PAYMENT_STATUS[subscription.lastPaymentTransaction.status]}</p>
                  {subscription.lastPaymentTransaction.paidAt && <>
                    <p>Paid At: {subscription.lastPaymentTransaction.paidAt}</p>
                  </>}
                  {subscription.lastPaymentTransaction.nextPaymentAttemptAt && <>
                    <p>Next Payment Attempt At: {subscription.lastPaymentTransaction.nextPaymentAttemptAt}</p>
                  </>}
                </>}
              </>
            }
            <hr/>

            {subscription.status === 'active' && <>
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
            </>}

            {subscription.status === 'ended' && <>
              <p>Your subscription has ended.</p>
              <p>Go to the pricing page to subscribe a new plan again.</p>
              <button 
                type='button'
                className="btn btn-primary"
                onClick={() => navigate('/pricing')}>
                Go to Pricing
              </button>
            </>}

            {subscription.status === 'past_due' && <>
              <p>Your subscription is past due because your recent auto renewal payment has failed.</p><br/>

              {subscription.lastPaymentTransaction.nextPaymentAttemptAt ? <>
                <p>Please check your payment method to ensure that it is still valid and has sufficient funds before Stripe attempts to charge it again.</p><br/>

                <p>If you would like to change your payment method, you can do so by visiting the Customer Portal.</p>
                <button
                  type='button'
                  className="btn btn-primary"
                  disabled={loadingCustomerPortal}
                  onClick={(e) => onCustomerPortalClick(e)}>
                  Go to Customer Portal
                </button><br/>

                <p>You can also go to the Pricing page to subscribe a new plan again.</p>
              </> : <>
                <p>All Stripe payment attempts have been exhausted.</p><br/>

                <p>Please go to the Pricing page to subscribe a new plan again.</p>
              </>}
              <button 
                type='button'
                className={(subscription.status === 'past_due' ? 'btn btn-secondary' : 'btn btn-primary')}
                onClick={() => navigate('/pricing')}>
                Go to Pricing
              </button>
            </>}
          </> : <>
            <p>You are not subscribed to a premium plan.</p>
            <p>Do you want to go to the Pricing page to subscribe?</p>
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