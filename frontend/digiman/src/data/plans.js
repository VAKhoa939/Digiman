// Fallback free plan shown while the API hasn't loaded or for unauthenticated users.
// Shape mirrors SubscriptionPlanSerializer: id, name, description, price_usd,
// frequency, features, updated_at, provider, external_price_id.
const freePlan = {
  id: 'free',
  name: 'Free Plan',
  description: [
    'Limited access to free manga titles / chapters',
    'Reading with accessibility options and progress tracking',
    'Engage community with comments',
    'Personalized homepage',
  ],
  price_usd: '0.00',
  frequency: 'permanent',
};

export default freePlan;
