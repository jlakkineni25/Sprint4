import { useState } from "react";
import axios from "axios";
import DocumentViewer from "./components/DocumentViewer";
import ExportButton from "./components/ExportButton";
import SpanSidebar from "./components/SpanSidebar";

export default function App() {
  const [document, setDocument] = useState("");
  const [spans, setSpans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [started, setStarted] = useState(false);
  const [activeSpanId, setActiveSpanId] = useState(null);

  const updateSpan = (id, status) => {
    setSpans((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
  };

  const addMissedSpan = (text) => {
    const newSpan = {
      id: Date.now().toString(),
      text,
      type: "MANUAL",
      confidence: 1.0,
      reason: "Manually tagged by user",
      status: "confirmed",
    };
    setSpans((prev) => [...prev, newSpan]);
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await axios.post("http://localhost:3001/api/analyze", formData);
    setDocument(res.data.document);
    setSpans(res.data.spans);
    setLoading(false);
    setStarted(true);
  };

  const handleUseSample = async () => {
    setLoading(true);
    const res = await axios.post("http://localhost:3001/api/analyze");
    setDocument(res.data.document);
    setSpans(res.data.spans);
    setLoading(false);
    setStarted(true);
  };

  const goToNextUnreviewed = () => {
    const next = spans
      .filter((s) => s.status === "unreviewed" || s.status === "missed")
      .sort((a, b) => a.confidence - b.confidence)[0];
    if (next) setActiveSpanId(next.id);
  };

  const reviewed = spans.filter(
    (s) => s.status === "confirmed" || s.status === "dismissed"
  ).length;
  const total = spans.length;
  const allReviewed = total > 0 && reviewed === total;
  const unreviewedCount = total - reviewed;

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
      <div className="text-center">
        <div className="text-lg font-medium mb-2">Analyzing document...</div>
        <div className="text-sm text-gray-500">Detecting PII with Gemini</div>
      </div>
    </div>
  );

  if (!started) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-10 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-2">Conseal</h1>
        <p className="text-gray-400 text-sm mb-8">
          Upload a document to detect and review PII before sharing with AI tools.
        </p>

        <label className="block w-full border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-xl p-6 cursor-pointer transition mb-4">
          <input
            type="file"
            accept=".txt"
            className="hidden"
            onChange={handleFile}
          />
          <p className="text-gray-400 text-sm">Click to upload a <strong>.txt</strong> file</p>
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
              Review every flagged span before exporting. Unreviewed ≠ redacted.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setStarted(false)}
              className="text-xs text-gray-500 hover:text-gray-300 underline transition"
            >
              Upload new document
            </button>
            <span className={`text-sm ${allReviewed ? "text-green-400 font-medium" : "text-gray-400"}`}>
              {reviewed} / {total} reviewed
            </span>
          </div>
        </div>

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
              setSpans(prev => prev.map(s =>
                s.confidence >= 0.9 && s.status === "unreviewed"
                  ? { ...s, status: "confirmed" }
                  : s
              ));
            }}
            className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 text-gray-300 px-3 py-1.5 rounded-lg transition"
          >
            ✓ Confirm all high confidence (≥90%)
          </button>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-5 text-xs text-gray-400 flex-wrap">
          <span><span className="bg-yellow-400/30 text-yellow-300 px-1 rounded">yellow</span> unreviewed</span>
          <span><span className="bg-red-400/30 text-red-300 px-1 rounded">red</span> confirmed</span>
          <span><span className="bg-green-400/30 text-green-300 px-1 rounded">green</span> dismissed</span>
          <span><span className="bg-orange-400/30 text-orange-300 px-1 rounded">orange</span> missed PII</span>
          <span><span className="bg-blue-400/30 text-blue-300 px-1 rounded">blue</span> manually tagged</span>
        </div>

        {/* Two column layout */}
        <div className="grid grid-cols-[1fr_260px] gap-6 items-start">
          <div className="flex flex-col gap-6">
            <DocumentViewer
              docText={document}
              spans={spans}
              onUpdate={updateSpan}
              onAddMissed={addMissedSpan}
              activeSpanId={activeSpanId}
              onSpanFocus={setActiveSpanId}
            />
            <ExportButton
              docText={document}
              spans={spans}
              allReviewed={allReviewed}
            />
          </div>
          <SpanSidebar
            spans={spans}
            onUpdate={updateSpan}
            activeSpanId={activeSpanId}
            onSpanClick={setActiveSpanId}
          />
        </div>

      </div>
    </div>
  );
}