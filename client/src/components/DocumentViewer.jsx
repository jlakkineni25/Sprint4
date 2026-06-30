import { useState, useRef, useEffect } from "react";
import RedactionBadge from "./RedactionBadge";

export default function DocumentViewer({ document, spans, onUpdate, onAddMissed }) {
  const [tooltip, setTooltip] = useState(null); // { spanId, x, y }
  const [selectionPrompt, setSelectionPrompt] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handler = () => setTooltip(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  const getSpanColor = (span) => {
  if (span.type === "MANUAL") return "bg-blue-400/30 text-blue-200 cursor-pointer";
  if (span.status === "confirmed") return "bg-red-400/30 text-red-200 cursor-pointer";
  if (span.status === "dismissed") return "bg-green-400/30 text-green-200 cursor-pointer";
  if (span.status === "missed") return "bg-orange-400/30 text-orange-200 cursor-pointer underline decoration-dotted";
  if (span.status === "unreviewed") return "bg-yellow-400/30 text-yellow-200 cursor-pointer";
  return "bg-yellow-400/30 text-yellow-200 cursor-pointer";
};

  const buildSegments = () => {
    let text = document;
    const allSpans = [...spans];
    const positions = [];

    for (const span of allSpans) {
      const idx = text.indexOf(span.text);
      if (idx !== -1) {
        positions.push({ start: idx, end: idx + span.text.length, span });
      }
    }

    positions.sort((a, b) => a.start - b.start);

    const segments = [];
    let cursor = 0;

    for (const pos of positions) {
      if (pos.start > cursor) {
        segments.push({ type: "text", content: text.slice(cursor, pos.start) });
      }
      segments.push({ type: "span", span: pos.span });
      cursor = pos.end;
    }

    if (cursor < text.length) {
      segments.push({ type: "text", content: text.slice(cursor) });
    }

    return segments;
  };

  const handleMouseUp = () => {
    const selection = window.getSelection();
    const selected = selection?.toString().trim();
    if (selected && selected.length > 1) {
      setSelectionPrompt(selected);
    }
  };

  const segments = buildSegments();

  return (
    <div className="relative">
      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className="bg-gray-900 border border-gray-700 rounded-xl p-6 leading-8 text-gray-100 font-mono text-sm whitespace-pre-wrap select-text"
      >
        {segments.map((seg, i) => {
          if (seg.type === "text") return <span key={i}>{seg.content}</span>;

          const span = seg.span;
          const isActive = tooltip?.spanId === span.id;

          return (
            <span
              key={i}
              className={`relative rounded px-0.5 ${getSpanColor(span)} ${isActive ? "ring-2 ring-white" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setTooltip(isActive ? null : { spanId: span.id });
                setSelectionPrompt(null);
              }}
            >
              {span.status === "confirmed" ? "█".repeat(span.text.length) : span.text}
              {isActive && (
                <RedactionBadge span={span} onUpdate={onUpdate} onClose={() => setTooltip(null)} />
              )}
            </span>
          );
        })}
      </div>

      {/* Manual tag prompt */}
      {selectionPrompt && (
        <div className="mt-3 bg-gray-800 border border-orange-500 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-orange-300">
            Tag <strong>"{selectionPrompt}"</strong> as missed PII?
          </span>
          <div className="flex gap-2 ml-4">
            <button
              onClick={() => { onAddMissed(selectionPrompt); setSelectionPrompt(null); }}
              className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-1 rounded"
            >
              Tag as PII
            </button>
            <button
              onClick={() => setSelectionPrompt(null)}
              className="bg-gray-600 hover:bg-gray-500 text-white text-xs px-3 py-1 rounded"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}