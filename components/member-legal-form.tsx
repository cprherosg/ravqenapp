"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { acceptRequiredLegalDocumentsAction } from "@/app/player/actions";
import { RAVQEN_TERMS_VERSION, RAVQEN_WAIVER_VERSION } from "@/lib/legal";

export function MemberLegalForm() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const [acceptedName, setAcceptedName] = useState("");
  const [waiverChecked, setWaiverChecked] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    context.scale(ratio, ratio);
    context.lineCap = "round";
    context.lineJoin = "round";
    context.strokeStyle = "#f5f5f4";
    context.lineWidth = 2.4;
  }, []);

  const getPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  const beginSignature = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const point = getPoint(event);

    if (!canvas || !context || !point) {
      return;
    }

    isDrawingRef.current = true;
    canvas.setPointerCapture(event.pointerId);
    context.beginPath();
    context.moveTo(point.x, point.y);
  };

  const drawSignature = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) {
      return;
    }

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    const point = getPoint(event);

    if (!canvas || !context || !point) {
      return;
    }

    context.lineTo(point.x, point.y);
    context.stroke();
  };

  const endSignature = () => {
    if (!isDrawingRef.current) {
      return;
    }

    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (canvas) {
      setSignatureDataUrl(canvas.toDataURL("image/png"));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");

    if (!canvas || !context) {
      return;
    }

    context.clearRect(0, 0, canvas.width, canvas.height);
    setSignatureDataUrl("");
    isDrawingRef.current = false;
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!acceptedName.trim()) {
      setMessage("Please enter your full name exactly as your acceptance signature.");
      return;
    }

    if (!waiverChecked || !termsChecked) {
      setMessage("You must accept both the waiver and the terms before your first workout.");
      return;
    }

    if (!signatureDataUrl) {
      setMessage("Please sign with your finger before continuing.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    startTransition(async () => {
      const result = await acceptRequiredLegalDocumentsAction({
        acceptedName: acceptedName.trim(),
        signatureDataUrl,
        waiverVersion: RAVQEN_WAIVER_VERSION,
        termsVersion: RAVQEN_TERMS_VERSION,
      });

      if (!result.ok) {
        setMessage(result.message);
        setIsSubmitting(false);
        return;
      }

      router.replace("/player");
      router.refresh();
    });
  };

  return (
    <section className="rounded-[2rem] border border-white/10 bg-[#091317] p-5">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-cyan-100">One-time acceptance</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Accept waiver and terms</h2>
          <p className="mt-2 text-sm leading-7 text-stone-300">
            Before your first Ravqen workout, please review and accept both documents once.
          </p>
        </div>

        <label className="block">
          <p className="mb-2 text-sm font-medium text-stone-200">Full name</p>
          <input
            type="text"
            value={acceptedName}
            onChange={(event) => setAcceptedName(event.target.value)}
            placeholder="Enter your full name"
            className="w-full rounded-2xl border border-white/10 bg-[#0b1519] px-4 py-3 text-sm text-white outline-none"
          />
        </label>

        <label className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-4 text-sm text-stone-200">
          <input
            type="checkbox"
            checked={waiverChecked}
            onChange={(event) => setWaiverChecked(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-white/20 bg-[#0b1519]"
          />
          <span>
            I have read and accept the{" "}
            <Link href="/waiver" className="font-semibold text-cyan-100 underline underline-offset-4">
              Ravqen waiver
            </Link>
            .
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-4 text-sm text-stone-200">
          <input
            type="checkbox"
            checked={termsChecked}
            onChange={(event) => setTermsChecked(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-white/20 bg-[#0b1519]"
          />
          <span>
            I have read and accept the{" "}
            <Link href="/terms" className="font-semibold text-cyan-100 underline underline-offset-4">
              Ravqen terms of use
            </Link>
            .
          </span>
        </label>

        <div className="rounded-2xl border border-white/8 bg-black/20 px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-stone-200">Signature</p>
              <p className="mt-1 text-xs leading-6 text-stone-400">
                Sign with your finger or mouse inside the box below.
              </p>
            </div>
            <button
              type="button"
              onClick={clearSignature}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white"
            >
              Clear
            </button>
          </div>

          <div className="mt-3 overflow-hidden rounded-2xl border border-dashed border-white/12 bg-[#0b1519]">
            <canvas
              ref={canvasRef}
              onPointerDown={beginSignature}
              onPointerMove={drawSignature}
              onPointerUp={endSignature}
              onPointerLeave={endSignature}
              onPointerCancel={endSignature}
              className="block h-40 w-full touch-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-cyan-300 px-5 py-3 text-sm font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Saving acceptance..." : "Accept and continue"}
        </button>
      </form>

      {message ? (
        <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-50">
          {message}
        </div>
      ) : null}
    </section>
  );
}
