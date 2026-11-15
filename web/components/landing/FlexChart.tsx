import Link from "next/link";
import data from "@/data/validation/droplet_K.json";

const maxValue = Math.max(...data.parity.flatMap(({ obs, pred }) => [obs, pred]));
const limit = Math.ceil(maxValue * 4) / 4;
const size = 190;
const x = (value: number) => 66 + value / limit * size;
const y = (value: number) => 210 - value / limit * size;
const ticks = Array.from({ length: 5 }, (_, index) => index * limit / 4);

export function FlexChart() {
  return (
    <figure className="mt-10 grid items-center gap-5 rounded-xl border border-line bg-panel p-5 md:grid-cols-2 md:p-8">
      <figcaption>
        <p className="label">NASA FLEX · PSI-69</p>
        <h2 className="display mt-2 text-2xl">How closely did the model match NASA’s measurements?</h2>
        <p className="num mt-4 text-3xl">{data.metrics.mape.toFixed(1)}%</p>
        <p className="mt-2 text-mute">Mean absolute percentage error for the droplet burning-rate constant across {data.metrics.n} held-out tests. Points closer to the dashed diagonal show closer agreement.</p>
        <Link href="/methods#validation" className="mt-3 inline-block underline underline-offset-4">See validation and limitations ↗</Link>
      </figcaption>
      <svg className="mx-auto w-full max-w-[340px]" viewBox="0 0 300 258" role="img" aria-label="Scatterplot of measured versus predicted FLEX burning-rate constants. Circles represent methanol and triangles represent n-heptane.">
        {ticks.map((tick) => (
          <g key={tick} fontSize="10" fill="rgb(var(--mute))">
            <path d={`M${x(0)} ${y(tick)} H${x(limit)} M${x(tick)} ${y(0)} V${y(limit)}`} stroke="rgb(var(--line))" />
            <text x={x(0) - 6} y={y(tick) + 4} textAnchor="end">{tick.toFixed(2)}</text>
            <text x={x(tick)} y={y(0) + 15} textAnchor="middle">{tick.toFixed(2)}</text>
          </g>
        ))}
        <path d={`M${x(0)} ${y(0)} L${x(limit)} ${y(limit)}`} stroke="rgb(var(--mute))" strokeDasharray="4 4" />
        {data.parity.map(({ id, fuel, obs, pred }) => (
          fuel === "methanol"
            ? <circle key={id} cx={x(obs)} cy={y(pred)} r="3" fill="rgb(var(--blue))" opacity=".8" />
            : <path key={id} d={`M${x(obs)} ${y(pred) - 3.5} l3.5 6 h-7 Z`} fill="rgb(var(--accent))" opacity=".8" />
        ))}
        <g fill="rgb(var(--ink))" fontSize="11" textAnchor="middle">
          <text x="161" y="245">Measured K (mm²/s)</text>
          <text transform="translate(18 115) rotate(-90)">Predicted K (mm²/s)</text>
          <text x="161" y="12">● Methanol　▲ n-heptane</text>
        </g>
      </svg>
    </figure>
  );
}
