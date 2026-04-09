import { LegalPageShell } from "@/components/legal-page-shell";

export default function PrivacyPage() {
  return (
    <LegalPageShell
      eyebrow="Privacy"
      title="Privacy notice"
      summary="This is the operator-facing baseline privacy notice for Ravqen before public launch. It should be finalized with legal review before charging public users."
    >
      <div>
        <h2 className="text-lg font-semibold text-white">What Ravqen stores</h2>
        <p>
          Ravqen stores member identity details, membership status, workout session history, effort
          feedback, and exercise-level performance entries so the product can deliver guided
          workouts and progression tracking.
        </p>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">Why it is stored</h2>
        <p>
          This data is used to authenticate members, determine workout access, display session
          history, and improve programming relevance through effort and movement tracking.
        </p>
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white">Pre-launch note</h2>
        <p>
          Before public launch, this notice should be updated with the real business entity, data
          retention policy, support contact, and the third-party services used in production.
        </p>
      </div>
    </LegalPageShell>
  );
}
