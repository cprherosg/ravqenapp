import { LegalPageShell } from "@/components/legal-page-shell";
import { RAVQEN_TERMS_SECTIONS, RAVQEN_TERMS_VERSION } from "@/lib/legal";

export default function TermsPage() {
  return (
    <LegalPageShell
      eyebrow="Terms"
      title="Terms of use"
      summary={`Version ${RAVQEN_TERMS_VERSION}. Each member must accept these terms once before starting their first Ravqen workout.`}
      closeHref="/player/legal"
    >
      {RAVQEN_TERMS_SECTIONS.map((section) => (
        <div key={section.title}>
          <h2 className="text-lg font-semibold text-white">{section.title}</h2>
          <p>{section.body}</p>
        </div>
      ))}
    </LegalPageShell>
  );
}
