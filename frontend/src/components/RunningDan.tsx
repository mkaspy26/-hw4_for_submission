// Side-view Sir Handsome Dan, mid-gallop (faces right; flip with CSS to run left).
// Legs swing via CSS (.run-leg); the whole dog bobs (.run-body). Same palette as HandsomeDan.

const LINE = "#0f1b33";
const FUR = "#ffffff";
const FAR = "#e3e9f2";
const TAN = "#a08f7a";
const NAVY = "#00356b";

function Leg({ x, cls, fill }: { x: number; cls: string; fill: string }) {
  return (
    <g className={`run-leg ${cls}`} style={{ transformOrigin: `${x}px 52px` }}>
      <path d={`M${x - 6} 50 h12 v15 a6 6 0 0 1 -12 0 Z`} fill={fill} stroke={LINE} strokeWidth="2.6" />
      <ellipse cx={x + 2} cy="68" rx="8" ry="4.5" fill={fill} stroke={LINE} strokeWidth="2.6" />
    </g>
  );
}

export default function RunningDan({ size = 96 }: { size?: number }) {
  return (
    <svg className="running-dan" width={size} height={size * 0.64} viewBox="0 0 128 82" aria-hidden="true" strokeLinejoin="round" strokeLinecap="round">
      <ellipse className="run-shadow" cx="66" cy="76" rx="34" ry="3" fill="#0b2a52" opacity="0.35" />
      <g className="run-body">
        {/* far legs (behind the body) */}
        <Leg x={46} cls="back-far" fill={FAR} />
        <Leg x={80} cls="front-far" fill={FAR} />
        {/* stubby tail */}
        <path d="M32 40 q-8 -2 -8 -9" stroke={LINE} strokeWidth="7" fill="none" />
        <path d="M32 40 q-8 -2 -8 -9" stroke={FUR} strokeWidth="3" fill="none" />
        {/* short, stocky body with a deep chest */}
        <path d="M30 44 C28 32 40 26 58 27 C72 28 82 30 88 36 C92 44 90 56 80 60 C66 64 44 63 36 58 C31 55 30 50 30 44 Z" fill={FUR} stroke={LINE} strokeWidth="3" />
        <path d="M44 29 C52 26 62 27 66 31 C60 35 50 35 44 29 Z" fill={TAN} />
        {/* near legs: short and thick */}
        <Leg x={40} cls="back-near" fill={FUR} />
        <Leg x={84} cls="front-near" fill={FUR} />
        {/* navy collar */}
        <path d="M84 30 C90 40 90 52 86 60" stroke={NAVY} strokeWidth="6" fill="none" />
        {/* big bulldog head */}
        <g className="run-head">
          <path d="M80 26 C82 12 98 6 110 12 C120 18 122 32 118 42 C114 52 100 56 90 52 C82 48 78 38 80 26 Z" fill={FUR} stroke={LINE} strokeWidth="3" />
          <path d="M96 12 C104 10 112 14 115 20 C108 22 100 20 96 12 Z" fill={TAN} />
          {/* ear streaming back */}
          <path className="run-ear" d="M88 16 C80 8 74 16 78 24 C83 24 86 21 88 16 Z" fill={TAN} stroke={LINE} strokeWidth="2.6" />
          {/* short, flat bulldog muzzle */}
          <path d="M108 30 C116 28 123 32 123 39 C123 46 116 50 108 48 C104 44 104 34 108 30 Z" fill={FUR} stroke={LINE} strokeWidth="2.8" />
          <path d="M115 29 C119 28 124 31 123 34 C121 36 117 35 115 33 Z" fill={LINE} />
          <path d="M106 46 C108 52 114 54 118 50" stroke={LINE} strokeWidth="2.2" fill="none" />
          <path d="M110 43 Q116 45 121 42" stroke={LINE} strokeWidth="2" fill="none" />
          <path d="M113.5 43.6 l1.3 -2.8 l1.3 2.8 Z" fill="#ffffff" stroke={LINE} strokeWidth="1" />
          {/* determined eye under a heavy lid */}
          <ellipse cx="102" cy="27" rx="4.2" ry="3.4" fill="#ffffff" stroke={LINE} strokeWidth="1.7" />
          <circle cx="103.6" cy="27.6" r="2.1" fill={LINE} />
          <path d="M97.4 25.6 Q102 21.6 106.6 25" stroke={LINE} strokeWidth="2.4" fill={FUR} />
          <path d="M95 20 Q99.5 17.5 104 19" stroke={LINE} strokeWidth="1.8" fill="none" />
          {/* crown, tipped back by the wind */}
          <g transform="rotate(12 100 8)">
            <path d="M91 12 L92.5 3.5 L96.5 7.5 L100 1 L103.5 7.5 L107.5 3.5 L109 12 Z" fill="#ffffff" stroke={LINE} strokeWidth="1.9" />
            <rect x="91" y="10.5" width="18" height="3.6" rx="1" fill={NAVY} stroke={LINE} strokeWidth="1.1" />
          </g>
        </g>
      </g>
    </svg>
  );
}
