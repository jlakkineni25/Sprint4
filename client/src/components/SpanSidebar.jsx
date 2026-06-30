export default function SpanSidebar({ spans, onUpdate, activeSpanId, onSpanClick }) {
  const statusOrder = { unreviewed: 0, missed: 1, confirmed: 2, dismissed: 3 };
  const sorted = [...spans].sort((a, b) => {
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    if (a.status === "unreviewed") {
      return a.confidence - b.confidence;
    }
    return 0;
  });

  const getCardStyle = (span) => {
    if (span.action === "keep-visible") return "border-blue-500/30 bg-blue-500/10 text-blue-200";
    if (span.action === "anonymous") return "border-purple-500/30 bg-purple-500/10 text-purple-200";
    if (span.status === "confirmed") return "border-red-500/30 bg-red-500/10 text-red-300";
    if (span.status === "dismissed") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    if (span.status === "missed") return "border-orange-500/30 bg-orange-500/10 text-orange-300";
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-300";
  };

  const unreviewedCount = spans.filter((s) => s.status === "unreviewed" || s.status === "missed").length;

  const getDuplicateWarning = (span) => {
    if (span.status !== "dismissed") return null;
    const sameText = spans.filter(
      (s) => s.text === span.text && s.id !== span.id && s.status === "unreviewed"
    );
    return sameText.length > 0 ? sameText.length : null;
  };

  const actionButtons = [
    { value: "redact", label: "Redact", className: "bg-red-500/20 hover:bg-red-500/30 text-red-200" },
    { value: "keep-visible", label: "Keep", className: "bg-blue-500/20 hover:bg-blue-500/30 text-blue-200" },
    { value: "anonymous", label: "Anon", className: "bg-purple-500/20 hover:bg-purple-500/30 text-purple-200" },
  ];

  return (
    <div className="sticky top-6 h-fit rounded-3xl border border-white/10 bg-gray-900/80 p-4 shadow-2xl shadow-black/30 backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-500">
          Review queue
        </h2>
        {unreviewedCount > 0 && (
          <span className="rounded-full bg-yellow-500/15 px-2.5 py-1 text-[11px] text-yellow-300">
            {unreviewedCount} left
          </span>
        )}
      </div>
      <div className="flex max-h-[75vh] flex-col gap-2 overflow-y-auto pr-1">
        {sorted.map((span) => {
          const currentAction = span.action ?? (span.status === "dismissed" ? "keep-visible" : span.status === "confirmed" ? "redact" : null);
          return (
            <div
              key={span.id}
              onClick={() => onSpanClick?.(span.id)}
              className={`cursor-pointer rounded-2xl border px-3 py-2 text-xs transition-all ${getCardStyle(span)} ${activeSpanId === span.id ? "ring-2 ring-white/35" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="max-w-[120px] truncate font-mono font-bold">{span.text}</span>
                <span className="ml-2 uppercase text-[10px] opacity-70">{span.type}</span>
              </div>
              <div className="mt-1 flex items-center justify-between opacity-70">
                <span>{span.status}</span>
                <span className={
                  span.confidence < 0.7 ? "text-rose-300" :
                  span.confidence < 0.9 ? "text-amber-300" : "text-emerald-300"
                }>
                  {Math.round(span.confidence * 100)}%
                </span>
              </div>

              {span.confidence < 0.7 && span.status === "unreviewed" && (
                <p className="mt-1 text-[10px] text-rose-300">⚠ Low confidence — review carefully</p>
              )}

              {getDuplicateWarning(span) && (
                <p className="mt-1 text-[10px] text-amber-300">
                  ⚠ {getDuplicateWarning(span)} similar unreviewed span{getDuplicateWarning(span) > 1 ? "s" : ""}
                </p>
              )}

              <div className="mt-2 flex gap-1">
                {actionButtons.map((btn) => (
                  <button
                    key={btn.value}
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate(span.id, {
                        action: btn.value,
                        status: btn.value === "keep-visible" ? "dismissed" : "confirmed",
                      });
                    }}
                    className={`flex-1 rounded-lg px-2 py-1 text-[10px] ${currentAction === btn.value ? "ring-1 ring-white/70" : ""} ${btn.className}`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}