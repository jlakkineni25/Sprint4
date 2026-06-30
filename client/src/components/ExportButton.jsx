import { useState } from "react";
import axios from "axios";

export default function ExportButton({ docText, spans, allReviewed, sourceFile, fileKind }) {
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState("diff");

  const missedCount = spans.filter((s) => s.status === "missed").length;
  const getAction = (span) =>
    span.action ?? (span.status === "dismissed" ? "keep-visible" : span.status === "confirmed" ? "redact" : null);

  const redactCount = spans.filter((s) => getAction(s) === "redact").length;
  const anonymousCount = spans.filter((s) => getAction(s) === "anonymous").length;
  const keepVisibleCount = spans.filter((s) => getAction(s) === "keep-visible").length;

  const handleExport = async () => {
    if (fileKind === "pdf" && sourceFile) {
      const formData = new FormData();
      formData.append("file", sourceFile);
      formData.append("document", docText);
      formData.append("spans", JSON.stringify(spans));

      const res = await axios.post("http://localhost:3001/api/export", formData, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      setResult({ kind: "pdf", url, filename: sourceFile.name.replace(/\.pdf$/i, "-redacted.pdf") });
      return;
    }

    const res = await axios.post("http://localhost:3001/api/export", { document: docText, spans });
    setResult({ kind: "text", content: res.data.redacted });
  };

  const handleCopy = () => {
    if (result?.kind !== "text") return;
    navigator.clipboard.writeText(result.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const buildDiff = () => {
    if (!result || result.kind !== "text") return [];
    const originalWords = docText.split(/(\s+)/);
    const redactedWords = result.content.split(/(\s+)/);
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
      {missedCount > 0 && (
        <div className="mb-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs text-orange-300">
          ⚠ {missedCount} span{missedCount > 1 ? "s" : ""} flagged as missed — choose a handling action before exporting.
        </div>
      )}

      <button
        onClick={handleExport}
        disabled={!allReviewed}
        className={`w-full rounded-2xl py-3 text-sm font-semibold transition-all ${
          allReviewed
            ? "bg-blue-600 text-white hover:bg-blue-500"
            : "cursor-not-allowed bg-gray-800 text-gray-500"
        }`}
      >
        {allReviewed ? (fileKind === "pdf" ? "Redact PDF & Download" : "Anonymize & Export Document") : "Review all spans to unlock anonymization"}
      </button>

      {result && (
        <div className="mt-4 rounded-3xl border border-white/10 bg-gray-900/85 p-4 shadow-2xl shadow-black/30">
          {result.kind === "pdf" ? (
            <div className="space-y-3">
              <div className="text-sm text-gray-300">The redacted PDF is ready for download.</div>
              <a
                href={result.url}
                download={result.filename}
                className="inline-flex rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                Download redacted PDF
              </a>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <div className="flex gap-1 rounded-xl bg-gray-800 p-1">
                  <button
                    onClick={() => setView("diff")}
                    className={`rounded-lg px-3 py-1 text-xs transition ${
                      view === "diff"
                        ? "bg-gray-600 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    Diff view
                  </button>
                  <button
                    onClick={() => setView("redacted")}
                    className={`rounded-lg px-3 py-1 text-xs transition ${
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
                  className="rounded-lg bg-gray-700 px-3 py-1 text-xs text-white transition hover:bg-gray-600"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>

              {view === "diff" && (
                <div className="text-sm font-mono leading-7 whitespace-pre-wrap">
                  {diff.map((seg, i) => {
                    if (seg.type === "same") return <span key={i} className="text-gray-400">{seg.text}</span>;
                    return (
                      <span key={i}>
                        <span className="bg-red-500/20 text-red-300 line-through">{seg.original}</span>
                        <span> </span>
                        <span className="bg-emerald-500/20 text-emerald-300">{seg.redacted}</span>
                      </span>
                    );
                  })}
                </div>
              )}

              {view === "redacted" && (
                <pre className="text-sm font-mono whitespace-pre-wrap text-gray-300">{result.content}</pre>
              )}
            </>
          )}

          <div className="mt-3 flex flex-wrap gap-4 border-t border-gray-700 pt-3 text-xs text-gray-500">
            <span>✓ {redactCount} redacted</span>
            <span>◌ {anonymousCount} anonymous</span>
            <span>↺ {keepVisibleCount} kept visible</span>
            <span>+ {spans.filter((s) => s.type === "MANUAL").length} manually tagged</span>
          </div>
        </div>
      )}
    </div>
  );
}