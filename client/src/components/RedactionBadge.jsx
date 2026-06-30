export default function RedactionBadge({ span, onUpdate, onClose }) {
  const confidenceColor =
    span.confidence >= 0.9 ? "text-green-400" :
    span.confidence >= 0.6 ? "text-yellow-400" : "text-red-400";

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
      className="redaction-badge absolute z-50 top-8 left-0 w-72 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl p-4 text-left"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold bg-gray-700 px-2 py-0.5 rounded text-white uppercase tracking-wide">
          {span.type}
        </span>
        <span className={`text-xs font-mono ${confidenceColor}`}>
          {Math.round(span.confidence * 100)}% confidence
        </span>
      </div>

      <p className="text-xs text-gray-400 mb-3">
        {span.reason ?? "Detected by pattern match — no explanation available."}
      </p>

      {span.confidence < 0.7 && (
        <p className="text-xs text-yellow-400 bg-yellow-400/10 rounded p-2 mb-3">
          ⚠ Low confidence — review carefully before confirming.
        </p>
      )}

      {span.status === "missed" && (
        <p className="text-xs text-orange-400 bg-orange-400/10 rounded p-2 mb-3">
          ⚠ The tool missed this — choose how to handle it before export.
        </p>
      )}

      <div className="grid grid-cols-1 gap-2 mb-3">
        <button
          onClick={() => handleAction("redact")}
          className={`text-xs py-1.5 rounded font-medium ${currentAction === "redact" ? "bg-red-500 text-white" : "bg-red-500/20 text-red-200 hover:bg-red-500/30"}`}
        >
          Redact fully
        </button>
        <button
          onClick={() => handleAction("keep-visible")}
          className={`text-xs py-1.5 rounded font-medium ${currentAction === "keep-visible" ? "bg-blue-500 text-white" : "bg-blue-500/20 text-blue-200 hover:bg-blue-500/30"}`}
        >
          Keep visible
        </button>
        <button
          onClick={() => handleAction("anonymous")}
          className={`text-xs py-1.5 rounded font-medium ${currentAction === "anonymous" ? "bg-purple-500 text-white" : "bg-purple-500/20 text-purple-200 hover:bg-purple-500/30"}`}
        >
          Make anonymous
        </button>
      </div>

      {(span.status === "confirmed" || span.status === "dismissed") && (
        <button
          onClick={() => { onUpdate(span.id, { status: "unreviewed", action: null }); onClose(); }}
          className="w-full bg-yellow-600 hover:bg-yellow-500 text-white text-xs py-1.5 rounded font-medium"
        >
          Undo review choice
        </button>
      )}

      <p className="text-[10px] text-gray-600 mt-3 text-center">
        Click outside to close
      </p>
    </div>
  );
}