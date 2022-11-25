import WalletConnect from "@walletconnect/client";
import { useEffect, useMemo, useState } from "react";

import { Tx } from "@/types/Tx";

import { useConnected } from "./useConnected";
import { useErrorToast } from "./useErrorToast";
import { useShinkaWallet } from "./useShinkaWallet";

export interface App {
  name: string;
  url: string;
}

const uriStorageKey = "wallet-connect-uri";

export const useWalletConnect = () => {
  const { connected } = useConnected();
  const { shinkaWallet } = useShinkaWallet();

  const errorToast = useErrorToast();

  const [uri, setURI] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [instance, setInstance] = useState<WalletConnect>();
  const [app, setApp] = useState<App>();
  const [tx, setTx] = useState<Tx>();

  const [id, setId] = useState<number>();

  const isConnected = useMemo(() => {
    return !!instance;
  }, [instance]);

  const clear = () => {
    window.localStorage.removeItem(uriStorageKey);
    setURI("");
    setIsConnecting(false);
    setInstance(undefined);
    setApp(undefined);
  };

  const disconnect = async () => {
    if (instance) {
      await instance.killSession();
    }
    clear();
  };

  const set = (instance: WalletConnect, app: App) => {
    setApp(app);
    setIsConnecting(false);
    setInstance(instance);
  };

  const connect = async () => {
    try {
      if (!connected || !shinkaWallet) {
        throw new Error("shinka wallet is not initialized");
      }

      console.log("connecting", uri);

      setIsConnecting(true);
      let instance = new WalletConnect({
        uri,
      });
      if (instance.connected) {
        if (instance.peerMeta) {
          set(instance, { ...instance.peerMeta });
        } else {
          await instance.killSession();
          instance = new WalletConnect({
            uri,
          });
        }
      }
      instance.on("session_request", async (error, payload) => {
        if (error) {
          throw error;
        }
        instance.approveSession({ chainId: Number(connected.chainId), accounts: [shinkaWallet.address] });
        const { peerMeta } = payload.params[0];
        set(instance, { ...peerMeta });
        window.localStorage.setItem(uriStorageKey, uri);
      });
      instance.on("call_request", async (error, payload) => {
        if (error) {
          throw error;
        }
        if (payload.method === "eth_sendTransaction") {
          setId(payload.id);
          setTx({
            target: payload.params[0].to,
            data: payload.params[0].data,
            value: payload.params[0].value,
            gasLimit: payload.params[0].gas,
          });
        }
        if (payload.method === "personal_sign") {
          throw new Error("personal_sign is not implemneted");
        }
        if (payload.method === "eth_signTypedData") {
          throw new Error("eth_signTypedData is not implemneted");
        }
      });
      instance.on("disconnect", (error) => {
        if (error) {
          throw error;
        }
        clear();
      });
    } catch (e) {
      errorToast.open(e);
      clear();
    }
  };

  useEffect(() => {
    const uri = window.localStorage.getItem(uriStorageKey);
    if (uri) {
      setURI(uri);
    }
  }, [shinkaWallet]);

  return {
    uri,
    isConnecting,
    isConnected,
    instance,
    app,
    tx,
    id,
    setURI,
    clear,
    disconnect,
    connect,
    setTx,
    setId,
  };
};
