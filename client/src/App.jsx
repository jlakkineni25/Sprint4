import { useEffect, useState } from "react";
import axios from "axios";
import DocumentViewer from "./components/DocumentViewer";
import ExportButton from "./components/ExportButton";
import SpanSidebar from "./components/SpanSidebar";

export default function App() {
  const [document, setDocument] = useState("");
  const [spans, setSpans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.post("http://localhost:3001/api/analyze").then((res) => {
      setDocument(res.data.document);
      setSpans(res.data.spans);
      setLoading(false);
    });
  }, []);

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

  const reviewed = spans.filter(
    (s) => s.status === "confirmed" || s.status === "dismissed"
  ).length;
  const total = spans.length;
  const allReviewed = reviewed === total;

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">
      Analyzing document...
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
          <div className="text-right text-sm text-gray-400">
            <span className={allReviewed ? "text-green-400 font-medium" : ""}>
              {reviewed} / {total} reviewed
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="w-full bg-gray-800 rounded-full h-1.5">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${total ? (reviewed / total) * 100 : 0}%` }}
            />
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 mb-5 text-xs text-gray-400 flex-wrap">
          <span><span className="bg-yellow-400/30 text-yellow-300 px-1 rounded">yellow</span> unreviewed</span>
          <span><span className="bg-red-400/30 text-red-300 px-1 rounded">red</span> confirmed</span>
          <span><span className="bg-green-400/30 text-green-300 px-1 rounded">green</span> dismissed</span>
          <span><span className="bg-orange-400/30 text-orange-300 px-1 rounded">orange</span> missed PII</span>
          <span><span className="bg-blue-400/30 text-blue-300 px-1 rounded">blue</span> manually tagged</span>
        </div>

        {/* Bulk action */}
        <div className="mb-5">
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

        {/* Two column layout */}
        <div className="grid grid-cols-[1fr_260px] gap-6 items-start">
          <div className="flex flex-col gap-6">
            <DocumentViewer
              document={document}
              spans={spans}
              onUpdate={updateSpan}
              onAddMissed={addMissedSpan}
            />
            <ExportButton
              document={document}
              spans={spans}
              allReviewed={allReviewed}
            />
          </div>
          <SpanSidebar spans={spans} onUpdate={updateSpan} />
        </div>

      </div>
    </div>
  );
}