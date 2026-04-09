import { ResetPasswordForm } from "@/components/reset-password-form";

export default function PasswordResetPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#17383f_0%,#071015_45%,#020508_100%)] px-4 py-8 text-stone-50">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <section className="rounded-[2rem] border border-cyan-300/12 bg-white/6 p-6 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-100">
            Password recovery
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Set a new password</h1>
          <p className="mt-3 text-sm leading-7 text-stone-300">
            Choose a new password for your Ravqen account, then head back into your workout.
          </p>
        </section>

        <ResetPasswordForm />
      </div>
    </main>
  );
}
