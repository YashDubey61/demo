/**
 * Atom color legend panel for 3D molecule viewer.
 * Explains CPK (Jmol) color coding for common elements.
 */
import React from "react";

const ATOM_COLORS: { element: string; color: string; name: string }[] = [
  { element: "C", color: "#909090", name: "Carbon" },
  { element: "H", color: "#ffffff", name: "Hydrogen" },
  { element: "O", color: "#ff0d0d", name: "Oxygen" },
  { element: "N", color: "#3050f8", name: "Nitrogen" },
  { element: "S", color: "#ffff30", name: "Sulfur" },
  { element: "P", color: "#ff8000", name: "Phosphorus" },
  { element: "F", color: "#90e050", name: "Fluorine" },
  { element: "Cl", color: "#1ff01f", name: "Chlorine" },
  { element: "Br", color: "#a62929", name: "Bromine" },
  { element: "I", color: "#9400d3", name: "Iodine" },
];

const legendStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 12,
  left: 12,
  background: "rgba(15, 23, 42, 0.92)",
  border: "1px solid rgba(148, 163, 184, 0.25)",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 11,
  color: "#e2e8f0",
  fontFamily: "system-ui, sans-serif",
  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
  maxWidth: 140,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 4,
};

const dotStyle = (color: string): React.CSSProperties => ({
  width: 10,
  height: 10,
  borderRadius: "50%",
  backgroundColor: color,
  border: "1px solid rgba(255,255,255,0.3)",
  flexShrink: 0,
});

interface AtomColorLegendProps {
  style?: React.CSSProperties;
  className?: string;
}

export default function AtomColorLegend({ style, className }: AtomColorLegendProps) {
  return (
    <div style={{ ...legendStyle, ...style }} className={className}>
      <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 12, color: "#94a3b8" }}>
        Atom Colors (CPK)
      </div>
      {ATOM_COLORS.map(({ element, color, name }) => (
        <div key={element} style={rowStyle}>
          <div style={dotStyle(color)} title={name} />
          <span>
            <strong>{element}</strong> — {name}
          </span>
        </div>
      ))}
    </div>
  );
}
