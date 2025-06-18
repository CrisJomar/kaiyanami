import React from 'react';
import { CardElement } from '@stripe/react-stripe-js';

const CARD_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      fontFamily: '"Inter", sans-serif',
      '::placeholder': {
        color: '#aab7c4',
      },
    },
    invalid: {
      color: '#9e2146',
    },
  },
  hidePostalCode: true
};

const CardInput = ({ onChange }) => {
  return (
    <div className="border border-gray-300 rounded-md p-3">
      <CardElement options={CARD_OPTIONS} onChange={onChange} />
    </div>
  );
};

export default CardInput;