import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useAccount } from "wagmi";

export type AuthState =
  | { status: "unauthenticated" }
  | { status: "authenticated"; method: "wallet"; address: `0x${string}` };

const AuthContext = createContext<AuthState>({ status: "unauthenticated" });

export function AuthProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();

  const state = useMemo<AuthState>(() => {
    if (isConnected && address) {
      return { status: "authenticated", method: "wallet", address };
    }
    return { status: "unauthenticated" };
  }, [isConnected, address]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
