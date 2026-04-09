import Link from "next/link";

type LegalPageShellProps = {
  eyebrow: string;
  title: string;
  summary: string;
  closeHref?: string;
  children: React.ReactNode;
};

export function LegalPageShell({
  eyebrow,
  title,
  summary,
  closeHref,
  children,
}: LegalPageShellProps) {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#17383f_0%,#071015_45%,#020508_100%)] px-4 py-8 text-stone-50">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Back home
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/plans"
              className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-50 transition hover:bg-cyan-300/15"
            >
              View plans
            </Link>
            {closeHref ? (
              <Link
                href={closeHref}
                aria-label="Close document"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-lg font-semibold text-white transition hover:bg-white/10"
              >
                ×
              </Link>
            ) : null}
          </div>
        </div>

        <section className="rounded-[2rem] border border-cyan-300/12 bg-white/6 p-6 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">{eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-stone-300">{summary}</p>
        </section>

        <section className="rounded-[2rem] border border-white/10 bg-[#091317] p-6">
          <div className="space-y-6 text-sm leading-7 text-stone-200">{children}</div>
        </section>
      </div>
    </main>
  );
}
