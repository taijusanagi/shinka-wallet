import { getDefaultWallets } from "@rainbow-me/rainbowkit";
import { Chain, configureChains, createClient } from "wagmi";
import { publicProvider } from "wagmi/providers/public";

import networkJsonFile from "../../../../contracts/network.json";

const defaultChainId = "80001";
const lastChainId = "1337";

const supportedChains: Chain[] = Object.entries(networkJsonFile).map(([chainId, network]) => {
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

const [defaultChain] = supportedChains.filter((chain) => String(chain.id) === defaultChainId);
const [lastChain] = supportedChains.filter((chain) => String(chain.id) === lastChainId);
const remainingChain = supportedChains.filter(
  (chain) => String(chain.id) !== defaultChainId && String(chain.id) !== lastChainId
);
const { chains, provider } = configureChains([defaultChain, ...remainingChain, lastChain], [publicProvider()]);

export interface RainbowWeb3AuthConnectorProps {
  chains: Chain[];
}

const { connectors } = getDefaultWallets({
  appName: "ShinkaWallet",
  chains,
});

export { chains };

export const wagmiClient = createClient({
  // autoConnect: true,
  connectors,
  provider,
});
