/**
 * Modal that fetches 3D molecule from API and displays it in Molecule3DViewer.
 */
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import Molecule3DViewer from "./Molecule3DViewer";
import { getApiUrl } from "../config/api";

interface Molecule3DModalProps {
  smiles: string;
  onClose: () => void;
}

export default function Molecule3DModal({ smiles, onClose }: Molecule3DModalProps) {
  const [sdf, setSdf] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setSdf(null);
      try {
        const res = await fetch(getApiUrl("/api/generate-3d-molecule"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ smiles }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data?.detail || data?.message || `HTTP ${res.status}`);
        setSdf(data.sdf);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to generate 3D molecule");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [smiles]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#0f172a",
          borderRadius: 16,
          padding: 20,
          maxWidth: "90vw",
          maxHeight: "90vh",
          overflow: "auto",
          border: "1px solid rgba(148,163,184,0.2)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 18 }}>3D Molecule</h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: 4,
            }}
          >
            <X size={20} />
          </button>
        </div>
        {loading && <div style={{ padding: 24, color: "#94a3b8" }}>Generating 3D structure…</div>}
        {error && <div style={{ padding: 24, color: "#f87171" }}>{error}</div>}
        {sdf && !loading && (
          <Molecule3DViewer
            sdf={sdf}
            height="420px"
            width="500px"
            onError={setError}
          />
        )}
      </div>
    </div>
  );
}
