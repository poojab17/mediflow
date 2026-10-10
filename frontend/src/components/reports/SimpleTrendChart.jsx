/**
 * Lightweight dependency-free SVG line chart for a single test across reports.
 * Shows the reference-range band, per-report values, and a text-only summary
 * so the information is never conveyed by color or chart alone.
 */
const SimpleTrendChart = ({
  title,
  unit = "",
  points = [], // [{ label, value }] in chronological order
  refLow = null,
  refHigh = null,
  height = 190,
}) => {
  const numeric = points
    .map((p) => ({ ...p, num: Number(p.value) }))
    .filter((p) => Number.isFinite(p.num));

  if (numeric.length < 2) {
    return (
      <p className="text-sm text-slate-500 italic">
        At least two numeric results are needed to render a trend chart.
      </p>
    );
  }

  const allNums = numeric.map((p) => p.num);
  const lowBound = Math.min(...allNums, refLow != null ? refLow : Infinity);
  const highBound = Math.max(...allNums, refHigh != null ? refHigh : -Infinity);
  const span = highBound - lowBound || 1;
  const pad = span * 0.15;
  const lo = lowBound - pad;
  const hi = highBound + pad;

  const W = 560;
  const H = height;
  const PL = 48;
  const PR = 14;
  const PT = 12;
  const PB = 30;
  const innerW = W - PL - PR;
  const innerH = H - PT - PB;

  const x = (i) => PL + (numeric.length === 1 ? innerW / 2 : (i / (numeric.length - 1)) * innerW);
  const y = (v) => PT + (1 - (v - lo) / (hi - lo)) * innerH;

  const ticks = [0, 1, 2, 3].map((i) => lo + ((hi - lo) * i) / 3);
  const line = numeric.map((p, i) => `${x(i)},${y(p.num)}`).join(" ");
  const ariaLabel = `${title}: ${numeric
    .map((p) => `${p.label} -> ${p.num}${unit ? ` ${unit}` : ""}`)
    .join("; ")}${refLow != null || refHigh != null ? `. Reference range ${refLow ?? "≤"} - ${refHigh ?? "≥"}${unit ? ` ${unit}` : ""}` : ""}`;

  return (
    <figure className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        role="img"
        aria-label={ariaLabel}
        focusable="false"
      >
        {/* reference range band */}
        {refLow != null && refHigh != null && (
          <rect
            x={PL}
            y={y(refHigh)}
            width={innerW}
            height={Math.max(2, y(refLow) - y(refHigh))}
            fill="#d1fae5"
            opacity="0.7"
          />
        )}
        {/* gridlines + y labels */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={PL} y1={y(t)} x2={W - PR} y2={y(t)} stroke="#e2e8f0" strokeDasharray="3 3" />
            <text x={PL - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#64748b">
              {Number.isInteger(t) ? t : t.toFixed(1)}
            </text>
          </g>
        ))}
        {/* x labels */}
        {numeric.map((p, i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" fill="#475569">
            {p.label}
          </text>
        ))}
        {/* data line + dots */}
        <polyline points={line} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {numeric.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.num)} r="4.5" fill="#2563eb" stroke="#fff" strokeWidth="1.5" />
        ))}
      </svg>
      <figcaption className="mt-2 text-xs text-slate-500">
        <span className="sr-only">{ariaLabel}</span>
        <span className="not-sr-only">
          {title}: {numeric.map((p, i) => `${i > 0 ? " → " : ""}${p.label}: ${p.num}${unit ? ` ${unit}` : ""}`).join("")}
          {refLow != null || refHigh != null
            ? ` · Reference range ${refLow ?? "≤"} – ${refHigh ?? "≥"}${unit ? ` ${unit}` : ""}`
            : ""}
        </span>
      </figcaption>
    </figure>
  );
};

export default SimpleTrendChart;