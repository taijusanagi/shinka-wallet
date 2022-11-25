/* eslint-disable camelcase */
import { ethers } from "ethers";
import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

import { getMnemonic } from "../../../../../contracts/lib/dev/mnemonic";
import { getNetworkByPriceId } from "../../../../../contracts/lib/dev/network";
import { ShinkaWalletPaymaster__factory } from "../../../../../contracts/typechain-types";

// no sender & double spend check for rapid development
// this is for checkout.session.completed from stripe
// stackoverflow.com/questions/63544631/how-can-i-get-the-product-id-in-stripe-webhook
const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res.status(400).json({
      status: false,
      error: "Invalid method. Only POST supported.",
    });
  }
  const { STRIPE_SECRET_KEY, RELAYER_PRIVATE_KEY } = process.env;
  if (!STRIPE_SECRET_KEY) {
    return res.status(500).json({
      status: false,
      error: "Stripe secret key not set",
    });
  }
  if (!RELAYER_PRIVATE_KEY) {
    return res.status(400).json({
      status: false,
      error: "Private key not set",
    });
  }

  const customerId = req.body.data.object.customer;
  if (!customerId) {
    return res.status(500).json({
      error: "customer id not set",
    });
  }

  const priceId = req.body.data.object.metadata.priceId;
  if (!priceId) {
    return res.status(500).json({
      error: "price id not set",
    });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2022-11-15",
  });

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
  const networkConfig = getNetworkByPriceId(priceId);
  const provider = new ethers.providers.JsonRpcProvider(networkConfig.rpc);
  const signer = wallet.connect(provider);
  const paymaster = ShinkaWalletPaymaster__factory.connect(networkConfig.deployments.paymaster, signer);
  // this usd amount should get from stripe
  // hard-code for rapid development
  const tx = await paymaster.processDepositWithCreditCard(walletAddress, 100);
  return res.status(200).json({ hash: tx.hash });
};
export default handler;
