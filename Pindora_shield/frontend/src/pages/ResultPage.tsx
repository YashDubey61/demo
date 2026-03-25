import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import ReportModal from "./Report";
import Molecule3DModal from "./Molecule3DModal";
import { getApiUrl } from "../config/api";

type Molecule = {
  smiles: string;
  similarity: number;
  properties: {
    molecular_weight: number;
    logp: number;
    hbd: number;
    hba: number;
    rotatable_bonds: number;
    aromatic_rings: number;
  };
};

type ResultItem = {
  disease_name: string;
  target_symbol: string;
  drug_name: string;
  generated_molecules: Molecule[][];
};

export default function ResultPage({ results }: { results: ResultItem[] }) {
  const topRef = useRef<HTMLDivElement | null>(null);

  const [metrics, setMetrics] = useState<any | null>(null);
  const [activeSmile, setActiveSmile] = useState<string | null>(null);
  const [isMetricsLoading, setIsMetricsLoading] = useState(false);

  const [reportSmile, setReportSmile] = useState<string | null>(null);
  const [view3D, setView3D] = useState<{ smiles: string; drugName?: string } | null>(null);

  const fetchMetrics = async (smile: string) => {
    try {
      setActiveSmile(smile);
      setMetrics(null);
      setIsMetricsLoading(true);

      const res = await fetch(getApiUrl("/metrics/metrics_data"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input_smile: smile }),
      });

      const data = await res.json();
      setMetrics(data);
    } catch (err) {
      console.error("Metrics API error:", err);
    } finally {
      setIsMetricsLoading(false);
    }
  };

  useEffect(() => {
    if (topRef.current) {
      topRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [results]);

  return (
    <div ref={topRef} className="results-page">
      <style>{`
        .results-page {
          margin-top: 72px;
          display: grid;
          gap: 32px;
          max-width: 1100px;
          width: 100%;
          margin-left: auto;
          margin-right: auto;
        }
        .result-card {
          background: rgba(15, 23, 42, 0.9);
          border: 1px solid rgba(148, 163, 184, 0.15);
          border-radius: 22px;
          padding: 28px;
          text-align: left;
        }
        .result-header h3 {
          font-size: 22px;
          margin-bottom: 6px;
          font-weight: 700;
        }
        .result-meta {
          font-size: 14px;
          color: #94a3b8;
          margin-bottom: 18px;
          line-height: 1.6;
        }
        .props {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 12px;
          font-size: 14px;
          color: #e5e7eb;
          background: rgba(2, 6, 23, 0.6);
          border: 1px solid rgba(148, 163, 184, 0.12);
          padding: 16px;
          border-radius: 14px;
        }
        .molecule-clickable {
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .molecule-clickable:hover {
          border-color: rgba(16, 185, 129, 0.5);
          box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.2);
        }
        .smiles {
          margin-top: 14px;
          font-family: monospace;
          font-size: 13px;
          color: #38bdf8;
          word-break: break-all;
        }
        .report-button {
          background: linear-gradient(90deg, #06b6d4, #3b82f6);
          border: none;
          color: white;
          padding: 8px 12px;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
        }
        .report-button:hover { opacity: 0.95; }
        .view-3d-hint {
          font-size: 11px;
          color: #6ee7b7;
          margin-top: 8px;
          opacity: 0.9;
        }
      `}</style>

      {results.map((item, index) => {
        const mol = item.generated_molecules?.[0]?.[0];

        return (
          <div key={index} className="result-card">
            <div className="result-header">
              <h3>{index + 1}. {item.drug_name}</h3>
            </div>

            <div className="result-meta">
              Disease: {item.disease_name}<br />
              Target: {item.target_symbol}
            </div>

            {mol && (
              <>
                <div
                  className="props molecule-clickable"
                  onClick={() => setView3D({ smiles: mol.smiles, drugName: item.drug_name })}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && setView3D({ smiles: mol.smiles, drugName: item.drug_name })}
                  title="Click to view 3D structure"
                >
                  <div>Molecular Weight: {mol.properties.molecular_weight}</div>
                  <div>LogP: {mol.properties.logp}</div>
                  <div>HBD: {mol.properties.hbd}</div>
                  <div>HBA: {mol.properties.hba}</div>
                  <div>Rotatable Bonds: {mol.properties.rotatable_bonds}</div>
                  <div>Aromatic Rings: {mol.properties.aromatic_rings}</div>
                  <div style={{ gridColumn: "1 / -1", fontSize: 12, color: "#10b981", marginTop: 4 }}>Click to view 3D</div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
                  <div
                    className="smiles"
                    style={{ cursor: "pointer" }}
                    onClick={(e) => { e.stopPropagation(); fetchMetrics(mol.smiles); }}
                  >
                    SMILES: {mol.smiles}
                  </div>

                  <button
                    className="report-button"
                    onClick={(e) => { e.stopPropagation(); setReportSmile(mol.smiles); }}
                  >
                    Report
                  </button>
                </div>

                {activeSmile === mol.smiles && (
                  <div className="props" style={{ marginTop: "16px" }}>
                    {isMetricsLoading ? (
                      <div>Analyzing selected molecule…</div>
                    ) : metrics ? (
                      <div className="prose prose-invert max-w-none text-sm">
                        <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                          {metrics?.report}
                        </ReactMarkdown>
                      </div>
                    ) : null}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}

      {reportSmile && (
        <ReportModal smiles={reportSmile} onClose={() => setReportSmile(null)} />
      )}
      {view3D && (
        <Molecule3DModal
          smiles={view3D.smiles}
          drugName={view3D.drugName}
          onClose={() => setView3D(null)}
        />
      )}
    </div>
  );
}
