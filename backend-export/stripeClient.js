const Stripe = require('stripe');

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  
  return new Stripe(secretKey, {
    apiVersion: '2023-10-16',
  });
}

async function getUncachableStripeClient() {
  return getStripeClient();
}

async function getStripePublishableKey() {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  
  if (!publishableKey) {
    throw new Error('STRIPE_PUBLISHABLE_KEY not configured');
  }
  
  return publishableKey;
}

async function getStripeSecretKey() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY not configured');
  }
  
  return secretKey;
}

module.exports = {
  getUncachableStripeClient,
  getStripePublishableKey,
  getStripeSecretKey
};
