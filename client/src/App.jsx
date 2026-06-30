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

  const loadFilesFromResponse = (data) => {
    const loaded = data.files.map((f) => ({
      filename: f.filename,
      document: f.document,
      spans: f.spans.map(normalizeSpan),
      activeSpanId: null,
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
      loadFilesFromResponse(res.data);
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
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
      <div className="text-center">
        <div className="text-lg font-medium mb-2">Analyzing document{files.length > 1 ? "s" : ""}...</div>
      </div>
    </div>
  );

  if (!started) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-10 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-2">Conseal</h1>
        <p className="text-gray-400 text-sm mb-8">
          Upload one or more documents to detect and review PII before sharing with AI tools.
        </p>

        <label className="block w-full border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-xl p-6 cursor-pointer transition mb-4">
          <input
            type="file"
            accept=".txt,.pdf,.doc,.docx,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            multiple
            className="hidden"
            onChange={handleFile}
          />
          <p className="text-gray-400 text-sm">Click to upload <strong>text/PDF/Word</strong> file(s)</p>
          <p className="text-gray-600 text-xs mt-1">or use the sample document below</p>
        </label>

        <button
          onClick={handleUseSample}
          className="text-xs text-gray-500 hover:text-gray-300 underline transition"
        >
          Use sample document instead
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Conseal</h1>
            <p className="text-gray-400 text-sm mt-1">
              Choose how each span should be handled before exporting. Unreviewed does not mean visible.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => { setStarted(false); setFiles([]); }}
              className="text-xs text-gray-500 hover:text-gray-300 underline transition"
            >
              Upload new document(s)
            </button>
            <span className={`text-sm ${allReviewed ? "text-green-400 font-medium" : "text-gray-400"}`}>
              {reviewed} / {total} reviewed
            </span>
          </div>
        </div>

        {/* File tabs */}
        {files.length > 1 && (
          <div className="flex gap-1.5 mb-5 flex-wrap border-b border-gray-800 pb-3">
            {files.map((f, i) => {
              const stats = fileStats(f);
              const isActive = i === activeFileIndex;
              return (
                <button
                  key={i}
                  onClick={() => setActiveFileIndex(i)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition flex items-center gap-2 ${
                    isActive
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700"
                  }`}
                >
                  <span className="truncate max-w-[140px]">{f.filename}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      stats.allReviewed
                        ? "bg-green-500/30 text-green-200"
                        : isActive
                        ? "bg-blue-500/50 text-white"
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

        {/* Progress */}
        <div className="mb-5">
          <div className="w-full bg-gray-800 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${total ? (reviewed / total) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Actions row */}
        <div className="flex gap-3 mb-5 flex-wrap">
          {!allReviewed && (
            <button
              onClick={goToNextUnreviewed}
              className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
            >
              → Next unreviewed
              <span className="bg-blue-500/50 px-1.5 py-0.5 rounded text-[10px]">
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
            className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 px-3 py-1.5 rounded-lg transition"
          >
            ✓ Confirm all high confidence (≥90%)
          </button>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-5 text-xs text-gray-400 flex-wrap">
          <span><span className="bg-yellow-400/30 text-yellow-300 px-1 rounded">yellow</span> unreviewed</span>
          <span><span className="bg-red-400/30 text-red-300 px-1 rounded">red</span> redact</span>
          <span><span className="bg-blue-400/30 text-blue-300 px-1 rounded">blue</span> keep visible</span>
          <span><span className="bg-purple-400/30 text-purple-300 px-1 rounded">purple</span> anonymous</span>
          <span><span className="bg-orange-400/30 text-orange-300 px-1 rounded">orange</span> missed PII</span>
        </div>

        {/* Two column layout */}
        {activeFile && (
          <div className="grid grid-cols-[1fr_260px] gap-6 items-start">
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