import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { getApiUrl } from "../config/api";

interface ReportProps {
  smiles: string;
  onClose: () => void;
}

function normalizeReport(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^([^\n]+)\n/, "# $1\n\n");
  s = s.replace(/^\# [^\n]+\n([^\n]+)\n/, (m, p1) => `# $1\n\n## ${p1}\n\n`);
  const sections = [
    "Executive Summary","Bioactivity","Potency","Target","Disease",
    "Clinical","ADME","Developability","Recommended","Next Steps",
    "Confidence","Assumptions"
  ];
  sections.forEach(t => {
    const re = new RegExp(`(^|\\n)${t}`, "g");
    s = s.replace(re, `\n\n## ${t}`);
  });
  return s.trim();
}

export default function ReportModal({ smiles, onClose }: ReportProps) {
  const [report, setReport] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(getApiUrl("/metrics/metrics_data"), {
        method: "POST",
        headers: {
          "accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ input_smile: smiles }),
      });

      const text = await res.text();
      let parsed: any = null;
      try { parsed = JSON.parse(text); } catch {}

      const raw = parsed?.report || parsed?.data?.report || parsed?.report_text || text;

      if (!res.ok) throw new Error(parsed?.detail || parsed?.message || text || `HTTP ${res.status}`);

      const normalized = normalizeReport(raw);
      setReport(normalized);
      setStatus(parsed?.status || "success");
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [smiles]);

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={(e)=>e.stopPropagation()}>
        
        <div style={headerRow}>
          <div style={{fontSize:18,fontWeight:700}}>Report</div>
          <button style={closeBtn} onClick={onClose}>×</button>
        </div>

        <div style={subHeader}>
          <span style={{color:"#38bdf8", fontFamily:"monospace"}}>{smiles}</span>
          {status && <span style={{marginLeft:10,color:"#94a3b8"}}>• {status}</span>}
        </div>

        {loading && <div style={{padding:20}}>Fetching report…</div>}
        {error && <div style={{padding:20,color:"#f87171"}}>Error: {error}</div>}

        {!loading && !error && report && (
          <div style={contentArea}>
            <ReactMarkdown
              remarkPlugins={[remarkMath, remarkGfm]}
              rehypePlugins={[rehypeKatex]}
            >
              {report}
            </ReactMarkdown>
          </div>
        )}

        <button style={footerCloseBtn} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

/* 🔹 Themed styles matching original app */

const overlay = {
  position:"fixed", top:0, left:0, width:"100vw", height:"100vh",
  background:"rgba(0,0,0,0.55)", display:"flex",
  justifyContent:"center", alignItems:"center", zIndex:2000
} as const;

const modal = {
  width:"780px", maxHeight:"84vh", background:"rgba(15,23,42,0.96)",
  color:"#e2e8f0", borderRadius:"20px", padding:"22px 26px",
  overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.55)",
  border:"1px solid rgba(148,163,184,0.18)"
} as const;

const headerRow = {
  display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10
} as const;

const closeBtn = {
  background:"transparent", border:"none", color:"#94a3b8",
  fontSize:"22px", cursor:"pointer", padding:"2px 6px"
} as const;

const subHeader = {
  fontSize:13, color:"#94a3b8", marginBottom:16
} as const;

const contentArea = {
  fontSize:14, lineHeight:1.6, color:"#e2e8f0"
} as const;

const footerCloseBtn = {
  marginTop:20, borderRadius:"10px", background:"rgba(56,189,248,0.25)",
  border:"1px solid rgba(56,189,248,0.4)", color:"#38bdf8",
  padding:"8px 14px", cursor:"pointer"
} as const;
