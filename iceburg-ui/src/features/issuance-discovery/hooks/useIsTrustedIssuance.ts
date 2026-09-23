import { useIssuances } from "./useIssuances";

export function useIsTrustedIssuance(address: `0x${string}` | undefined): {
  isTrusted: boolean;
  isLoading: boolean;
} {
  const { issuances, isLoading } = useIssuances();

  const isTrusted =
    address !== undefined &&
    issuances.some((issuance) => issuance.issuanceAddress.toLowerCase() === address.toLowerCase());

  return { isTrusted, isLoading };
}
