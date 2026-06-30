import { useState } from "react";
import axios from "axios";

export default function ExportButton({ docText, spans, allReviewed }) {
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState("diff"); // "diff" | "redacted"

  const missedCount = spans.filter(s => s.status === "missed").length;

  const handleExport = async () => {
    const res = await axios.post("http://localhost:3001/api/export", { document: docText, spans });
    setResult(res.data.redacted);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Build diff segments — compare original vs redacted word by word
  const buildDiff = () => {
    if (!result) return [];
    const originalWords = docText.split(/(\s+)/);
    const redactedWords = result.split(/(\s+)/);
    const maxLen = Math.max(originalWords.length, redactedWords.length);
    const segments = [];

    for (let i = 0; i < maxLen; i++) {
      const orig = originalWords[i] ?? "";
      const redc = redactedWords[i] ?? "";
      if (orig === redc) {
        segments.push({ type: "same", text: orig });
      } else {
        segments.push({ type: "changed", original: orig, redacted: redc });
      }
    }
    return segments;
  };

  const diff = buildDiff();

  return (
    <div>
      {/* Missed PII warning */}
      {missedCount > 0 && (
        <div className="mb-3 text-xs bg-orange-500/10 border border-orange-500/30 text-orange-300 rounded-lg px-3 py-2">
          ⚠ {missedCount} span{missedCount > 1 ? "s" : ""} flagged as missed — confirm or they won't be redacted.
        </div>
      )}

      <button
        onClick={handleExport}
        disabled={!allReviewed}
        className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
          allReviewed
            ? "bg-blue-600 hover:bg-blue-500 text-white"
            : "bg-gray-800 text-gray-500 cursor-not-allowed"
        }`}
      >
        {allReviewed ? "Export Redacted Document" : "Review all spans to unlock export"}
      </button>

      {result && (
        <div className="mt-4 bg-gray-900 border border-gray-700 rounded-xl p-4">
          
          {/* Tab switcher */}
          <div className="flex justify-between items-center mb-3">
            <div className="flex gap-1 bg-gray-800 rounded-lg p-1">
              <button
                onClick={() => setView("diff")}
                className={`text-xs px-3 py-1 rounded-md transition ${
                  view === "diff"
                    ? "bg-gray-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Diff view
              </button>
              <button
                onClick={() => setView("redacted")}
                className={`text-xs px-3 py-1 rounded-md transition ${
                  view === "redacted"
                    ? "bg-gray-600 text-white"
                    : "text-gray-400 hover:text-white"
                }`}
              >
                Redacted only
              </button>
            </div>
            <button
              onClick={handleCopy}
              className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-white"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {/* Diff view */}
          {view === "diff" && (
            <div className="text-sm font-mono whitespace-pre-wrap leading-7">
              {diff.map((seg, i) => {
                if (seg.type === "same") return <span key={i} className="text-gray-400">{seg.text}</span>;
                return (
                  <span key={i}>
                    <span className="bg-red-500/20 text-red-300 line-through">{seg.original}</span>
                    <span> </span>
                    <span className="bg-green-500/20 text-green-300">{seg.redacted}</span>
                  </span>
                );
              })}
            </div>
          )}

          {/* Redacted only view */}
          {view === "redacted" && (
            <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">{result}</pre>
          )}

          {/* Summary */}
          <div className="mt-3 pt-3 border-t border-gray-700 flex gap-4 text-xs text-gray-500">
            <span>
              ✓ {spans.filter(s => s.status === "confirmed").length} redacted
            </span>
            <span>
              ✕ {spans.filter(s => s.status === "dismissed").length} dismissed
            </span>
            <span>
              + {spans.filter(s => s.type === "MANUAL").length} manually tagged
            </span>
          </div>

        </div>
      )}
    </div>
  );
}