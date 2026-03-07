export default function SignalTable({ congestion }) {
  const congested = congestion.filter((s) => s.index >= 0.2)

  return (
    <div className="bg-card rounded-xl border border-borderSoft p-4 mt-4 overflow-x-auto">
      <h2 className="text-sm font-semibold text-textPrimary mb-3">Signal Recommendations</h2>
      <table className="w-full text-xs">
        <thead className="text-textSecondary border-b border-borderSoft/60">
          <tr>
            <th className="text-left py-2 pr-2">Road</th>
            <th className="text-right py-2 px-2">Congestion</th>
            <th className="text-right py-2 px-2">Green (s)</th>
            <th className="text-right py-2 pl-2">Mix</th>
          </tr>
        </thead>
        <tbody>
          {congested.map((s) => (
            <tr key={s.segmentId} className="border-b border-borderSoft/40 last:border-0">
              <td className="py-1.5 pr-2 truncate max-w-[150px] text-textPrimary">{s.name}</td>
              <td className="py-1.5 px-2 text-right text-textSecondary">
                {(s.index * 100).toFixed(0)}%
              </td>
              <td className="py-1.5 px-2 text-right font-mono text-textPrimary">
                {s.recommendedGreen}
              </td>
              <td className="py-1.5 pl-2 text-right text-[10px] text-textSecondary">
                🚲 {s.mix.bike} · 🚗 {s.mix.car} · 🛺 {s.mix.auto}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

