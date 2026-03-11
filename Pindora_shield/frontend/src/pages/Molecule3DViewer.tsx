/**
 * Interactive 3D molecule viewer using 3Dmol.js.
 * Renders SDF/MOL content with ball-and-stick, rotation, zoom, pan, atom highlighting.
 */
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    $3Dmol: {
      createViewer: (element: HTMLElement, config?: Record<string, unknown>) => {
        addModel: (data: string, format: string) => unknown;
        setStyle: (filter: Record<string, unknown>, style: Record<string, unknown>) => unknown;
        zoomTo: () => void;
        render: () => void;
        setBackgroundColor: (color: string) => void;
        setHoverDuration?: (ms: number) => void;
        setHoverable?: (
          sel: Record<string, unknown>,
          flag: boolean,
          onHover: (atom: { serial?: number }) => void,
          onUnhover: (atom: { serial?: number }) => void
        ) => void;
      };
    };
  }
}

interface Molecule3DViewerProps {
  sdf: string | null;
  width?: string;
  height?: string;
  backgroundColor?: string;
  onError?: (message: string) => void;
}

export default function Molecule3DViewer({
  sdf,
  width = "100%",
  height = "400px",
  backgroundColor = "#0f172a",
  onError,
}: Molecule3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sdf || !containerRef.current) return;

    if (!window.$3Dmol) {
      onError?.("3Dmol.js not loaded. Please refresh the page.");
      return;
    }

    containerRef.current.innerHTML = "";
    const viewer = window.$3Dmol.createViewer(containerRef.current, {
      backgroundColor,
    });
    viewer.addModel(sdf, "sdf");
    viewer.setStyle(
      {},
      { stick: { radius: 0.2 }, sphere: { scale: 0.25 } }
    );
    viewer.setBackgroundColor(backgroundColor);
    if (viewer.setHoverDuration) viewer.setHoverDuration(150);
    if (viewer.setHoverable) {
      viewer.setHoverable(
        {},
        true,
        (atom) => {
          if (atom?.serial != null) {
            viewer.setStyle({ serial: atom.serial }, { stick: { radius: 0.35 }, sphere: { scale: 0.35 } });
          }
          viewer.render();
        },
        (atom) => {
          if (atom?.serial != null) {
            viewer.setStyle({ serial: atom.serial }, { stick: { radius: 0.2 }, sphere: { scale: 0.25 } });
          }
          viewer.render();
        }
      );
    }
    viewer.zoomTo();
    viewer.render();

    return () => {
      containerRef.current && (containerRef.current.innerHTML = "");
    };
  }, [sdf, backgroundColor, onError]);

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
      ref={containerRef}
      style={{
        width,
        height,
        background: backgroundColor,
        borderRadius: 12,
        overflow: "hidden",
      }}
    />
  );
}
