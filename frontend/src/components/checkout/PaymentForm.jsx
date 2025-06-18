import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { toast } from 'react-toastify';

const PaymentForm = ({ onSubmit, isSubmitting, amount = 0, email = '' }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [cardError, setCardError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      console.error('Stripe or Elements not loaded');
      return;
    }
    
    setIsProcessing(true);
    console.log("Processing payment submission...");
    
    try {
      // Create payment method using the card element
      console.log("Creating payment method...");
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: elements.getElement(CardElement),
        billing_details: {
          email: email,
        },
      });
      
      if (error) {
        console.error('Payment error:', error);
        setCardError(error.message);
        setIsProcessing(false);
        return;
      }
      
      console.log('Payment method created:', paymentMethod.id);
      
      // Call the parent component's submit handler
      console.log('Passing payment method to parent component...');
      await onSubmit(paymentMethod.id);
      console.log('Parent handler completed');
    } catch (err) {
      console.error('Payment submission error:', err);
      setCardError('An unexpected error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-6">
        <label className="block text-gray-700 mb-2">Credit Card Information</label>
        <div className="p-3 border rounded-md shadow-sm bg-white">
          <CardElement />
        </div>
        {cardError && <p className="mt-2 text-red-600 text-sm">{cardError}</p>}
      </div>

      <button
        type="submit"
        disabled={!stripe || isProcessing || isSubmitting}
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing || isSubmitting ? 'Processing...' : 'Place Order'}
      </button>
    </form>
  );
};

export default PaymentForm;