import Link from "next/link";
import { PublicFooter } from "@/components/public-footer";
import { getLaunchPlans, getSupportEmail } from "@/lib/billing";

export default function PlansPage() {
  const plans = getLaunchPlans();
  const supportEmail = getSupportEmail();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#17383f_0%,#071015_45%,#020508_100%)] px-4 py-8 text-stone-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <section className="rounded-[2.2rem] border border-cyan-300/12 bg-white/6 p-6 backdrop-blur md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">Plans</p>
              <h1 className="mt-2 text-3xl font-semibold text-white md:text-5xl">
                Choose the Ravqen access model that fits your gym rhythm.
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-300 md:text-base">
                Start with structured solo training, guided sessions, and a member dashboard that
                keeps effort, load, and progression visible across the week.
              </p>
            </div>
            <Link
              href="/login"
              className="rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Member login
            </Link>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.id}
              className="rounded-[2rem] border border-white/10 bg-[#091317] p-6 shadow-2xl shadow-black/20"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">{plan.publicLabel}</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">{plan.name}</h2>
              <p className="mt-2 text-lg font-semibold text-cyan-100">{plan.priceLabel}</p>
              <p className="mt-4 text-sm leading-7 text-stone-300">{plan.summary}</p>
              <div className="mt-5 space-y-3">
                {plan.included.map((item) => (
                  <div key={item} className="rounded-[1.2rem] border border-white/8 bg-white/4 px-4 py-3 text-sm text-stone-100">
                    {item}
                  </div>
                ))}
              </div>
              <a
                href={plan.ctaHref}
                target={plan.available ? "_blank" : undefined}
                rel={plan.available ? "noreferrer" : undefined}
                className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200"
              >
                {plan.ctaLabel}
              </a>
            </article>
          ))}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_1fr]">
          <article className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-100">What members get</p>
            <div className="mt-4 space-y-3">
              {[
                "A guided 60-minute session flow with warm-up, main work, and cooldown.",
                "Member dashboard with weekly usage, streaks, movement trends, and history.",
                "Structured programming that changes with the training calendar instead of repeating random workouts.",
              ].map((item) => (
                <div key={item} className="rounded-[1.3rem] border border-white/8 bg-black/20 px-4 py-3 text-sm leading-7 text-stone-200">
                  {item}
                </div>
              ))}
            </div>
          </article>
          <article className="rounded-[2rem] border border-white/10 bg-[#091317] p-6">
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-100">Need help before launch?</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Pricing links not live yet?</h2>
            <p className="mt-3 text-sm leading-7 text-stone-300">
              Ravqen can still support private beta and assisted onboarding before automated billing
              is switched on. Reach out if you want help assigning the right plan structure.
            </p>
            <a
              href={`mailto:${supportEmail}`}
              className="mt-5 inline-flex rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Contact support
            </a>
          </article>
        </section>

        <PublicFooter />
      </div>
    </main>
  );
}
