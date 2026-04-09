"use client";

import Link from "next/link";
import { useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<"login" | "reset">("login");

  const normalizeAuthMessage = (error: unknown, currentMode: "login" | "reset") => {
    const rawMessage =
      error instanceof Error
        ? error.message
        : currentMode === "login"
          ? "Unable to log in right now."
          : "Unable to send reset link right now.";

    if (rawMessage.toLowerCase().includes("email rate limit exceeded")) {
      return currentMode === "reset"
        ? "Too many reset emails were requested recently. Wait a few minutes, then try again."
        : "Too many auth emails were requested recently. Wait a few minutes, then try again.";
    }

    return rawMessage;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      if (mode === "login") {
        const response = await fetch("/auth/password-login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        });

        const payload = (await response.json()) as { ok: boolean; message?: string };

        if (!payload.ok) {
          throw new Error(payload.message ?? "Unable to log in right now.");
        }

        window.location.href = "/player";
      } else {
        const supabase = createBrowserSupabaseClient();
        const redirectTo =
          typeof window === "undefined"
            ? undefined
            : `${window.location.origin}/auth/password-reset`;

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
        });

        if (error) {
          throw error;
        }

        setMessage("Password reset link sent. Check your email to continue.");
        setEmail("");
      }
    } catch (error) {
      setMessage(normalizeAuthMessage(error, mode));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#091317] p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block">
          <p className="mb-2 text-sm font-medium text-stone-200">Email address</p>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="you@example.com"
            className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-4 py-3 text-sm text-white outline-none"
          />
        </label>

        {mode === "login" ? (
          <label className="block">
            <p className="mb-2 text-sm font-medium text-stone-200">Password</p>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              placeholder="Enter your password"
              className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-4 py-3 text-sm text-white outline-none"
            />
          </label>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting
            ? mode === "login"
              ? "Signing in..."
              : "Sending..."
            : mode === "login"
              ? "Log in"
              : "Send reset link"}
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        {mode === "login" ? (
          <button
            type="button"
            onClick={() => {
              setMode("reset");
              setMessage(null);
            }}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white"
          >
            Forgot password
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setMessage(null);
            }}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white"
          >
            Back to login
          </button>
        )}
      </div>

      {message ? (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-stone-100">
          {message}
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-xs leading-6 text-stone-300">
        Need access help? Visit{" "}
        <Link href="/support" className="font-semibold text-cyan-100">
          Support
        </Link>{" "}
        or ask your gym admin to confirm your membership setup. First-time members must accept the Ravqen waiver and terms before the first workout begins.
      </div>
    </section>
  );
}
