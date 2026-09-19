import { useParams } from "react-router-dom";
import { isAddress } from "viem";
import { IssuanceProvider } from "../../features/issuance-detail/context/IssuanceContext";
import { IssuanceDetail } from "../../features/issuance-detail/components/IssuanceDetail";

export function IssuanceDetailPage() {
  const { address } = useParams<{ address: string }>();

  if (!address || !isAddress(address)) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center text-slate-400">
        <h2 className="text-xl font-semibold text-white mb-2">Invalid Offering Address</h2>
        <p className="text-sm">The contract address specified in the URL is invalid.</p>
      </div>
    );
  }

  const validAddress = address as `0x${string}`;

  return (
    <IssuanceProvider address={validAddress}>
      <IssuanceDetail />
    </IssuanceProvider>
  );
}
