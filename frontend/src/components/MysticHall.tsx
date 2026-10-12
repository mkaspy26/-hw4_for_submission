import { CSSProperties } from "react";

// Homepage backdrop: a pale, misty Gothic campus at dawn, drawn as layered silhouettes
// (distant spires → college halls with a glowing rose window → a Harkness-like tower →
// an iron gate in the foreground). Fog, floating motes, and ravens are CSS layers on top.

const FAR = "#d5deeb";
const MID = "#a9b8cf";
const NEAR = "#6f84a6";
const FRONT = "#1f3a64";

// Deterministic pseudo-random so the skyline is identical on every render.
function rand(seed: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function Spire({ x, base, w, h, color }: { x: number; base: number; w: number; h: number; color: string }) {
  return <path d={`M${x - w / 2} ${base} L${x} ${base - h} L${x + w / 2} ${base} Z`} fill={color} />;
}

function Lancet({ x, y, w, h, i }: { x: number; y: number; w: number; h: number; i: number }) {
  const lit = rand(i) > 0.45;
  return (
    <path
      d={`M${x} ${y + h} V${y + w * 0.6} Q${x + w / 2} ${y - w * 0.35} ${x + w} ${y + w * 0.6} V${y + h} Z`}
      className={lit ? "mh-win lit" : "mh-win"}
      style={{ animationDelay: `${(rand(i + 7) * 6).toFixed(2)}s` } as CSSProperties}
    />
  );
}

/** A Gothic hall: roof line with pinnacles and a row of lancet windows. */
function Hall({ x, w, top, color, seed }: { x: number; w: number; top: number; color: string; seed: number }) {
  const bays = Math.floor(w / 46);
  return (
    <g>
      <rect x={x} y={top} width={w} height={520 - top} fill={color} />
      {Array.from({ length: bays + 1 }, (_, i) => (
        <Spire key={i} x={x + (i * w) / bays} base={top + 2} w={10} h={26 + rand(seed + i) * 14} color={color} />
      ))}
      {Array.from({ length: bays }, (_, i) => (
        <Lancet key={i} x={x + (i * w) / bays + 14} y={top + 34} w={16} h={44} i={seed + i} />
      ))}
      {Array.from({ length: bays }, (_, i) => (
        <Lancet key={`l${i}`} x={x + (i * w) / bays + 16} y={top + 104} w={12} h={30} i={seed + 40 + i} />
      ))}
    </g>
  );
}

export default function MysticHall() {
  return (
    <div className="mystic-hall" aria-hidden="true">
      <div className="mh-moon" />
      <svg className="mh-ravens" viewBox="0 0 60 20">
        <path d="M0 10 Q8 0 15 9 Q22 0 30 10 Q22 6 15 13 Q8 6 0 10 Z" fill="#1f3a64" />
      </svg>
      <svg className="mh-ravens r2" viewBox="0 0 60 20">
        <path d="M0 10 Q8 0 15 9 Q22 0 30 10 Q22 6 15 13 Q8 6 0 10 Z" fill="#1f3a64" />
      </svg>

      <svg className="mh-skyline" viewBox="0 0 1440 520" preserveAspectRatio="xMidYMax slice">
        <defs>
          <radialGradient id="rose-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#e3eaf5" />
            <stop offset="100%" stopColor="#b9c8de" />
          </radialGradient>
          <filter id="win-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* far: a ridge of distant spires */}
        <g fill={FAR}>
          <rect x="0" y="330" width="1440" height="190" />
          {Array.from({ length: 26 }, (_, i) => (
            <Spire key={i} x={30 + i * 56 + rand(i) * 20} base={332} w={18 + rand(i + 3) * 10} h={50 + rand(i + 9) * 90} color={FAR} />
          ))}
        </g>

        {/* mid: college halls + a library nave with a rose window */}
        <g filter="url(#win-glow)">
          <Hall x={40} w={420} top={300} color={MID} seed={11} />
          <Hall x={980} w={430} top={305} color={MID} seed={61} />
          {/* library nave */}
          <rect x="430" y="250" width="200" height="270" fill={NEAR} />
          <path d="M424 252 L530 180 L636 252 Z" fill={NEAR} />
          <Spire x={430} base={252} w={14} h={70} color={NEAR} />
          <Spire x={630} base={252} w={14} h={70} color={NEAR} />
          <circle cx="530" cy="290" r="30" fill="url(#rose-glow)" className="mh-rose" />
          <g stroke={NEAR} strokeWidth="3">
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i * Math.PI) / 4;
              return <line key={i} x1="530" y1="290" x2={530 + Math.cos(a) * 30} y2={290 + Math.sin(a) * 30} />;
            })}
          </g>
          <circle cx="530" cy="290" r="9" fill={NEAR} />
          {[456, 492, 556, 592].map((x, i) => (
            <Lancet key={x} x={x} y={350} w={14} h={70} i={90 + i} />
          ))}
          {/* corner towers */}
          {[250, 1210].map((x, i) => (
            <g key={x}>
              <rect x={x - 26} y="200" width="52" height="320" fill={NEAR} />
              <Spire x={x} base={202} w={60} h={110} color={NEAR} />
              <Spire x={x - 26} base={202} w={10} h={34} color={NEAR} />
              <Spire x={x + 26} base={202} w={10} h={34} color={NEAR} />
              <Lancet x={x - 7} y={250} w={14} h={40} i={120 + i} />
              <Lancet x={x - 7} y={320} w={14} h={40} i={130 + i} />
            </g>
          ))}
        </g>

        {/* the great tower over the gate (Harkness-like) */}
        <g fill={FRONT} filter="url(#win-glow)">
          <rect x="680" y="190" width="120" height="330" />
          <rect x="694" y="120" width="92" height="74" />
          <rect x="708" y="66" width="64" height="56" />
          <Spire x={740} base={68} w={64} h={62} color={FRONT} />
          {[680, 800].map((x) => <Spire key={x} x={x} base={192} w={14} h={44} color={FRONT} />)}
          {[694, 786].map((x) => <Spire key={x} x={x} base={122} w={12} h={36} color={FRONT} />)}
          {[708, 772].map((x) => <Spire key={x} x={x} base={68} w={10} h={28} color={FRONT} />)}
          {[704, 732, 760].map((x, i) => <Lancet key={x} x={x} y={134} w={16} h={48} i={140 + i} />)}
          {[722, 746].map((x, i) => <Lancet key={x} x={x} y={78} w={12} h={34} i={150 + i} />)}
          {/* gate arch */}
          <path d="M708 520 V420 Q740 372 772 420 V520 Z" fill="#dfe6f1" />
        </g>

        {/* foreground: wrought-iron fence with spear tips, and a gate */}
        <g fill={FRONT}>
          <rect x="0" y="488" width="1440" height="32" />
          <rect x="0" y="452" width="1440" height="4" />
          {Array.from({ length: 96 }, (_, i) => {
            const x = i * 15 + 4;
            return (
              <g key={i}>
                <rect x={x} y="446" width="3" height="44" />
                <path d={`M${x - 2.5} 448 L${x + 1.5} 436 L${x + 5.5} 448 Z`} />
              </g>
            );
          })}
          {[690, 776].map((x) => (
            <g key={x}>
              <rect x={x} y="410" width="14" height="80" />
              <circle cx={x + 7} cy="404" r="9" />
            </g>
          ))}
        </g>
      </svg>

      <div className="mh-fog f1" />
      <div className="mh-fog f2" />
      <div className="mh-fog f3" />
      <div className="mh-motes">
        {Array.from({ length: 26 }, (_, i) => (
          <span
            key={i}
            style={
              {
                left: `${(rand(i + 200) * 100).toFixed(1)}%`,
                bottom: `${(rand(i + 300) * 40).toFixed(1)}%`,
                animationDelay: `${(rand(i + 400) * 9).toFixed(1)}s`,
                animationDuration: `${(8 + rand(i + 500) * 8).toFixed(1)}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
