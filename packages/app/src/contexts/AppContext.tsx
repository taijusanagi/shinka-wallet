import { AuthContextProvider } from "./AuthContext";
import { ConnectedContextProvider } from "./ConnectedContext";
import { ShinkaWalletContextProvider } from "./ShinkaWalletContext";

export interface AppContextWapperProps {
  children: React.ReactNode;
}

// this is helper provider used in _app.tsx
// this context should be used in this order
export const AppContextProvider: React.FC<AppContextWapperProps> = ({ children }) => {
  return (
    <ConnectedContextProvider>
      <AuthContextProvider>
        <ShinkaWalletContextProvider>{children}</ShinkaWalletContextProvider>
      </AuthContextProvider>
    </ConnectedContextProvider>
  );
};
