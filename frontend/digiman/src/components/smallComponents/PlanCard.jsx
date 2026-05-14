import React from 'react';

const FREQUENCY_LABELS = {
  permanent: '',
  hourly: '/hr',
  monthly: '/mo',
  yearly: '/yr',
};


const PlanCard = ({ plan, loadingPlan, onCheckout }) => {
  const { id, name, description, price_usd, frequency, buttonText, buttonDisabled, onClick } = plan;
  const isLoading = loadingPlan === id;
  const isFree = parseFloat(price_usd) === 0;
  const freqLabel = isFree ? '/mo' : FREQUENCY_LABELS[frequency];
  const priceAmount = `$${price_usd}`;
  const isRecommended = name === 'Basic';

  return (
    <div className={`plan-card${isRecommended ? ' plan-card--recommended' : ''}`}>
      {isRecommended ? <div className="plan-card__badge">Recommended</div> : <div className="plan-card__badge-placeholder"/>}
      <h3 className="plan-card__name">{name}</h3>
      <div className="plan-card__price">
        {priceAmount}
        {freqLabel && <span>{freqLabel}</span>}
      </div>
      <hr className="plan-card__divider" />
      <ul className="plan-card__features">
        {Array.isArray(description) && description.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
      {!isFree && (
        <button
          className="btn btn-primary plan-card__btn"
          onClick={onClick || (() => onCheckout(id))}
          disabled={buttonDisabled || isLoading}
        >
          {isLoading ? 'Redirecting…' : (buttonText || 'Subscribe Now')}
        </button>
      )}
    </div>
  );
};

export default PlanCard;