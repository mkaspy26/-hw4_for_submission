import { useEffect, useRef, useState } from "react";
import HandsomeDan from "./HandsomeDan";
import RunningDan from "./RunningDan";

// Sir Handsome Dan runs along the college ribbon (it's his floor): in from the left, stops to sit
// and look at you, runs on, leaves the screen, then comes back from the other side. Click him
// at any moment to open the chat.

type Step =
  | { kind: "run"; to: number; ms: number } // x as a fraction of the hero width
  | { kind: "look"; ms: number }
  | { kind: "wait"; ms: number };

const START = -0.12;
const SCRIPT: Step[] = [
  { kind: "run", to: 0.3, ms: 3200 },
  { kind: "look", ms: 1500 },
  { kind: "run", to: 0.7, ms: 3000 },
  { kind: "look", ms: 1200 },
  { kind: "run", to: 1.12, ms: 2600 },
  { kind: "wait", ms: 2500 },
  { kind: "run", to: 0.55, ms: 3300 },
  { kind: "look", ms: 1500 },
  { kind: "run", to: START, ms: 3800 },
  { kind: "wait", ms: 3000 },
];

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export default function RibbonRunner({ onClick }: { onClick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<"run" | "look" | "wait">("run");
  const [dir, setDir] = useState<1 | -1>(1);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    let step = 0;
    let from = START;
    let x = START;
    let stepStart = performance.now();

    const place = () => {
      const el = ref.current;
      const width = el?.parentElement?.clientWidth ?? window.innerWidth;
      if (el) el.style.transform = `translateX(${x * width}px)`;
    };
    const begin = (i: number, now: number) => {
      step = i;
      stepStart = now;
      from = x;
      const s = SCRIPT[i];
      setMode(s.kind);
      if (s.kind === "run") setDir(s.to >= from ? 1 : -1);
    };

    begin(0, stepStart);
    const tick = (now: number) => {
      const s = SCRIPT[step];
      const t = Math.min(1, (now - stepStart) / s.ms);
      if (s.kind === "run") x = from + (s.to - from) * ease(t);
      place();
      if (t >= 1) begin((step + 1) % SCRIPT.length, now);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  return (
    <button
      ref={ref}
      className={`ribbon-runner mode-${reduced ? "look" : mode} ${dir === -1 ? "to-left" : ""}`}
      style={reduced ? { transform: "translateX(3vw)" } : undefined}
      onClick={onClick}
      aria-label="Chat with Sir Handsome Dan"
    >
      {reduced || mode === "look" ? <HandsomeDan size={72} /> : <RunningDan size={96} />}
      <span className="ribbon-dan-tip">{mode === "look" ? "Oh, hello! Click me to chat" : "Chat with me!"}</span>
    </button>
  );
}
