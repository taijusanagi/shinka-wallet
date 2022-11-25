import { NextApiRequest, NextApiResponse } from "next";
import { getToken } from "next-auth/jwt";
import Stripe from "stripe";

// this is to checkout by stripe
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res.status(400).json({
      error: "Invalid method. Only POST supported.",
    });
  }
  const { NEXT_PUBLIC_AUTH_DOMAIN: domain, STRIPE_SECRET_KEY } = process.env;
  if (!domain) {
    return res.status(500).send("Missing NEXT_PUBLIC_AUTH_DOMAIN environment variable");
  }
  if (!STRIPE_SECRET_KEY) {
    return res.status(500).json({
      error: "Stripe secret key not set",
    });
  }
  const { priceId } = JSON.parse(req.body);
  if (!priceId) {
    return res.status(500).json({
      error: "Stripe price id not set",
    });
  }

  const token = await getToken({ req });
  const walletAddress = token?.sub;
  if (!walletAddress) {
    return res.status(401).json({
      error: "Must be logged in to create a checkout session",
    });
  }
  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2022-11-15",
  });
  const customers = await stripe.customers.search({
    query: `metadata["walletAddress"]:"${walletAddress}"`,
  });
  let customer;
  if (customers.data.length > 0) {
    customer = customers.data[0];
  } else {
    customer = await stripe.customers.create({
      metadata: {
        walletAddress,
      },
    });
  }

  // stackoverflow.com/questions/63544631/how-can-i-get-the-product-id-in-stripe-webhook
  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    success_url: domain,
    line_items: [{ price: priceId, quantity: 1 }],
    cancel_url: domain,
    mode: "payment",
    metadata: {
      priceId,
    },
  });
  return res.status(200).json(session);
};

export default handler;
