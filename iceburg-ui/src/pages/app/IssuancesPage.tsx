import { IssuanceTable } from "../../features/issuance-discovery/components/IssuanceTable";

export function IssuancesPage() {
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="border-b border-white/10 pb-4">
        <h1 className="text-2xl font-bold text-white tracking-tight">Active Offerings</h1>
        <p className="text-sm text-slate-400 mt-1">
          Explore and participate in primary sealed-bid security token auctions on Iceburg.
        </p>
      </div>

      <IssuanceTable />
    </div>
  );
}
