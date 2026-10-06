/**
 * "Lilit Naskhah": two nearly straight strands that swap places at every crossing, the end of a story's divider.
 * The over strand is redrawn on a paper-coloured gap, so no mask is needed. Teal and terracotta are the logo's colours.
 */
const W = 192;
const H = 16;
const PERIOD = 64;
const AMPLITUDE = 4;
const MID = H / 2;

function strand(sign: 1 | -1, from = 0, to = W, step = 2): string {
  let d = "";
  for (let x = from; x <= to; x += step) {
    const y = MID + sign * AMPLITUDE * Math.sin((2 * Math.PI * x) / PERIOD);
    d += `${d ? "L" : "M"}${x} ${y.toFixed(2)}`;
  }
  return d;
}

const CROSSINGS = Array.from({ length: Math.floor(W / 32) - 1 }, (_, i) => (i + 1) * 32);

export default function LilitDivider() {
  return (
    <svg className="lilit-divider" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="lilit-fade">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset=".08" stopColor="#fff" />
          <stop offset=".92" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="lilit-mask"><rect width={W} height={H} fill="url(#lilit-fade)" /></mask>
      </defs>
      <g mask="url(#lilit-mask)" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path className="lilit-a" d={strand(1)} />
        <path className="lilit-b" d={strand(-1)} />
        {CROSSINGS.map((x, k) => {
          const overA = k % 2 === 1;
          const d = strand(overA ? 1 : -1, x - 7, x + 7, 1);
          return (
            <g key={x}>
              <path className="lilit-gap" d={d} strokeWidth="4" strokeLinecap="butt" />
              <path className={overA ? "lilit-a" : "lilit-b"} d={d} />
            </g>
          );
        })}
      </g>
    </svg>
  );
}
