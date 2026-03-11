/**
 * Modal that fetches 3D molecule from API and displays it in Molecule3DViewer.
 * Includes title, molecular info panel, and enhanced viewer.
 * Panels can be hidden to maximize 3D viewer visibility.
 */
import { useEffect, useState } from "react";
import { X, PanelRightClose, PanelRightOpen, SlidersHorizontal } from "lucide-react";
import Molecule3DViewer from "./Molecule3DViewer";
import MolecularInfoPanel from "../components/MolecularInfoPanel";
import type { MolecularInfo } from "../components/MolecularInfoPanel";
import { getApiUrl } from "../config/api";

interface Molecule3DModalProps {
  smiles: string;
  drugName?: string;
  onClose: () => void;
}

interface ApiResponse {
  smiles: string;
  sdf: string;
  molecular_formula?: string;
  molecular_weight?: number;
  num_atoms?: number;
  num_bonds?: number;
}

export default function Molecule3DModal({ smiles, drugName, onClose }: Molecule3DModalProps) {
  const [sdf, setSdf] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<MolecularInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Panel visibility - both visible by default
  const [showControls, setShowControls] = useState(true);
  const [showInfo, setShowInfo] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setSdf(null);
      setMetadata(null);
      try {
        const res = await fetch(getApiUrl("/api/generate-3d-molecule"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ smiles }),
        });
        const data: ApiResponse = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data?.detail || data?.message || `HTTP ${res.status}`);
        setSdf(data.sdf);
        setMetadata({
          drugName,
          smiles: data.smiles,
          molecular_formula: data.molecular_formula,
          molecular_weight: data.molecular_weight,
          num_atoms: data.num_atoms,
          num_bonds: data.num_bonds,
        });
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to generate 3D molecule");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [smiles, drugName]);

  const title = drugName
    ? `Molecule Visualization: ${drugName}`
    : `Molecule Visualization${smiles ? `: ${smiles.slice(0, 20)}${smiles.length > 20 ? "…" : ""}` : ""}`;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col gap-4 bg-slate-900 rounded-2xl p-6 max-w-[95vw] max-h-[95vh] overflow-hidden border border-slate-700/50 shadow-2xl"
        style={{ minHeight: 500 }}
      >
        {/* Header: title + toggle buttons + close */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg text-slate-100 font-semibold flex-1 min-w-0">
            {title}
          </h3>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => setShowControls((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors bg-slate-700/60 hover:bg-slate-600/60 text-slate-200 border border-slate-600/50"
            >
              {showControls ? <SlidersHorizontal size={14} /> : <SlidersHorizontal size={14} className="opacity-60" />}
              {showControls ? "Hide Controls" : "Show Controls"}
            </button>
            <button
              type="button"
              onClick={() => setShowInfo((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors bg-slate-700/60 hover:bg-slate-600/60 text-slate-200 border border-slate-600/50"
            >
              {showInfo ? <PanelRightClose size={14} /> : <PanelRightOpen size={14} />}
              {showInfo ? "Hide Info" : "Show Info"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-700/50 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {loading && <div className="py-12 text-slate-400">Generating 3D structure…</div>}
        {error && <div className="py-12 text-red-400">{error}</div>}

        {sdf && !loading && (
          <div
            className="flex-1 min-h-0 grid gap-4 items-stretch"
            style={{
              gridTemplateColumns: `minmax(0, 1fr) ${showInfo ? "240px" : "0fr"}`,
              transition: "grid-template-columns 0.3s ease-out",
            }}
          >
            {/* Left: 3D viewer - expands when info hidden */}
            <div className="min-w-0 min-h-[500px] flex flex-col">
              <div
                className="flex-1 w-full min-h-[500px] rounded-xl overflow-hidden bg-slate-950 border border-slate-700/50"
                style={{ height: "100%" }}
              >
                <Molecule3DViewer
                  sdf={sdf}
                  drugName={drugName}
                  height="100%"
                  width="100%"
                  onError={setError}
                  showLegend={showControls}
                  showStyleControls={showControls}
                  showExportButton={showControls}
                />
              </div>
            </div>

            {/* Right: Molecular info panel - smoothly collapses (0fr) when hidden */}
            {metadata && (
              <div className="overflow-hidden min-w-0 transition-opacity duration-300" style={{ opacity: showInfo ? 1 : 0 }}>
                <div className="w-[240px] min-w-[200px] h-full overflow-y-auto rounded-xl border border-slate-700/50 bg-slate-900/90 p-4">
                  <div className="flex justify-end -mt-1 -mr-1 mb-2">
                    <button
                      type="button"
                      onClick={() => setShowInfo(false)}
                      className="p-1 text-slate-400 hover:text-slate-200 rounded transition-colors"
                      aria-label="Hide info panel"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <MolecularInfoPanel info={metadata} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
