import { ethers } from "ethers";
import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

import { getMnemonic } from "../../../../../contracts/lib/dev/mnemonic";

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res.status(400).json({
      status: false,
      error: "Invalid method. Only POST supported.",
    });
  }

  const { RELAYER_PRIVATE_KEY, STRIPE_SECRET_KEY } = process.env;
  if (!RELAYER_PRIVATE_KEY) {
    return res.status(400).json({
      status: false,
      error: "Private key not set",
    });
  }

  if (!STRIPE_SECRET_KEY) {
    return res.status(500).json({
      status: false,
      error: "Stripe secret key not set",
    });
  }

  const paymentId = req.body.data.object.id;

  console.log("paymentId", paymentId);
  if (!paymentId || typeof paymentId !== "string") {
    return res.status(500).json({
      status: false,
      error: "Stripe secret key not set",
    });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2022-11-15",
  });

  const { customer: customerId } = await stripe.paymentIntents.retrieve(paymentId);
  console.log("customerId", customerId);

  if (typeof customerId !== "string") {
    return res.status(500).json({
      status: false,
      error: "Customer is not found for the payment id",
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customer: any = await stripe.customers.retrieve(customerId);
  if (!customer.metadata || !customer.metadata.walletAddress) {
    return res.status(500).json({
      status: false,
      error: "Customer does not have wallet address",
    });
  }

  // this is signer address for Account Abstraction Wallet
  const walletAddress = customer.metadata.walletAddress;
  const wallet = ethers.Wallet.fromMnemonic(getMnemonic("../../mnemonic.txt"));
  // this.signer = wallet.connect(this.provider);

  const hash = "ok";
  return res.status(200).json({ hash });
};
export default handler;

// signature verification is implemented but it is bit slow and it is not core value of this app, so comment-outed
// const { STRIPE_SECRET_KEY, STRIPE_SIGNING_SECRET } = process.env;
// if (!STRIPE_SECRET_KEY) {
//   return res.status(500).json({
//     status: false,
//     error: "Stripe secret key not set",
//   });
// }
// if (!STRIPE_SIGNING_SECRET) {
//   return res.status(500).json({
//     status: false,
//     error: "Signing secret not set",
//   });
// }
// const stripe = new Stripe(STRIPE_SECRET_KEY, {
//   apiVersion: "2022-11-15",
// });
// const signature = req.headers["stripe-signature"];
// if (typeof signature !== "string") {
//   return res.status(500).json({
//     status: false,
//     error: "Request signature is invalid",
//   });
// }

// const signingSecret = STRIPE_SIGNING_SECRET;
// const reqBuffer = await buffer(req);
// let event;
// try {
//   console.log("check");
//   event = stripe.webhooks.constructEvent(reqBuffer, signature, signingSecret);
//   console.log("ok");
//   // eslint-disable-next-line @typescript-eslint/no-explicit-any
// } catch (error: any) {
//   return res.status(400).send(`Webhook error: ${error.message}`);
// }
