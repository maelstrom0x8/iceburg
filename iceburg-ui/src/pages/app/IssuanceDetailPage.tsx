import { useParams } from "react-router-dom";
import { isAddress } from "viem";
import { useReadContract } from "wagmi";
import { IssuanceProvider } from "../../features/issuance-detail/context/IssuanceContext";
import { IssuanceDetail } from "../../features/issuance-detail/components/IssuanceDetail";
import { AppSubHeader } from "../../components/layout/AppSubHeader";
import { IssuanceAbi, SecurityTokenAbi } from "../../contracts";
import { StateBadge } from "../../components/ui/StateBadge";

function DetailPageHeader({ address }: { address: `0x${string}` }) {
  const { data: state } = useReadContract({
    address,
    abi: IssuanceAbi,
    functionName: "state",
  });

  const { data: rawParams } = useReadContract({
    address,
    abi: IssuanceAbi,
    functionName: "params",
  });

  const { data: bidCount } = useReadContract({
    address,
    abi: IssuanceAbi,
    functionName: "bidCount",
  });

  const params = rawParams as
    | readonly [bigint, bigint, number, number, bigint, `0x${string}`, `0x${string}`, bigint, bigint, bigint]
    | undefined;

  const securityTokenAddress = params?.[6];

  const { data: tokenName } = useReadContract({
    address: securityTokenAddress,
    abi: SecurityTokenAbi,
    functionName: "name",
    query: { enabled: Boolean(securityTokenAddress) },
  });

  const { data: tokenSymbol } = useReadContract({
    address: securityTokenAddress,
    abi: SecurityTokenAbi,
    functionName: "symbol",
    query: { enabled: Boolean(securityTokenAddress) },
  });

  const stateNum = state !== undefined ? Number(state) : undefined;
  const reservePrice = params ? params[1] : undefined;

  const reserveStr = reservePrice !== undefined
    ? `$${(Number(reservePrice) / 1e18).toFixed(2)}`
    : "—";

  return (
    <AppSubHeader
      icon={
        <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 01-.75.75h-.75" />
        </svg>
      }
      title={
        tokenName && tokenSymbol
          ? `${String(tokenName)} (${String(tokenSymbol)})`
          : "Sealed-Bid Offering"
      }
      description={`Contract: ${address.slice(0, 10)}...${address.slice(-8)}`}
      stats={[
        { label: "State", value: <StateBadge state={stateNum} /> },
        { label: "Reserve Price", value: reserveStr },
        { label: "Bids Revealed", value: bidCount !== undefined ? bidCount.toString() : "—" },
      ]}
    />
  );
}

export function IssuanceDetailPage() {
  const { address } = useParams<{ address: string }>();

  if (!address || !isAddress(address)) {
    return (
      <div className="mx-auto max-w-screen-xl px-6 py-16 text-center">
        <h2 className="text-xl font-semibold text-white mb-2">Invalid Offering Address</h2>
        <p className="text-sm" style={{ color: "var(--color-app-muted)" }}>
          The contract address in the URL is not a valid Ethereum address.
        </p>
      </div>
    );
  }

  const validAddress = address as `0x${string}`;

  return (
    <IssuanceProvider address={validAddress}>
      <DetailPageHeader address={validAddress} />
      <div className="mx-auto max-w-screen-xl px-6 py-8">
        <IssuanceDetail />
      </div>
    </IssuanceProvider>
  );
}
