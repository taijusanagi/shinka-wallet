import { useEffect, useState } from "react";

import { useConnected } from "./useConnected";
import { useIsSignedIn } from "./useIsSignedIn";

export const useIsSubscribed = () => {
  const { isSignedIn } = useIsSignedIn();
  const { connectedChainConfig } = useConnected();

  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!isSignedIn || !connectedChainConfig) {
      setIsSubscribed(false);
      return;
    }
    fetch("/api/stripe/status", {
      method: "POST",
      body: JSON.stringify({ priceId: connectedChainConfig.priceId }),
    })
      .then(async (res) => {
        const { status } = await res.json();
        if (status) {
          setIsSubscribed(true);
        }
      })
      .catch(() => {
        setIsSubscribed(false);
      });
  }, [isSignedIn, connectedChainConfig]);

  return { isSubscribed };
};
