import { useState } from "react";
import axios from "axios";
import DocumentViewer from "./components/DocumentViewer";
import ExportButton from "./components/ExportButton";
import SpanSidebar from "./components/SpanSidebar";

const normalizeSpan = (span) => {
  const status = span.status || "unreviewed";
  const action =
    span.action ??
    (status === "confirmed"
      ? "redact"
      : status === "dismissed"
      ? "keep-visible"
      : null);

  return { ...span, status, action };
};

export default function App() {
  // files: [{ filename, document, spans, activeSpanId }]
  const [files, setFiles] = useState([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);

  const activeFile = files[activeFileIndex];

  const updateFile = (index, patch) => {
    setFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...(typeof patch === "function" ? patch(f) : patch) } : f))
    );
  };

  const updateSpan = (id, patchOrStatus) => {
    updateFile(activeFileIndex, (f) => ({
      spans: f.spans.map((s) => {
        if (s.id !== id) return s;

        const patch = typeof patchOrStatus === "string" ? { status: patchOrStatus } : patchOrStatus;
        const next = { ...s, ...patch };

        if (patch.status && patch.action === undefined) {
          if (patch.status === "dismissed") next.action = "keep-visible";
          else if (patch.status === "confirmed" || patch.status === "missed") next.action = "redact";
          else next.action = null;
        } else if (patch.action && patch.status === undefined) {
          next.status = patch.action === "keep-visible" ? "dismissed" : "confirmed";
        }

        return next;
      }),
    }));
  };

  const addMissedSpan = (text) => {
    const newSpan = {
      id: `manual-${Date.now()}`,
      text,
      type: "MANUAL",
      confidence: 1.0,
      reason: "Manually tagged by user",
      status: "confirmed",
      action: "redact",
    };
    updateFile(activeFileIndex, (f) => ({ spans: [...f.spans, newSpan] }));
  };

  const setActiveSpanId = (id) => {
    updateFile(activeFileIndex, { activeSpanId: id });
  };

  const loadFilesFromResponse = (data, sourceFiles = []) => {
    const loaded = data.files.map((f, index) => ({
      filename: f.filename,
      document: f.document,
      spans: f.spans.map(normalizeSpan),
      activeSpanId: null,
      sourceFile: sourceFiles[index] || null,
      kind: f.kind || "text",
    }));
    setFiles(loaded);
    setActiveFileIndex(0);
    setStarted(true);
  };

  const handleFile = async (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;
    setLoading(true);
    try {
      const formData = new FormData();
      selected.forEach((file) => formData.append("files", file));
      const res = await axios.post("http://localhost:3001/api/analyze", formData);
      loadFilesFromResponse(res.data, selected);
    } finally {
      setLoading(false);
    }
  };

  const handleUseSample = async () => {
    setLoading(true);
    try {
      const res = await axios.post("http://localhost:3001/api/analyze");
      loadFilesFromResponse(res.data);
    } finally {
      setLoading(false);
    }
  };

  const goToNextUnreviewed = () => {
    if (!activeFile) return;
    const next = activeFile.spans
      .filter((s) => s.status === "unreviewed" || s.status === "missed")
      .sort((a, b) => a.confidence - b.confidence)[0];
    if (next) setActiveSpanId(next.id);
  };

  const fileStats = (file) => {
    const reviewed = file.spans.filter((s) => s.status === "confirmed" || s.status === "dismissed").length;
    const total = file.spans.length;
    return { reviewed, total, allReviewed: total > 0 && reviewed === total };
  };

  const { reviewed, total, allReviewed } = activeFile
    ? fileStats(activeFile)
    : { reviewed: 0, total: 0, allReviewed: false };
  const unreviewedCount = total - reviewed;

  if (loading) return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.16),_transparent_40%),linear-gradient(135deg,_#040816,_#0f172a)] flex items-center justify-center text-white px-6">
      <div className="rounded-3xl border border-white/10 bg-gray-900/80 px-8 py-10 shadow-2xl shadow-black/30 backdrop-blur">
        <div className="mb-3 h-2.5 w-24 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400" />
        <div className="text-lg font-semibold">Analyzing document{files.length > 1 ? "s" : ""}...</div>
        <p className="mt-2 text-sm text-gray-400">Scanning for sensitive spans and preparing the review workspace.</p>
      </div>
    </div>
  );

  if (!started) return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.2),_transparent_35%),linear-gradient(135deg,_#030712,_#111827)] flex items-center justify-center px-6 py-10 text-white">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-gray-900/85 p-8 shadow-2xl shadow-black/40 backdrop-blur">
        <div className="mb-6 inline-flex rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-blue-300">
          Secure review workspace
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">Conseal</h1>
        <p className="mt-3 text-sm leading-6 text-gray-400">
          Upload one or more documents to detect and review PII before sharing with AI tools.
        </p>

        <label className="mt-8 block cursor-pointer rounded-2xl border border-dashed border-gray-600 bg-gray-800/70 p-6 transition hover:border-blue-400 hover:bg-gray-800">
          <input
            type="file"
            accept=".txt,.pdf,.doc,.docx,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple
            className="hidden"
            onChange={handleFile}
          />
          <p className="text-sm font-medium text-gray-200">Click to upload <span className="text-blue-300">text/PDF/Word</span> file(s)</p>
          <p className="mt-2 text-xs text-gray-500">or use the sample document below</p>
        </label>

        <button
          onClick={handleUseSample}
          className="mt-4 text-sm text-gray-400 transition hover:text-gray-200"
        >
          Use sample document instead
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_35%),linear-gradient(135deg,_#030712,_#0f172a)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 rounded-3xl border border-white/10 bg-gray-900/80 p-5 shadow-2xl shadow-black/30 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="mb-3 inline-flex rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-blue-300">
                PII review console
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">Conseal</h1>
              <p className="mt-2 text-sm text-gray-400">
                Choose how each span should be handled before exporting. Unreviewed does not mean visible.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => { setStarted(false); setFiles([]); }}
                className="rounded-full border border-gray-700 bg-gray-800/80 px-3 py-1.5 text-xs text-gray-300 transition hover:border-blue-400/40 hover:text-white"
              >
                Upload new document(s)
              </button>
              <span className={`rounded-full px-3 py-1.5 text-sm ${allReviewed ? "bg-emerald-500/15 text-emerald-300" : "bg-gray-800/80 text-gray-300"}`}>
                {reviewed} / {total} reviewed
              </span>
            </div>
          </div>
        </div>

        {files.length > 1 && (
          <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-gray-900/70 p-2 shadow-lg shadow-black/20">
            {files.map((f, i) => {
              const stats = fileStats(f);
              const isActive = i === activeFileIndex;
              return (
                <button
                  key={i}
                  onClick={() => setActiveFileIndex(i)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs transition ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-950/40"
                      : "bg-gray-800/80 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  <span className="truncate max-w-[140px]">{f.filename}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] ${
                      stats.allReviewed
                        ? "bg-emerald-500/20 text-emerald-200"
                        : isActive
                        ? "bg-white/20 text-white"
                        : "bg-gray-700 text-gray-400"
                    }`}
                  >
                    {stats.reviewed}/{stats.total}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="mb-5 rounded-2xl border border-white/10 bg-gray-900/70 p-3 shadow-lg shadow-black/20">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-1.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${total ? (reviewed / total) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="mb-5 flex flex-wrap gap-3">
          {!allReviewed && (
            <button
              onClick={goToNextUnreviewed}
              className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-500"
            >
              → Next unreviewed
              <span className="ml-2 rounded-full bg-blue-500/40 px-2 py-0.5 text-[10px]">
                {unreviewedCount} left
              </span>
            </button>
          )}
          <button
            onClick={() => {
              updateFile(activeFileIndex, (f) => ({
                spans: f.spans.map((s) =>
                  s.confidence >= 0.9 && s.status === "unreviewed"
                    ? { ...s, status: "confirmed", action: "redact" }
                    : s
                ),
              }));
            }}
            className="rounded-xl border border-gray-700 bg-gray-800/80 px-3 py-2 text-xs font-medium text-gray-200 transition hover:border-gray-500 hover:bg-gray-700"
          >
            ✓ Confirm all high confidence (≥90%)
          </button>
        </div>

        <div className="mb-6 flex flex-wrap gap-3 rounded-2xl border border-white/10 bg-gray-900/70 p-3 text-xs text-gray-400 shadow-lg shadow-black/20">
          <span className="rounded-full bg-yellow-400/15 px-2.5 py-1 text-yellow-300">yellow</span> unreviewed
          <span className="rounded-full bg-red-400/15 px-2.5 py-1 text-red-300">red</span> redact
          <span className="rounded-full bg-blue-400/15 px-2.5 py-1 text-blue-300">blue</span> keep visible
          <span className="rounded-full bg-purple-400/15 px-2.5 py-1 text-purple-300">purple</span> anonymous
          <span className="rounded-full bg-orange-400/15 px-2.5 py-1 text-orange-300">orange</span> missed PII
        </div>

        {activeFile && (
          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="flex flex-col gap-6">
              <DocumentViewer
                docText={activeFile.document}
                spans={activeFile.spans}
                onUpdate={updateSpan}
                onAddMissed={addMissedSpan}
                activeSpanId={activeFile.activeSpanId}
                onSpanFocus={setActiveSpanId}
              />
              <ExportButton
                docText={activeFile.document}
                spans={activeFile.spans}
                allReviewed={allReviewed}
                sourceFile={activeFile.sourceFile}
                fileKind={activeFile.kind}
              />
            </div>
            <SpanSidebar
              spans={activeFile.spans}
              onUpdate={updateSpan}
              activeSpanId={activeFile.activeSpanId}
              onSpanClick={setActiveSpanId}
            />
          </div>
        )}
      </div>
    </div>
  );
}