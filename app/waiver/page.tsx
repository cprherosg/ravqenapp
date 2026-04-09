import { LegalPageShell } from "@/components/legal-page-shell";
import { RAVQEN_WAIVER_SECTIONS, RAVQEN_WAIVER_VERSION } from "@/lib/legal";

export default function WaiverPage() {
  return (
    <LegalPageShell
      eyebrow="Waiver"
      title="Ravqen training waiver"
      summary={`Version ${RAVQEN_WAIVER_VERSION}. Each member must accept this waiver once before starting their first Ravqen workout.`}
      closeHref="/player/legal"
    >
      {RAVQEN_WAIVER_SECTIONS.map((section) => (
        <div key={section.title}>
          <h2 className="text-lg font-semibold text-white">{section.title}</h2>
          <p>{section.body}</p>
        </div>
      ))}
    </LegalPageShell>
  );
}
