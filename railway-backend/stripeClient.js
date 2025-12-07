const Stripe = require('stripe');

let stripeClient = null;

function getStripeClient() {
  if (!stripeClient) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY not configured');
    }
    stripeClient = new Stripe(secretKey, {
      apiVersion: '2023-10-16',
    });
  }
  return stripeClient;
}

async function getUncachableStripeClient() {
  return getStripeClient();
}

async function getStripePublishableKey() {
  return process.env.STRIPE_PUBLISHABLE_KEY || '';
}

async function getStripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY || '';
}

module.exports = {
  getUncachableStripeClient,
  getStripePublishableKey,
  getStripeSecretKey
};
