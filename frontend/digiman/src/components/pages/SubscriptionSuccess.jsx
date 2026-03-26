import React, { useEffect, useState } from 'react';

export default function SubscriptionSuccess() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Verifying subscription...');

  useEffect(() => {
    async function verify() {
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('session_id');
      if (!sessionId) {
        setMessage('No session id present.');
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`/api/payments/verify-session?session_id=${sessionId}`, { credentials: 'include' });
        if (res.ok) {
          setMessage('Subscription active — thank you!');
        } else {
          setMessage('Subscription created, but verification failed.');
        }
      } catch (err) {
        setMessage('Unable to verify subscription.');
      }
      setLoading(false);
    }
    verify();
  }, []);

  return (
    <div className="container py-4">
      <h1>Subscription</h1>
      <div className="card p-4 my-3" style={{ maxWidth: 640 }}>
        {loading ? <p>{message}</p> : <p>{message}</p>}
      </div>
    </div>
  );
}
