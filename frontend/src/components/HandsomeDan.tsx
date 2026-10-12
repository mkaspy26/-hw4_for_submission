// Sir Handsome Dan: a grown-up, majestic take on the classic bulldog mascot (white coat, tan
// patches, thick navy outlines). Front-facing and symmetrical with his chin up, calm heavy-lidded
// eyes glancing to the side, a small crown, and a navy cape trimmed in ermine.
// Inline SVG so he can blink and lick (CSS in index.css: .dan, .dan.licking).
// variant="full" = seated, caped Dan (launcher, homepage). variant="head" = head only (avatars, buttons).

const LINE = "#0f1b33";
const FUR = "#ffffff";
const SHADE = "#dfe6f0";
const TAN = "#a08f7a";
const TAN_DARK = "#7d6d5b";
const NAVY = "#00356b";

export default function HandsomeDan({
  size = 64,
  licking = false,
  variant = "full",
}: {
  size?: number;
  licking?: boolean;
  variant?: "full" | "head";
}) {
  const full = variant === "full";
  const sw = 3;
  return (
    <svg
      className={`dan dan-v-${variant} ${licking ? "licking" : ""}`}
      width={size}
      height={size}
      viewBox={full ? "8 0 104 140" : "12 2 96 84"}
      role="img"
      aria-label="Sir Handsome Dan, the Campus Customs bulldog"
      strokeLinejoin="round"
      strokeLinecap="round"
    >
      {full && (
        <g className="dan-body">
          <ellipse cx="60" cy="134" rx="40" ry="4.5" fill="#c9d4e4" />
          {/* navy cape over the shoulders */}
          <path d="M20 96 Q60 70 100 96 L106 130 Q60 138 14 130 Z" fill={NAVY} stroke={LINE} strokeWidth={sw} />
          {/* broad chest */}
          <path d="M40 82 C33 98 35 118 41 129 L79 129 C85 118 87 98 80 82 Z" fill={FUR} stroke={LINE} strokeWidth={sw} />
          <path d="M50 96 Q60 102 70 96" stroke={SHADE} strokeWidth="3" fill="none" />
          {/* sturdy front legs */}
          <path d="M60 108 V125" stroke={LINE} strokeWidth="2.4" />
          <ellipse cx="50" cy="128" rx="10" ry="5.5" fill={FUR} stroke={LINE} strokeWidth={sw} />
          <ellipse cx="70" cy="128" rx="10" ry="5.5" fill={FUR} stroke={LINE} strokeWidth={sw} />
          <path d="M47 125 v4 M53 125 v4 M67 125 v4 M73 125 v4" stroke={LINE} strokeWidth="1.5" />
          {/* ermine trim on the cape */}
          <path d="M26 88 Q60 70 94 88 L94 95 Q60 78 26 95 Z" fill="#ffffff" stroke={LINE} strokeWidth="2" />
          {[34, 46, 60, 74, 86].map((x, i) => (
            <path key={x} d={`M${x} ${88 - (i === 2 ? 6 : i % 2 ? 4 : 0)} l1.3 2.6 l-1.3 1.5 l-1.3 -1.5 Z`} fill={LINE} />
          ))}
          {/* collar + Y medallion */}
          <path d="M40 80 Q60 90 80 80" stroke={NAVY} strokeWidth="6" fill="none" />
          <circle cx="60" cy="96" r="7" fill="#ffffff" stroke={NAVY} strokeWidth="2.5" />
          <text x="60" y="99.5" textAnchor="middle" fontSize="9.5" fontFamily="'IM Fell English SC', Georgia, serif" fill={NAVY}>
            Y
          </text>
        </g>
      )}

      <g className="dan-head">
        {/* folded rose ears */}
        <path d="M34 31 C23 21 12 30 17 43 C24 43 30 38 34 31 Z" fill={TAN} stroke={LINE} strokeWidth={sw} />
        <path d="M86 31 C97 21 108 30 103 43 C96 43 90 38 86 31 Z" fill={TAN} stroke={LINE} strokeWidth={sw} />
        <path d="M22 33 C18 37 19 40 20 41 M98 33 C102 37 101 40 100 41" stroke={TAN_DARK} strokeWidth="2" fill="none" />
        {/* broad noble head */}
        <path d="M60 23 C82 23 96 36 96 52 C96 64 90 72 82 76 C74 80 46 80 38 76 C30 72 24 64 24 52 C24 36 38 23 60 23 Z" fill={FUR} stroke={LINE} strokeWidth={sw} />
        {/* tan patches over the brows (like the classic mascot) */}
        <path d="M29 42 C31 31 43 26 51 30 C47 37 38 42 29 42 Z" fill={TAN} />
        <path d="M91 42 C89 31 77 26 69 30 C73 37 82 42 91 42 Z" fill={TAN} />
        {/* forehead wrinkles */}
        <path d="M53 33 Q60 30 67 33 M55 37.5 Q60 35.5 65 37.5" stroke={LINE} strokeWidth="1.8" fill="none" />

        {/* small crown, set slightly askew */}
        <g className="dan-crown" transform="rotate(-8 60 18) translate(60 25) scale(1.18) translate(-60 -25)">
          <path d="M49 25 L51 13 L56 19 L60 9 L64 19 L69 13 L71 25 Z" fill="#ffffff" stroke={LINE} strokeWidth="2.2" />
          <rect x="49" y="23" width="22" height="4.5" rx="1" fill={NAVY} stroke={LINE} strokeWidth="1.4" />
          <circle cx="51" cy="12.5" r="1.6" fill={NAVY} />
          <circle cx="60" cy="8.5" r="1.8" fill={NAVY} />
          <circle cx="69" cy="12.5" r="1.6" fill={NAVY} />
        </g>

        {/* calm, heavy-lidded eyes glancing to the side */}
        <g className="dan-eyes">
          <ellipse cx="46" cy="49" rx="5.2" ry="3.8" fill="#ffffff" stroke={LINE} strokeWidth="1.8" />
          <ellipse cx="74" cy="49" rx="5.2" ry="3.8" fill="#ffffff" stroke={LINE} strokeWidth="1.8" />
          <circle cx="48.2" cy="49.8" r="2.4" fill={LINE} />
          <circle cx="76.2" cy="49.8" r="2.4" fill={LINE} />
          <circle cx="49" cy="49" r="0.8" fill="#ffffff" />
          <circle cx="77" cy="49" r="0.8" fill="#ffffff" />
        </g>
        {/* heavy lids + noble brow ridge */}
        <path d="M40.5 48.2 Q46 43.6 51.5 48.2 Z" fill={FUR} stroke={LINE} strokeWidth="2.2" />
        <path d="M68.5 48.2 Q74 43.6 79.5 48.2 Z" fill={FUR} stroke={LINE} strokeWidth="2.2" />
        <path d="M39 44 Q46 40.5 53 43.5 M67 43.5 Q74 40.5 81 44" stroke={LINE} strokeWidth="2.6" fill="none" />

        {/* tongue, hidden until he licks */}
        <path className="dan-tongue" d="M54.5 69 h11 v6 a5.5 5.5 0 0 1 -11 0 Z" fill="#f08aa0" stroke={LINE} strokeWidth="1.6" />
        {/* wide, heavy jowls */}
        <path d="M37 61 C37 53 47 51 60 55 C73 51 83 53 83 61 C83 73 73 79 60 77 C47 79 37 73 37 61 Z" fill={FUR} stroke={LINE} strokeWidth={sw} />
        <path d="M41 66 Q44 72 50 74 M79 66 Q76 72 70 74" stroke={SHADE} strokeWidth="2" fill="none" />
        {/* broad nose */}
        <path d="M51 55 C54 49 66 49 69 55 C69 60 64 62 60 62 C56 62 51 60 51 55 Z" fill={LINE} />
        <ellipse cx="56.5" cy="53.3" rx="3" ry="1.2" fill="#ffffff" opacity="0.75" />
        {/* whisker dots */}
        {[[46, 60], [43, 63], [47, 64], [74, 60], [77, 63], [73, 64]].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1" fill={LINE} />
        ))}
        {/* composed mouth + small underbite */}
        <path d="M60 62 V66 M50 68 Q60 72.5 70 68" stroke={LINE} strokeWidth="2.4" fill="none" />
        <path d="M51.5 69.5 l1.5 -3.4 l1.5 3.4 Z M65.5 69.5 l1.5 -3.4 l1.5 3.4 Z" fill="#ffffff" stroke={LINE} strokeWidth="1.1" />
      </g>
    </svg>
  );
}
