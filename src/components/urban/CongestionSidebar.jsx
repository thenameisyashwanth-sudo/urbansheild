export default function CongestionSidebar({ congestion }) {
  const top5 = [...congestion].sort((a, b) => b.index - a.index).slice(0, 5)

  return (
    <div className="bg-card rounded-xl border border-borderSoft p-4 space-y-3">
      <h2 className="text-sm font-semibold text-textPrimary">Top Congested Segments</h2>
      <div className="space-y-2">
        {top5.map((s, idx) => (
          <div
            key={s.segmentId}
            className="flex items-center justify-between text-xs bg-cardDeep/60 rounded-lg px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-shell flex items-center justify-center text-[10px] text-textSecondary">
                #{idx + 1}
              </span>
              <div>
                <div className="text-textPrimary truncate max-w-[140px]">{s.name}</div>
                <div className="text-[10px] text-textSecondary">
                  {s.vehicles} vehicles · {s.avgSpeed} km/h
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] font-mono text-textPrimary">
                {(s.index * 100).toFixed(0)}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

