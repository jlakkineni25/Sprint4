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
    if (span.action === "keep-visible") return "bg-blue-400/20 text-blue-200 border-blue-500/30";
    if (span.action === "anonymous") return "bg-purple-400/20 text-purple-200 border-purple-500/30";
    if (span.status === "confirmed") return "bg-red-400/20 text-red-300 border-red-500/30";
    if (span.status === "dismissed") return "bg-green-400/20 text-green-300 border-green-500/30";
    if (span.status === "missed") return "bg-orange-400/20 text-orange-300 border-orange-500/30";
    return "bg-yellow-400/20 text-yellow-300 border-yellow-500/30";
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
    { value: "redact", label: "Redact", className: "bg-red-500/30 hover:bg-red-500/50 text-red-200" },
    { value: "keep-visible", label: "Keep", className: "bg-blue-500/30 hover:bg-blue-500/50 text-blue-200" },
    { value: "anonymous", label: "Anon", className: "bg-purple-500/30 hover:bg-purple-500/50 text-purple-200" },
  ];

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 h-fit sticky top-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xs uppercase tracking-wide text-gray-500 font-semibold">
          Spans
        </h2>
        {unreviewedCount > 0 && (
          <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full">
            {unreviewedCount} left
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2 max-h-[75vh] overflow-y-auto pr-1">
        {sorted.map((span) => {
          const currentAction = span.action ?? (span.status === "dismissed" ? "keep-visible" : span.status === "confirmed" ? "redact" : null);
          return (
            <div
              key={span.id}
              onClick={() => onSpanClick?.(span.id)}
              className={`border rounded-lg px-3 py-2 text-xs cursor-pointer transition-all ${getCardStyle(span)} ${activeSpanId === span.id ? "ring-2 ring-white/40" : ""}`}
            >
              <div className="flex justify-between items-center">
                <span className="font-mono font-bold truncate max-w-[120px]">{span.text}</span>
                <span className="uppercase text-[10px] opacity-70 ml-2">{span.type}</span>
              </div>
              <div className="flex justify-between items-center mt-1 opacity-60">
                <span>{span.status}</span>
                <span className={
                  span.confidence < 0.7 ? "text-red-400" :
                  span.confidence < 0.9 ? "text-yellow-400" : "text-green-400"
                }>
                  {Math.round(span.confidence * 100)}%
                </span>
              </div>

              {span.confidence < 0.7 && span.status === "unreviewed" && (
                <p className="text-[10px] text-red-400 mt-1">⚠ Low confidence — review carefully</p>
              )}

              {getDuplicateWarning(span) && (
                <p className="text-[10px] text-yellow-400 mt-1">
                  ⚠ {getDuplicateWarning(span)} similar unreviewed span{getDuplicateWarning(span) > 1 ? "s" : ""}
                </p>
              )}

              <div className="flex gap-1 mt-2">
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
                    className={`flex-1 text-[10px] py-0.5 rounded ${currentAction === btn.value ? "ring-1 ring-white/80" : ""} ${btn.className}`}
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