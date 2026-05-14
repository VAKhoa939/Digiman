import React, { useState, useEffect } from 'react';
import freePlan from '../../data/plans';
import PlanCard from '../smallComponents/PlanCard';
import ConfirmModal from '../smallComponents/ConfirmModal';
import Spinner from '../smallComponents/Spinner';
import { createCheckoutSession, fetchSubscriptionPlans } from '../../services/subscriptionService';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const PROVIDERS = [
  { id: 'Stripe', label: 'Pay with Stripe', enabled: true },
  { id: 'Momo', label: 'Pay with Momo', enabled: false },
];

export default function Pricing() {
  const { subscription } = useAuth();
  const [plans, setPlans] = useState([freePlan]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [error, setError] = useState(null);
  const [pendingCheckout, setPendingCheckout] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    function mapActivePlan(plans) {
      if (!plans || plans.length === 0) return plans;
      return plans.map((plan) => {
        if (!subscription?.isActive 
          || subscription.planName === 'Free' 
          || plan.name === 'Free'
        ) return plan;
        
        if (subscription?.planName === plan.name) {
          return {
            ...plan,
            buttonText: 'Go to Subscription Status',
            buttonDisabled: false,
            onClick: () => navigate('/subscription-status'),
          }
        }
        return {
          ...plan,
          buttonText: 'Plan Active',
          buttonDisabled: true,
          onClick: () => {},
        }
      })
    }

    async function fetchPlans() {
      try {
        const data = await fetchSubscriptionPlans();
        console.log('Plans fetched', data, subscription);
        setPlans(mapActivePlan(data));
      } catch (err) {
        setError('Failed to load subscription plans.');
        console.error('Failed to load subscription plans.', err);
      } finally {
        setLoadingPlans(false);
      }
    }
    fetchPlans();
  }, [subscription]);

  function requestCheckout(planId) {
    const plan = plans.find((p) => p.id === planId);
    setPendingCheckout({ planId, plan });
  }

  function cancelCheckout() {
    if (loadingProvider) return;
    setPendingCheckout(null);
  }

  async function confirmCheckout(event, provider) {
    event.preventDefault();
    if (!pendingCheckout) return;
    const { planId } = pendingCheckout;
    setError(null);
    setLoadingProvider(provider);
    try {
      const data = await createCheckoutSession(planId, provider);
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('Failed to create checkout session.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Unexpected error creating checkout session.');
    } finally {
      setLoadingProvider(null);
      setPendingCheckout(null);
    }
  }

  const pendingPlan = pendingCheckout?.plan;
  const pendingPrice = pendingPlan
    ? `$${pendingPlan.price_usd}/${pendingPlan.frequency}`
    : '';

  return (
    <div className="container py-4">
      <div className="pricing-hero">
        <h1>Choose Your Plan</h1>
        <p>Unlock premium manga, offline reading, and more with a plan that fits you.</p>
      </div>

      {error && <div className="alert alert-danger text-center">{error}</div>}

      {loadingPlans ? (
        <Spinner />
      ) : (
        <div className="row g-4 justify-content-center">
          {plans.map((plan) => (
            <div key={plan.id} className="col-sm-6 col-lg-5">
              <PlanCard
                plan={plan}
                loadingPlan={loadingProvider ? pendingCheckout?.planId : null}
                onCheckout={requestCheckout}
              />
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        show={!!pendingCheckout}
        onClose={cancelCheckout}
        title="Confirm Subscription"
        body={
          pendingCheckout && (
            <>
              <p>
                You are subscribing to the{' '}
                <strong>{pendingPlan?.name}</strong> at{' '}
                <strong>{pendingPrice}</strong>.
              </p>
              <p className="mb-0">Choose a payment method to continue:</p>
            </>
          )
        }
        loading={!!loadingProvider}
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={cancelCheckout}
              disabled={!!loadingProvider}
            >
              Cancel
            </button>
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                type="button"
                className="btn btn-primary provider-btn"
                onClick={(e) => confirmCheckout(e, p.id)}
                disabled={!p.enabled || !!loadingProvider}
              >
                {loadingProvider === p.id ? 'Redirecting…' : p.label}
                {!p.enabled && ' (Coming soon)'}
              </button>
            ))}
          </>
        }
      />
    </div>
  );
}
