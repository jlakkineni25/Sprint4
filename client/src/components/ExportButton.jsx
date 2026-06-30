import { useState } from "react";
import axios from "axios";

export default function ExportButton({ document, spans, allReviewed }) {
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const missedCount = spans.filter(s => s.status === "missed").length;

  const handleExport = async () => {
    const res = await axios.post("http://localhost:3001/api/export", { document, spans });
    setResult(res.data.redacted);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
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
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-400 uppercase tracking-wide">Redacted Output</span>
            <button
              onClick={handleCopy}
              className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-white"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">{result}</pre>
        </div>
      )}
    </div>
  );
}