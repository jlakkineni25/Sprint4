export default function RedactionBadge({ span, onUpdate, onClose }) {
  const confidenceColor =
    span.confidence >= 0.9 ? "text-green-400" :
    span.confidence >= 0.6 ? "text-yellow-400" : "text-red-400";

  return (
    <div
      className="absolute z-50 top-8 left-0 w-72 bg-gray-800 border border-gray-600 rounded-xl shadow-2xl p-4 text-left"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Type + Confidence */}
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-bold bg-gray-700 px-2 py-0.5 rounded text-white uppercase tracking-wide">
          {span.type}
        </span>
        <span className={`text-xs font-mono ${confidenceColor}`}>
          {Math.round(span.confidence * 100)}% confidence
        </span>
      </div>

      {/* Reason */}
      <p className="text-xs text-gray-400 mb-3">
        {span.reason ?? "Detected by pattern match — no explanation available."}
      </p>

      {/* Warning for low confidence */}
      {span.confidence < 0.7 && (
        <p className="text-xs text-yellow-400 bg-yellow-400/10 rounded p-2 mb-3">
          ⚠ Low confidence — review carefully before confirming.
        </p>
      )}

      {/* Missed PII warning */}
      {span.status === "missed" && (
        <p className="text-xs text-orange-400 bg-orange-400/10 rounded p-2 mb-3">
          ⚠ The tool missed this — confirm to redact it.
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {span.status !== "confirmed" && (
          <button
            onClick={() => { onUpdate(span.id, "confirmed"); onClose(); }}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs py-1.5 rounded font-medium"
          >
            Confirm Redaction
          </button>
        )}
        {span.status !== "dismissed" && span.status !== "missed" && (
          <button
            onClick={() => { onUpdate(span.id, "dismissed"); onClose(); }}
            className="flex-1 bg-gray-600 hover:bg-gray-500 text-white text-xs py-1.5 rounded font-medium"
          >
            Not PII
          </button>
        )}
        {span.status === "dismissed" && (
          <button
            onClick={() => { onUpdate(span.id, "unreviewed"); onClose(); }}
            className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white text-xs py-1.5 rounded font-medium"
          >
            Undo
          </button>
        )}
      </div>

      <p className="text-[10px] text-gray-600 mt-3 text-center">
        Click outside to close
      </p>
    </div>
  );
}