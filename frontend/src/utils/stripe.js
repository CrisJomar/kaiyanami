import { loadStripe } from '@stripe/stripe-js';

const stripePublicKey = 'pk_test_51QxCrHIvzWGxxgMZ';

const getStripe = () => {
  let stripePromise = null;
  
  if (!stripePromise) {
    stripePromise = loadStripe(stripePublicKey).catch(err => {
      console.error("Failed to load Stripe.js:", err);
      return null;
    });
  }
  
  return stripePromise;
};

export default getStripe;
