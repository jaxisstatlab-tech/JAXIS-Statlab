"use client";

import React, { useEffect, useRef, useState, useTransition } from "react";
import { Button } from "@repo/ui";
import { Warning } from "@phosphor-icons/react";
import { Panel, PanelBody, PanelHeader } from "@/components/dashboard/Panel";
import { updateOwnSignature } from "@/features/staff/actions";
import { SIGNATURE_HEIGHT as H, SIGNATURE_WIDTH as W, strokesToSignature } from "@/lib/signature-rules";

// "Your signature": drawn with a mouse, finger or pen and saved as a small SVG (see src/lib/signature-rules.ts).
// Shown on white, the way it looks on the certificate.

type Stroke = Array<[number, number]>;

export function SignatureCard({
  initial,
  required,
  onSaved,
}: {
  initial: string | null;
  /** Reviewers: the signature goes on every certificate they approve, so it can be replaced but not removed. */
  required: boolean;
  onSaved: (signatureUrl: string | null, message: string) => void;
}) {
  const [saved, setSaved] = useState<string | null>(initial);
  const [drawingMode, setDrawingMode] = useState(!initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, start] = useTransition();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Stroke[]>([]);
  const active = useRef(false);

  // A fresh pad each time drawing starts.
  useEffect(() => {
    if (!drawingMode) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#111111";
    strokes.current = [];
  }, [drawingMode]);

  const point = (e: React.PointerEvent<HTMLCanvasElement>): [number, number] => {
    const r = e.currentTarget.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
  };
  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    active.current = true;
    const p = point(e);
    strokes.current.push([p]);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(p[0] + 0.5, p[1]);
    ctx.stroke();
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!active.current) return;
    const p = point(e);
    const stroke = strokes.current[strokes.current.length - 1]!;
    const last = stroke[stroke.length - 1]!;
    // Skip tiny moves: smaller to save, same look.
    if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 1.5) return;
    stroke.push(p);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(last[0], last[1]);
    ctx.lineTo(p[0], p[1]);
    ctx.stroke();
  };
  const up = () => {
    active.current = false;
  };
  const clearPad = () => {
    const c = canvasRef.current;
    if (c) c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    strokes.current = [];
    setError(null);
  };

  const save = (value: string | null) => {
    setError(null);
    start(async () => {
      const res = await updateOwnSignature({ signatureUrl: value });
      if (!res.success) return setError(res.error.message || "Couldn't save your signature. Please try again.");
      setSaved(value);
      setDrawingMode(!value);
      onSaved(value, value ? "Signature saved" : "Signature removed");
    });
  };

  const saveDrawing = () => {
    const inked = strokes.current.reduce((n, s) => n + s.length, 0);
    if (inked < 3) return setError("Sign in the box first.");
    const value = strokesToSignature(strokes.current);
    if (!value) return setError("Sign in the box first.");
    save(value);
  };

  return (
    <Panel id="signature" className={`scroll-mt-6 ${required && !saved ? "border-[#CC6600]/40" : ""}`}>
      <PanelHeader
        title="Your signature"
        subtitle={
          required
            ? "Printed on the certificate of every study you approve. You can't approve studies without it."
            : "Printed on documents you sign for JAXIS."
        }
        aside={
          required ? (
            <span className="rounded-[2px] border border-white/15 bg-white/[0.06] px-2 py-0.5 text-[11px] text-white/80">{saved ? "Added" : "Required"}</span>
          ) : null
        }
      />
      <PanelBody className="flex flex-col gap-4">
        {!drawingMode && saved ? (
          <>
            <div className="flex h-36 items-center justify-center rounded-[2px] bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={saved} alt="Your saved signature" className="max-h-full max-w-full object-contain" />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {!required ? (
                <Button variant="ghost" size="sm" onClick={() => save(null)} disabled={busy}>
                  Remove
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={() => setDrawingMode(true)} className="active:scale-[0.97]">
                Sign Again
              </Button>
            </div>
          </>
        ) : (
          <>
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={up}
              aria-label="Signature pad: sign here"
              className="h-36 w-full cursor-crosshair touch-none rounded-[2px] bg-white"
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12px] text-white/45">Sign with your mouse, finger or a pen, the way you sign on paper.</p>
              <div className="flex gap-2">
                {saved ? (
                  <Button variant="ghost" size="sm" onClick={() => setDrawingMode(false)} disabled={busy}>
                    Cancel
                  </Button>
                ) : null}
                <Button variant="ghost" size="sm" onClick={clearPad} disabled={busy}>
                  Clear
                </Button>
                <Button variant="primary" size="sm" onClick={saveDrawing} loading={busy} className="active:scale-[0.97]">
                  Save Signature
                </Button>
              </div>
            </div>
          </>
        )}

        {error ? (
          <p role="alert" className="flex items-start gap-2 text-[13px] text-red-300">
            <Warning size={15} weight="fill" className="mt-0.5 shrink-0" />
            {error}
          </p>
        ) : null}
      </PanelBody>
    </Panel>
  );
}
