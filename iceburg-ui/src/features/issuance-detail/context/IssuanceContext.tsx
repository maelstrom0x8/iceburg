import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useAccount } from "wagmi";
import {
  useIssuanceState,
  type IssuanceOnChainState,
} from "../hooks/useIssuanceState";

interface IssuanceContextValue extends IssuanceOnChainState {
  address: `0x${string}`;
}

const IssuanceContext = createContext<IssuanceContextValue | null>(null);

interface IssuanceProviderProps {
  address: `0x${string}`;
  children: ReactNode;
}

export function IssuanceProvider({ address, children }: IssuanceProviderProps) {
  const { address: walletAddress } = useAccount();
  const state = useIssuanceState(address, walletAddress);

  const value = useMemo<IssuanceContextValue>(
    () => ({ ...state, address }),
    [state, address],
  );

  return (
    <IssuanceContext.Provider value={value}>
      {children}
    </IssuanceContext.Provider>
  );
}

export function useIssuanceContext(): IssuanceContextValue {
  const ctx = useContext(IssuanceContext);
  if (!ctx) {
    throw new Error(
      "useIssuanceContext must be used inside an <IssuanceProvider>",
    );
  }
  return ctx;
}
