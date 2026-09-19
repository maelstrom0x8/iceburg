import { AppSubHeader } from "../../components/layout/AppSubHeader";
import { LaunchForm } from "../../features/issuer-console/components/LaunchForm";

function IssueIcon() {
  return (
    <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export function IssuePage() {
  return (
    <div>
      <AppSubHeader
        icon={<IssueIcon />}
        title="Create Offering"
        description="Deploy a new primary sealed-bid security token issuance via IssuanceFactory."
        stats={[
          { label: "Mechanism", value: "Sealed-Bid Commit-Reveal" },
          { label: "Settlement", value: "Uniform Price" },
        ]}
      />
      <div className="mx-auto max-w-screen-xl px-6 py-8">
        <LaunchForm />
      </div>
    </div>
  );
}
