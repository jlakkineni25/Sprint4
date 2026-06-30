import { useState, useRef, useEffect } from "react";
import RedactionBadge from "./RedactionBadge";

export default function DocumentViewer({ docText, spans, onUpdate, onAddMissed, activeSpanId, onSpanFocus }) {
  const [tooltip, setTooltip] = useState(null);
  const [selectionPrompt, setSelectionPrompt] = useState(null);
  const spanRefs = useRef({});

  useEffect(() => {
    const handler = (e) => {
      if (e.target.closest(".span-highlight") || e.target.closest(".redaction-badge")) return;
      setTooltip(null);
    };
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  useEffect(() => {
    if (activeSpanId && spanRefs.current[activeSpanId]) {
      setTimeout(() => {
        spanRefs.current[activeSpanId]?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        setTooltip({ spanId: activeSpanId });
      }, 50);
    }
  }, [activeSpanId]);

  const getSpanColor = (span) => {
    if (span.type === "MANUAL") return "bg-blue-400/30 text-blue-200 cursor-pointer";
    if (span.status === "missed") return "bg-orange-500/40 text-orange-100 cursor-pointer underline decoration-wavy decoration-orange-400 font-semibold";
    if (span.action === "keep-visible") return "bg-blue-400/30 text-blue-200 cursor-pointer";
    if (span.action === "anonymous") return "bg-purple-400/30 text-purple-200 cursor-pointer";
    if (span.status === "confirmed") return "bg-red-400/30 text-red-200 cursor-pointer";
    if (span.status === "dismissed") return "bg-green-400/30 text-green-200 cursor-pointer";
    if (span.status === "unreviewed") return "bg-yellow-400/30 text-yellow-200 cursor-pointer";
    return "bg-yellow-400/30 text-yellow-200 cursor-pointer";
  };

  const getAnonymousLabel = (span) => {
    const type = (span.type || "").toUpperCase();
    if (type.includes("EMAIL")) return "[REDACTED EMAIL]";
    if (type.includes("PHONE")) return "[REDACTED PHONE]";
    if (type.includes("NAME")) return "[REDACTED NAME]";
    if (type.includes("LOCATION")) return "[REDACTED LOCATION]";
    if (type.includes("DATE")) return "[REDACTED DATE]";
    if (type.includes("CARD") || type.includes("CREDIT")) return "[REDACTED CARD]";
    return type ? `[REDACTED ${type}]` : "[REDACTED]";
  };

  const getDisplayText = (span) => {
    if (span.status === "confirmed" && span.action !== "keep-visible") {
      return span.action === "anonymous" ? getAnonymousLabel(span) : "█".repeat(span.text.length);
    }
    return span.text;
  };

  const buildSegments = () => {
    const positions = [];
    for (const span of spans) {
      const idx = docText.indexOf(span.text);
      if (idx !== -1) {
        positions.push({ start: idx, end: idx + span.text.length, span });
      }
    }
    positions.sort((a, b) => a.start - b.start);

    const segments = [];
    let cursor = 0;
    for (const pos of positions) {
      if (pos.start > cursor) {
        segments.push({ type: "text", content: docText.slice(cursor, pos.start) });
      }
      segments.push({ type: "span", span: pos.span });
      cursor = pos.end;
    }
    if (cursor < docText.length) {
      segments.push({ type: "text", content: docText.slice(cursor) });
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
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-200">Document preview</h2>
        <span className="rounded-full border border-gray-700 bg-gray-800/70 px-2.5 py-1 text-[11px] text-gray-400">review mode</span>
      </div>
      <div
        onMouseUp={handleMouseUp}
        className="rounded-2xl border border-white/10 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 p-6 leading-8 text-sm font-mono whitespace-pre-wrap text-gray-100 shadow-2xl shadow-black/30 select-text"
      >
        {segments.map((seg, i) => {
          if (seg.type === "text") return <span key={i}>{seg.content}</span>;

          const span = seg.span;
          const isActive = tooltip?.spanId === span.id;

          return (
            <span
              key={i}
              ref={(el) => (spanRefs.current[span.id] = el)}
              className={`span-highlight relative rounded px-0.5 ${getSpanColor(span)} ${isActive ? "ring-2 ring-white" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setTooltip(isActive ? null : { spanId: span.id });
                setSelectionPrompt(null);
                onSpanFocus?.(span.id);
              }}
            >
              {getDisplayText(span)}
              {isActive && (
                <RedactionBadge
                  span={span}
                  onUpdate={(id, patch) => {
                    onUpdate(id, patch);
                    setTooltip(null);
                  }}
                  onClose={() => setTooltip(null)}
                />
              )}
            </span>
          );
        })}
      </div>

      {selectionPrompt && (
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-orange-500/30 bg-orange-500/10 p-3">
          <span className="text-sm text-orange-300">
            Tag <strong>"{selectionPrompt}"</strong> as missed PII?
          </span>
          <div className="ml-4 flex gap-2">
            <button
              onClick={() => { onAddMissed(selectionPrompt); setSelectionPrompt(null); }}
              className="rounded-lg bg-orange-500 px-3 py-1 text-xs text-white transition hover:bg-orange-600"
            >
              Tag as PII
            </button>
            <button
              onClick={() => setSelectionPrompt(null)}
              className="rounded-lg bg-gray-700 px-3 py-1 text-xs text-white transition hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}