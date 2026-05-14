import React, { useEffect, useState } from 'react';
import { useSubscriptionSuccess } from '../../customHooks/useSubscriptionSuccess';
import { useNavigate } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

export default function SubscriptionSuccess() {
  const { subscription, refetchSubscription } = useAuth();
  const { status, restart } = useSubscriptionSuccess(subscription);
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('Verifying subscription...');
  const navigate = useNavigate();

  useEffect(() => {
    async function verify() {
      switch (status) {
        case 'success':
          setMessage('Subscription active — thank you!');
          await refetchSubscription();
          return;
        case 'timeout':
          setMessage('Subscription created, but payment verification is taking longer than expected.');
          return;
        case 'failed':
          setMessage('An error occurred while processing your payment.');
          return;
        case 'pending':
          setMessage('Processing payment...');
          return;
        default:
          return;
      }
    }
    verify();
  }, [status, refetchSubscription]);

  const handleRetryVerification = () => {
    restart(queryClient);
  }

  return (
    <div className="container py-4">
      <h1>Subscription Verification</h1>
      <div className="card p-4 my-3" style={{ maxWidth: 640 }}>
        <p>{message}</p>
        {status === 'success' && (
          <>
            <p>You can go to Homepage and start using subscription features.</p>
            <p>Or you can go to Subscription Status page to manage your subscription.</p>
            <div>
              <button
                type='button'
                className='btn btn-primary'
                onClick={() => navigate('/')}
              >Go to Homepage</button>
              <button
                type='button'
                className='btn btn-secondary ms-2'
                onClick={() => navigate('/subscription/status')}
              >Go to Subscription Status</button>
            </div>
          </>
        )}
        {status === 'failed' && (
          <>
            <p>Please retry purchasing subscription again.</p>
            <button
              type='button'
              className='btn btn-primary'
              onClick={() => navigate('/pricing')}
            >Retry Purchase</button>
          </>
        )}
        {status === 'timeout' && (
          <>
            <p>You can retry verification process of your subscription.</p>
            <p>Or you can retry purchasing subscription.</p>
            <div>
              <button
                type='button'
                className='btn btn-secondary'
                onClick={() => handleRetryVerification()}
              >Retry Verification</button>
              <button
                type='button'
                className='btn btn-primary ms-2'
                onClick={() => navigate('/pricing')}
              >Retry Purchase</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
