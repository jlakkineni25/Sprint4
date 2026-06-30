export default function SpanSidebar({ spans, onUpdate }) {
  const statusOrder = { unreviewed: 0, missed: 1, confirmed: 2, dismissed: 3 };
  const sorted = [...spans].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  const statusStyle = {
    unreviewed: "bg-yellow-400/20 text-yellow-300 border-yellow-500/30",
    confirmed: "bg-red-400/20 text-red-300 border-red-500/30",
    dismissed: "bg-green-400/20 text-green-300 border-green-500/30",
    missed: "bg-orange-400/20 text-orange-300 border-orange-500/30",
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 h-fit">
      <h2 className="text-xs uppercase tracking-wide text-gray-500 mb-3 font-semibold">
        Detected Spans
      </h2>
      <div className="flex flex-col gap-2">
        {sorted.map((span) => (
          <div
            key={span.id}
            className={`border rounded-lg px-3 py-2 text-xs ${statusStyle[span.status]}`}
          >
            <div className="flex justify-between items-center">
              <span className="font-mono font-bold truncate max-w-[120px]">{span.text}</span>
              <span className="uppercase text-[10px] opacity-70 ml-2">{span.type}</span>
            </div>
            <div className="flex justify-between items-center mt-1 opacity-60">
              <span>{span.status}</span>
              <span>{Math.round(span.confidence * 100)}%</span>
            </div>
            {span.status === "unreviewed" && (
              <div className="flex gap-1 mt-2">
                <button
                  onClick={() => onUpdate(span.id, "confirmed")}
                  className="flex-1 bg-red-500/30 hover:bg-red-500/50 text-red-200 text-[10px] py-0.5 rounded"
                >
                  Confirm
                </button>
                <button
                  onClick={() => onUpdate(span.id, "dismissed")}
                  className="flex-1 bg-green-500/30 hover:bg-green-500/50 text-green-200 text-[10px] py-0.5 rounded"
                >
                  Dismiss
                </button>
              </div>
            )}
            {span.status === "missed" && (
              <button
                onClick={() => onUpdate(span.id, "confirmed")}
                className="w-full mt-2 bg-orange-500/30 hover:bg-orange-500/50 text-orange-200 text-[10px] py-0.5 rounded"
              >
                Confirm as PII
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}