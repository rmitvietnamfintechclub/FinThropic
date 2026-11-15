"use client";

import { useEffect, useRef, useState } from "react";

// Logo intro on the first page of a visit. public/brand/intro-gate.js decides before the first paint
// and sets <html data-intro="play">; globals.css shows this overlay only then. The video source is set
// only when it will play, so a skipped visit never downloads it.
export const INTRO_FADE_MS = 500;
export const INTRO_FAILSAFE_MS = 4500;

type Phase = "on" | "fading" | "off";

export function IntroSplash({ src }: { src: string }) {
  const [phase, setPhase] = useState<Phase>("on");
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (document.documentElement.dataset.intro !== "play") return;
    const fade = () => setPhase((p) => (p === "on" ? "fading" : p));
    const video = videoRef.current;
    if (video) {
      video.src = src;
      video.play()?.catch(fade);
    }
    const failsafe = window.setTimeout(fade, INTRO_FAILSAFE_MS);
    window.addEventListener("keydown", fade);
    return () => {
      window.clearTimeout(failsafe);
      window.removeEventListener("keydown", fade);
    };
  }, [src]);

  useEffect(() => {
    if (phase !== "fading") return;
    const done = window.setTimeout(() => setPhase("off"), INTRO_FADE_MS);
    return () => window.clearTimeout(done);
  }, [phase]);

  if (phase === "off") return null;

  const fade = () => setPhase((p) => (p === "on" ? "fading" : p));
  return (
    <div
      aria-hidden="true"
      data-testid="intro-splash"
      data-phase={phase}
      onClick={fade}
      className="intro-splash fixed inset-0 z-50 hidden items-center justify-center bg-white transition-opacity duration-500 data-[phase=fading]:pointer-events-none data-[phase=fading]:opacity-0"
    >
      <video
        ref={videoRef}
        muted
        playsInline
        preload="none"
        onEnded={fade}
        onError={fade}
        className="h-auto w-[min(90vw,960px)]"
      />
    </div>
  );
}
