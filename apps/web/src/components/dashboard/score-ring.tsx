export function ScoreRing({ score }: { score: number }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#eab308' : '#f43f5e';
  const label = score >= 80 ? 'Good' : score >= 50 ? 'Needs work' : 'At risk';
  return (
    <div className="relative mx-auto h-40 w-40">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} stroke="rgba(15,23,42,0.06)" strokeWidth="6" fill="none" />
        <circle
          cx="60"
          cy="60"
          r={r}
          stroke={color}
          strokeWidth="6"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-light tracking-tight text-slate-900">{score}</span>
        <span className="mt-0.5 text-xs text-slate-500">{label}</span>
      </div>
    </div>
  );
}
