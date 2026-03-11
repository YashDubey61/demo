/**
 * Interactive 3D molecule viewer using 3Dmol.js.
 * Enhanced with CPK colors, atom labels, style controls, hover tooltips,
 * functional group highlighting, and export.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import AtomColorLegend from "../components/AtomColorLegend";

declare global {
  interface Window {
    $3Dmol: {
      createViewer: (element: HTMLElement, config?: Record<string, unknown>) => GLViewer;
      SurfaceType: { VDW: string; SAS: string };
    };
  }
}

interface GLViewer {
  addModel: (data: string, format: string) => unknown;
  setStyle: (filter: Record<string, unknown>, style: Record<string, unknown>) => unknown;
  addStyle: (filter: Record<string, unknown>, style: Record<string, unknown>) => unknown;
  zoomTo: () => void;
  render: () => void;
  setBackgroundColor: (color: string) => void;
  setHoverDuration?: (ms: number) => void;
  setHoverable?: (
    sel: Record<string, unknown>,
    flag: boolean,
    onHover: (atom: AtomData, viewer: GLViewer, ev: unknown, container: unknown) => void,
    onUnhover: (atom: AtomData) => void
  ) => void;
  addLabel: (text: string, options: LabelOptions, sel?: unknown, noshow?: boolean) => { hide: () => void; show: () => void };
  removeLabel: (label: { hide: () => void }) => void;
  removeAllLabels: () => void;
  addSurface?: (type: string, style: Record<string, unknown>, sel?: Record<string, unknown>) => Promise<unknown>;
  removeAllSurfaces?: () => void;
  setSurfaceMaterialStyle?: (surfId: number, style: Record<string, unknown>) => void;
  getModel: () => { selectedAtoms: (sel?: Record<string, unknown>) => AtomData[] };
  setViewStyle?: (style: { style?: string }) => void;
  setProjection?: (proj: string) => void;
  resize?: () => void;
  center?: () => void;
  png?: () => string;
  writePNG?: () => string;
}

interface AtomData {
  serial?: number;
  elem?: string;
  atom?: string;
  x?: number;
  y?: number;
  z?: number;
  index?: number;
  label?: { hide: () => void; show: () => void };
}

interface LabelOptions {
  position?: { x: number; y: number; z: number } | AtomData;
  fontColor?: string;
  backgroundColor?: string;
  backgroundOpacity?: number;
  font?: string;
  fontSize?: number;
  inFront?: boolean;
}

export type VizStyle = "ballstick" | "stick" | "sphere" | "surface";

interface Molecule3DViewerProps {
  sdf: string | null;
  drugName?: string;
  width?: string;
  height?: string;
  backgroundColor?: string;
  onError?: (message: string) => void;
  showLegend?: boolean;
  showStyleControls?: boolean;
  showExportButton?: boolean;
}

const STYLE_CONFIG: Record<
  VizStyle,
  Record<string, { stick?: Record<string, unknown>; sphere?: Record<string, unknown> }>
> = {
  ballstick: {
    stick: { radius: 0.22, colorscheme: "Jmol" },
    sphere: { scale: 0.26, colorscheme: "Jmol" },
  },
  stick: {
    stick: { radius: 0.25, colorscheme: "Jmol" },
  },
  sphere: {
    sphere: { scale: 0.35, colorscheme: "Jmol" },
  },
  surface: {
    stick: { radius: 0.15, colorscheme: "Jmol" },
  },
};

// SMARTS for functional groups - applied via elem selection fallback (3Dmol may not support SMARTS)
const FG_HIGHLIGHTS: { name: string; elem: string; color: string }[] = [
  { name: "Hydroxyl/Oxygen", elem: "O", color: "#ff6b6b" },
  { name: "Amine/Nitrogen", elem: "N", color: "#4dabf7" },
  { name: "Sulfur", elem: "S", color: "#ffd43b" },
];

export default function Molecule3DViewer({
  sdf,
  drugName,
  width = "100%",
  height = "400px",
  backgroundColor = "#0f172a",
  onError,
  showLegend = true,
  showStyleControls = true,
  showExportButton = true,
}: Molecule3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<GLViewer | null>(null);
  const [vizStyle, setVizStyle] = useState<VizStyle>("ballstick");
  const [showLabels, setShowLabels] = useState(false);
  const [highlightFG, setHighlightFG] = useState(false);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);

  const applyStyle = useCallback(
    (viewer: GLViewer) => {
      viewer.removeAllLabels?.();

      if (vizStyle !== "surface") {
        viewer.removeAllSurfaces?.();
      }

      const styleSpec = STYLE_CONFIG[vizStyle];
      viewer.setStyle({}, styleSpec as Record<string, unknown>);

      if (vizStyle === "surface") {
        viewer.addSurface?.(
          (window.$3Dmol?.SurfaceType?.VDW as string) || "VDW",
          { opacity: 0.65 },
          {}
        )?.then?.((surf: unknown) => {
          if (surf && typeof surf === "object" && "surfid" in surf) {
            viewer.setSurfaceMaterialStyle?.((surf as { surfid: number }).surfid, {
              opacity: 0.6,
            });
          }
          viewer.render();
        });
      }

      if (highlightFG) {
        FG_HIGHLIGHTS.forEach(({ elem, color }) => {
          viewer.addStyle?.({ elem }, { stick: { radius: 0.3, color }, sphere: { scale: 0.35, color } } as Record<string, unknown>);
        });
      }

      if (showLabels && viewer.getModel) {
        const atoms = viewer.getModel().selectedAtoms?.({}) || [];
        atoms.forEach((atom: AtomData) => {
          const label = `${atom.elem || atom.atom || "?"}${atom.serial ?? atom.index ?? ""}`;
          viewer.addLabel?.(label, {
            position: atom,
            fontColor: "#ffffff",
            backgroundColor: "#1e293b",
            backgroundOpacity: 0.9,
            fontSize: 12,
            inFront: true,
          } as LabelOptions, undefined, false);
        });
      }

      viewer.render();
    },
    [vizStyle, showLabels, highlightFG]
  );

  useEffect(() => {
    if (!sdf || !containerRef.current) return;

    if (!window.$3Dmol) {
      onError?.("3Dmol.js not loaded. Please refresh the page.");
      return;
    }

    containerRef.current.innerHTML = "";
    const viewer = window.$3Dmol.createViewer(containerRef.current, {
      backgroundColor,
      defaultDisplay: false,
    });
    viewerRef.current = viewer;

    viewer.addModel(sdf, "sdf");
    viewer.setBackgroundColor(backgroundColor);

    if (viewer.setViewStyle) viewer.setViewStyle({ style: "outline" });
    if (viewer.setProjection) viewer.setProjection("orthographic");

    if (viewer.setHoverDuration) viewer.setHoverDuration(150);
    if (viewer.setHoverable) {
      viewer.setHoverable(
        {},
        true,
        (atom: AtomData, v: GLViewer) => {
          v.setStyle({ serial: atom.serial }, { stick: { radius: 0.35 }, sphere: { scale: 0.35 } } as Record<string, unknown>);
          const AN: Record<string, number> = { H: 1, C: 6, N: 7, O: 8, S: 16, P: 15, F: 9, Cl: 17, Br: 35, I: 53 };
          const elem = atom.elem || atom.atom || "?";
          const anum = AN[elem] ?? "?";
          const coords = `(${(atom.x ?? 0).toFixed(2)}, ${(atom.y ?? 0).toFixed(2)}, ${(atom.z ?? 0).toFixed(2)})`;
          const text = `${elem} | Z: ${anum} | ${coords}`;
          setTooltip({ x: 0, y: 0, text });
        },
        (atom: AtomData) => {
          applyStyle(viewer);
          setTooltip(null);
        }
      );
    }

    applyStyle(viewer);
    viewer.zoomTo();
    viewer.render();

    return () => {
      containerRef.current && (containerRef.current.innerHTML = "");
      viewerRef.current = null;
    };
  }, [sdf, backgroundColor, onError]);

  useEffect(() => {
    if (viewerRef.current && sdf) {
      applyStyle(viewerRef.current);
    }
  }, [applyStyle, vizStyle, showLabels, highlightFG]);

  // Resize viewer when container size changes (e.g. when panels collapse)
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !viewerRef.current) return;

    const handleResize = () => {
      if (viewerRef.current) {
        viewerRef.current.resize?.();
        viewerRef.current.render?.();
      }
    };

    const observer = new ResizeObserver(handleResize);
    observer.observe(el);
    window.addEventListener("resize", handleResize);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [sdf]);

  const handleExport = () => {
    const viewer = viewerRef.current;
    if (!viewer || !containerRef.current) return;

    let dataUrl: string | null = null;
    if (typeof viewer.png === "function") {
      dataUrl = viewer.png();
    } else if (typeof viewer.writePNG === "function") {
      dataUrl = viewer.writePNG();
    } else {
      const canvas = containerRef.current.querySelector("canvas");
      if (canvas) {
        try {
          dataUrl = canvas.toDataURL("image/png");
        } catch {
          onError?.("Export failed. Try a different browser.");
          return;
        }
      }
    }

    if (dataUrl) {
      const link = document.createElement("a");
      link.download = `molecule_${drugName?.replace(/\s+/g, "_") || "view"}.png`;
      link.href = dataUrl;
      link.click();
    } else {
      onError?.("Could not export image.");
    }
  };

  if (!sdf) {
    return (
      <div
        style={{
          width,
          height,
          background: backgroundColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          borderRadius: 12,
        }}
      >
        No molecule data
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      style={{
        position: "relative",
        width,
        height,
        background: backgroundColor,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

      {showLegend && <AtomColorLegend />}

      {showStyleControls && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            display: "flex",
            flexDirection: "column",
            gap: 6,
            background: "rgba(15, 23, 42, 0.9)",
            border: "1px solid rgba(148, 163, 184, 0.25)",
            borderRadius: 10,
            padding: 8,
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: "#94a3b8", marginBottom: 2 }}>
            Style
          </div>
          {(["ballstick", "stick", "sphere", "surface"] as VizStyle[]).map((s) => (
            <button
              key={s}
              onClick={() => setVizStyle(s)}
              style={{
                padding: "4px 10px",
                fontSize: 11,
                border: vizStyle === s ? "1px solid #38bdf8" : "1px solid transparent",
                borderRadius: 6,
                background: vizStyle === s ? "rgba(56,189,248,0.2)" : "transparent",
                color: "#e2e8f0",
                cursor: "pointer",
              }}
            >
              {s === "ballstick" ? "Ball & Stick" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
          <button
            onClick={() => setShowLabels((v) => !v)}
            style={{
              padding: "4px 10px",
              fontSize: 11,
              border: showLabels ? "1px solid #38bdf8" : "1px solid transparent",
              borderRadius: 6,
              background: showLabels ? "rgba(56,189,248,0.2)" : "transparent",
              color: "#e2e8f0",
              cursor: "pointer",
              marginTop: 4,
            }}
          >
            {showLabels ? "Hide" : "Show"} Labels
          </button>
          <button
            onClick={() => setHighlightFG((v) => !v)}
            style={{
              padding: "4px 10px",
              fontSize: 11,
              border: highlightFG ? "1px solid #38bdf8" : "1px solid transparent",
              borderRadius: 6,
              background: highlightFG ? "rgba(56,189,248,0.2)" : "transparent",
              color: "#e2e8f0",
              cursor: "pointer",
            }}
          >
            {highlightFG ? "Hide" : "Highlight"} FG
          </button>
          {showExportButton && (
            <button
              onClick={handleExport}
              style={{
                padding: "4px 10px",
                fontSize: 11,
                border: "1px solid rgba(56,189,248,0.5)",
                borderRadius: 6,
                background: "rgba(56,189,248,0.15)",
                color: "#38bdf8",
                cursor: "pointer",
                marginTop: 4,
              }}
            >
              Export PNG
            </button>
          )}
        </div>
      )}

      {tooltip && (
        <div
          style={{
            position: "absolute",
            bottom: 50,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(15, 23, 42, 0.95)",
            border: "1px solid rgba(148, 163, 184, 0.3)",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12,
            color: "#e2e8f0",
            fontFamily: "monospace",
            whiteSpace: "nowrap",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
