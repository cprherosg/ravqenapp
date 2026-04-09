import { redirect } from "next/navigation";
import Image from "next/image";
import { LoginForm } from "@/components/login-form";
import { getServerAuthUser } from "@/lib/supabase/session";

export default async function LoginPage() {
  const authUser = await getServerAuthUser();

  if (authUser) {
    redirect("/player");
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#17383f_0%,#071015_45%,#020508_100%)] px-4 py-8 text-stone-50">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <section className="rounded-[2rem] border border-cyan-300/12 bg-white/6 p-6 backdrop-blur">
          <div className="flex min-h-[5.5rem] w-full items-center justify-center rounded-[1.6rem] border border-cyan-300/12 bg-cyan-300/10 px-4 py-4">
            <Image
              src="/ravqen-logo.svg"
              alt="Ravqen logo"
              width={280}
              height={88}
              className="h-auto w-full max-w-[17rem]"
              priority
            />
          </div>
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">
            Member access
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Log in to Ravqen</h1>
          <p className="mt-3 text-sm leading-7 text-stone-300">
            Sign in with your email and password to open your daily guided workout.
          </p>
        </section>

        <LoginForm />

        <section className="rounded-[2rem] border border-white/10 bg-[#091317] p-5">
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">First time here?</p>
          <div className="mt-3 space-y-3 text-sm leading-7 text-stone-300">
            <p>Ask your admin to create your member account first, then use the password reset flow to set your password.</p>
            <p>Before your first ever workout, Ravqen will ask you to accept the waiver and terms once.</p>
            <p>If your plan is not active yet, your dashboard may show a blocked workout message until your membership is configured.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
