import React, { useState } from 'react';

export default function Pricing() {
  const [loading, setLoading] = useState(false);

  async function startCheckout(priceId) {
    if (!priceId) {
      alert('Payment price ID is not configured.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ priceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Failed to create checkout session');
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert('Unexpected error creating checkout session');
      setLoading(false);
    }
  }

  return (
    <div className="container py-4">
      <h1>Pricing</h1>

      <div className="row g-3">
        <div className="col-md-6">
          <div className="card p-4 h-100">
            <h3>Free Plan</h3>
            <p className="text-muted">Access with no cost</p>
            <ul>
              <li>Limited access to free manga titles / chapters</li>
              <li>Reading with accessibility options and progress tracking</li>
              <li>Engage community with comments</li>
              <li>Personalized homepage</li>
            </ul>
            <div className="mt-auto">
              <a href="/register" className="btn btn-outline-primary">Get Free</a>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card p-4 h-100">
            <h3>Basic Plan</h3>
            <p className="text-muted">Recommended — monthly subscription</p>
            <strong className="d-block mb-2">$5 / month</strong>
            <ul>
              <li>Unlimited access to premium manga titles / chapters</li>
              <li>Reading with accessibility options and progress tracking</li>
              <li>Engage community with comments</li>
              <li>Personalized homepage</li>
              <li>Ability to download chapters and read without internet access</li>
            </ul>
            <div className="mt-auto">
              <button className="btn btn-primary" onClick={() => startCheckout(import.meta.env.VITE_STRIPE_PRICE_BASIC)} disabled={loading}>
                {loading ? 'Redirecting…' : 'Subscribe — $5/mo'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
