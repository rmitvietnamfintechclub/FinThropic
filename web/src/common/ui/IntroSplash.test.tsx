import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INTRO_FADE_MS, INTRO_FAILSAFE_MS, IntroSplash } from "./IntroSplash";

const SRC = "/brand/finthropic-logo-reveal.mp4";
const gate = readFileSync(
  path.resolve(import.meta.dirname, "../../../public/brand/intro-gate.js"),
  "utf8",
);

function runGate(reducedMotion = false) {
  window.matchMedia = vi
    .fn()
    .mockReturnValue({ matches: reducedMotion }) as unknown as typeof window.matchMedia;
  new Function(gate)();
  return document.documentElement.dataset.intro;
}

beforeEach(() => {
  vi.useFakeTimers();
  sessionStorage.clear();
  delete document.documentElement.dataset.intro;
  vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("intro-gate.js", () => {
  it("plays on the first page of a visit and skips after that", () => {
    expect(runGate()).toBe("play");
    expect(runGate()).toBe("skip");
  });

  it("skips when the person asks for reduced motion", () => {
    expect(runGate(true)).toBe("skip");
    expect(sessionStorage.getItem("finthropic:intro-seen")).toBeNull();
  });
});

describe("IntroSplash", () => {
  it("does not load the video when the gate said skip", () => {
    document.documentElement.dataset.intro = "skip";
    render(<IntroSplash src={SRC} />);
    expect(
      screen.getByTestId("intro-splash").querySelector("video")?.getAttribute("src"),
    ).toBeNull();
    expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled();
  });

  it("plays, then fades out and leaves the page when the video ends", () => {
    document.documentElement.dataset.intro = "play";
    render(<IntroSplash src={SRC} />);
    const overlay = screen.getByTestId("intro-splash");
    expect(overlay.querySelector("video")?.getAttribute("src")).toBe(SRC);
    fireEvent.ended(overlay.querySelector("video")!);
    expect(overlay.dataset.phase).toBe("fading");
    act(() => vi.advanceTimersByTime(INTRO_FADE_MS));
    expect(screen.queryByTestId("intro-splash")).toBeNull();
  });

  it("can be skipped with a key or a click", () => {
    document.documentElement.dataset.intro = "play";
    const { unmount } = render(<IntroSplash src={SRC} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByTestId("intro-splash").dataset.phase).toBe("fading");
    unmount();
    render(<IntroSplash src={SRC} />);
    fireEvent.click(screen.getByTestId("intro-splash"));
    expect(screen.getByTestId("intro-splash").dataset.phase).toBe("fading");
  });

  it("never gets stuck when the video cannot play", () => {
    document.documentElement.dataset.intro = "play";
    render(<IntroSplash src={SRC} />);
    act(() => vi.advanceTimersByTime(INTRO_FAILSAFE_MS));
    expect(screen.getByTestId("intro-splash").dataset.phase).toBe("fading");
    act(() => vi.advanceTimersByTime(INTRO_FADE_MS));
    expect(screen.queryByTestId("intro-splash")).toBeNull();
  });
});
