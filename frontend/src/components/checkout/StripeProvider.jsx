import React from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe with your publishable key
// Replace this with your actual Stripe publishable key from your .env file
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_51QxCrHIvzWGxxgMZopPyODDsa4L1jzgs1785R3bvZA9N2okvTDyOWlIx35ospO70bdyekBsI4VjUfklcS1gEFriB00yWVXTPma');

const StripeProvider = ({ children }) => {
  return (
    <Elements stripe={stripePromise}>
      {children}
    </Elements>
  );
};

export default StripeProvider;