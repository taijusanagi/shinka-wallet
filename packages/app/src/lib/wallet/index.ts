import { getDefaultWallets } from "@rainbow-me/rainbowkit";
import { Chain, configureChains, createClient } from "wagmi";
import { publicProvider } from "wagmi/providers/public";

import networkJsonFile from "../../../../contracts/network.json";

const supportedChains: Chain[] = Object.entries(networkJsonFile)
  .filter(([, chain]) => {
    if (process.env.NODE_ENV === "production") {
      return chain.env !== "localhost";
    } else {
      return true;
    }
  })
  .sort(([, a], [, b]) => {
    return a.index - b.index;
  })
  .map(([chainId, network]) => {
    return {
      id: Number(chainId),
      name: network.name,
      network: network.key,
      iconUrl: `/assets/chains/${network.icon}`,
      nativeCurrency: {
        decimals: 18,
        name: network.currency,
        symbol: network.currency,
      },
      rpcUrls: {
        default: network.rpc,
      },
      blockExplorers: {
        default: { name: network.explorer.name, url: network.explorer.url },
      },
      testnet: true,
    };
  });

const { chains, provider } = configureChains(supportedChains, [publicProvider()]);

export interface RainbowWeb3AuthConnectorProps {
  chains: Chain[];
}

const { connectors } = getDefaultWallets({
  appName: "ShinkaWallet",
  chains,
});

export { chains };

export const rainbow = ({ chains }: MyWalletOptions): Wallet => ({
  id: "my-wallet",
  name: "My Wallet",
  iconUrl: "https://my-image.xyz",
  iconBackground: "#0c2f78",
  downloadUrls: {
    android: "https://my-wallet/android",
    ios: "https://my-wallet/ios",
    qrCode: "https://my-wallet/qr",
  },
  createConnector: () => {
    const connector = getWalletConnectConnector({ chains });

    return {
      connector,
      mobile: {
        getUri: async () => {
          const { uri } = (await connector.getProvider()).connector;
          return uri;
        },
      },
      qrCode: {
        getUri: async () => (await connector.getProvider()).connector.uri,
        instructions: {
          learnMoreUrl: "https://my-wallet/learn-more",
          steps: [
            {
              description: "We recommend putting My Wallet on your home screen for faster access to your wallet.",
              step: "install",
              title: "Open the My Wallet app",
            },
            {
              description: "After you scan, a connection prompt will appear for you to connect your wallet.",
              step: "scan",
              title: "Tap the scan button",
            },
          ],
        },
      },
    };
  },
});

export const wagmiClient = createClient({
  autoConnect: true,
  connectors,
  provider,
});
