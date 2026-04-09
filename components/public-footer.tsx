import Link from "next/link";
import Image from "next/image";
import { getSupportEmail } from "@/lib/billing";

export function PublicFooter() {
  const supportEmail = getSupportEmail();

  return (
    <footer className="mt-10 rounded-[2rem] border border-white/10 bg-black/20 px-5 py-5 text-sm text-stone-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex min-h-[3.5rem] items-center justify-center rounded-xl border border-cyan-300/12 bg-cyan-300/10 px-3 py-2">
              <Image
                src="/ravqen-logo.svg"
                alt="Ravqen logo"
                width={116}
                height={36}
                className="h-auto w-full max-w-[7.25rem]"
              />
            </div>
            <p className="font-semibold text-white">Ravqen</p>
          </div>
          <p className="mt-1 text-xs uppercase tracking-[0.22em] text-stone-400">
            Structured solo training for commercial gyms
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/plans" className="transition hover:text-white">
            Plans
          </Link>
          <Link href="/support" className="transition hover:text-white">
            Support
          </Link>
          <Link href="/privacy" className="transition hover:text-white">
            Privacy
          </Link>
          <Link href="/waiver" className="transition hover:text-white">
            Waiver
          </Link>
          <Link href="/terms" className="transition hover:text-white">
            Terms
          </Link>
          <a href={`mailto:${supportEmail}`} className="transition hover:text-white">
            {supportEmail}
          </a>
        </div>
      </div>
    </footer>
  );
}
