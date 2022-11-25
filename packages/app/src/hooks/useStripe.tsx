import { loadStripe } from "@stripe/stripe-js";
import { useState } from "react";

import { useConnected } from "./useConnected";
import { useErrorToast } from "./useErrorToast";

export const useStripe = () => {
  const { connected } = useConnected();
  const errorToast = useErrorToast();
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  const checkout = async () => {
    setIsProcessingCheckout(true);
    try {
      const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!stripePublishableKey) {
        throw new Error("Stripe publishable key not set");
      }
      if (!connected) {
        throw new Error("connected not defined");
      }
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        body: JSON.stringify({ priceId: connected.networkConfig.priceId }),
      });
      const session = await res.json();
      const stripe = await loadStripe(stripePublishableKey, {
        apiVersion: "2022-11-15",
      });
      if (!stripe) {
        throw new Error("failed to load stripe");
      }
      await stripe.redirectToCheckout({
        sessionId: session.id,
      });
    } catch (e) {
      errorToast.open(e);
    } finally {
      setIsProcessingCheckout(false);
    }
  };

  return { isProcessingCheckout, checkout };
};
