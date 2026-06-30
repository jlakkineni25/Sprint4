export default function RedactionBadge({ span, onUpdate, onClose }) {
  const confidenceColor =
    span.confidence >= 0.9 ? "text-emerald-300" :
    span.confidence >= 0.6 ? "text-amber-300" : "text-rose-300";

  const currentAction = span.action ?? (span.status === "dismissed" ? "keep-visible" : span.status === "confirmed" ? "redact" : null);

  const handleAction = (action) => {
    onUpdate(span.id, {
      action,
      status: action === "keep-visible" ? "dismissed" : "confirmed",
    });
    onClose();
  };

  return (
    <div
      className="redaction-badge absolute left-0 top-8 z-50 w-80 rounded-2xl border border-gray-700/80 bg-gray-900/95 p-4 text-left shadow-2xl shadow-black/50"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-gray-800 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-gray-200">
          {span.type}
        </span>
        <span className={`text-xs font-mono ${confidenceColor}`}>
          {Math.round(span.confidence * 100)}% confidence
        </span>
      </div>

      <p className="mb-3 text-xs leading-5 text-gray-400">
        {span.reason ?? "Detected by pattern match — no explanation available."}
      </p>

      {span.confidence < 0.7 && (
        <p className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/10 p-2 text-xs text-amber-300">
          ⚠ Low confidence — review carefully before confirming.
        </p>
      )}

      {span.status === "missed" && (
        <p className="mb-3 rounded-xl border border-orange-500/20 bg-orange-500/10 p-2 text-xs text-orange-300">
          ⚠ The tool missed this — choose how to handle it before export.
        </p>
      )}

      <div className="mb-3 grid gap-2">
        <button
          onClick={() => handleAction("redact")}
          className={`rounded-xl px-3 py-2 text-xs font-medium ${currentAction === "redact" ? "bg-red-500 text-white" : "bg-red-500/20 text-red-200 hover:bg-red-500/30"}`}
        >
          Redact fully
        </button>
        <button
          onClick={() => handleAction("keep-visible")}
          className={`rounded-xl px-3 py-2 text-xs font-medium ${currentAction === "keep-visible" ? "bg-blue-500 text-white" : "bg-blue-500/20 text-blue-200 hover:bg-blue-500/30"}`}
        >
          Keep visible
        </button>
        <button
          onClick={() => handleAction("anonymous")}
          className={`rounded-xl px-3 py-2 text-xs font-medium ${currentAction === "anonymous" ? "bg-purple-500 text-white" : "bg-purple-500/20 text-purple-200 hover:bg-purple-500/30"}`}
        >
          Make anonymous
        </button>
      </div>

      {(span.status === "confirmed" || span.status === "dismissed") && (
        <button
          onClick={() => { onUpdate(span.id, { status: "unreviewed", action: null }); onClose(); }}
          className="w-full rounded-xl bg-yellow-600/90 px-3 py-2 text-xs font-medium text-white transition hover:bg-yellow-500"
        >
          Undo review choice
        </button>
      )}

      <p className="mt-3 text-center text-[10px] text-gray-600">
        Click outside to close
      </p>
    </div>
  );
}