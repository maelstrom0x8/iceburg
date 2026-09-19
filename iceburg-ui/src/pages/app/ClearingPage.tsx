import { AppSubHeader } from "../../components/layout/AppSubHeader";
import { ClearingWorkbench } from "../../features/clearing-tools/components/ClearingWorkbench";

function ClearingIcon() {
  return (
    <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
    </svg>
  );
}

export function ClearingPage() {
  return (
    <div>
      <AppSubHeader
        icon={<ClearingIcon />}
        title="Clearing Workbench"
        description="Run the off-chain uniform-price solver and submit clearing proposals on-chain."
        stats={[
          { label: "Role", value: "Solver / Challenger" },
          { label: "Reward", value: "Proposer Bond" },
        ]}
      />
      <div className="mx-auto max-w-screen-xl px-6 py-8">
        <ClearingWorkbench />
      </div>
    </div>
  );
}
