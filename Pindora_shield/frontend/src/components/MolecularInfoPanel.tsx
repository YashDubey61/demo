/**
 * Molecular information panel displaying drug name, SMILES, formula, weight, atoms, bonds.
 */
import React from "react";

export interface MolecularInfo {
  drugName?: string;
  smiles: string;
  molecular_formula?: string;
  molecular_weight?: number;
  num_atoms?: number;
  num_bonds?: number;
}

interface MolecularInfoPanelProps {
  info: MolecularInfo;
  style?: React.CSSProperties;
}

const panelStyle: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.95)",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  borderRadius: 12,
  padding: 16,
  fontSize: 13,
  color: "#e2e8f0",
  fontFamily: "system-ui, sans-serif",
  minWidth: 220,
};

const rowStyle: React.CSSProperties = {
  marginBottom: 10,
  display: "flex",
  flexDirection: "column",
  gap: 2,
};

const labelStyle: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: 11,
  fontWeight: 500,
};

const valueStyle: React.CSSProperties = {
  color: "#f1f5f9",
  wordBreak: "break-all",
  fontFamily: "monospace",
  fontSize: 12,
};

export default function MolecularInfoPanel({ info, style }: MolecularInfoPanelProps) {
  const rows = [
    { label: "Drug Name", value: info.drugName || "—" },
    { label: "SMILES", value: info.smiles },
    { label: "Molecular Formula", value: info.molecular_formula ?? "—" },
    { label: "Molecular Weight", value: info.molecular_weight != null ? `${info.molecular_weight} g/mol` : "—" },
    { label: "Atoms", value: info.num_atoms != null ? String(info.num_atoms) : "—" },
    { label: "Bonds", value: info.num_bonds != null ? String(info.num_bonds) : "—" },
  ];

  return (
    <div style={{ ...panelStyle, ...style }}>
      <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14, color: "#38bdf8" }}>
        Molecular Info
      </div>
      {rows.map(({ label, value }) => (
        <div key={label} style={rowStyle}>
          <span style={labelStyle}>{label}</span>
          <span style={valueStyle}>{value}</span>
        </div>
      ))}
    </div>
  );
}
