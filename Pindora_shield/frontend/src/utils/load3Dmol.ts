/**
 * Dynamically load 3Dmol.js only when the user opens the 3D viewer.
 * Avoids loading ~500KB+ on initial page load, making molecule generation faster.
 */
const SCRIPT_URL = "https://cdn.jsdelivr.net/npm/3dmol@2.5.4/build/3Dmol-min.js";

let loadPromise: Promise<void> | null = null;

export function load3Dmol(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  if ((window as unknown as { $3Dmol?: unknown }).$3Dmol) {
    return Promise.resolve();
  }

  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_URL}"]`);
    if (existing) {
      const check = () => {
        if ((window as unknown as { $3Dmol?: unknown }).$3Dmol) resolve();
        else setTimeout(check, 50);
      };
      check();
      return;
    }

    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      // 3Dmol sets $3Dmol on window after load
      const check = () => {
        if ((window as unknown as { $3Dmol?: unknown }).$3Dmol) resolve();
        else setTimeout(check, 50);
      };
      check();
    };
    script.onerror = () => reject(new Error("Failed to load 3Dmol.js"));
    document.head.appendChild(script);
  });

  return loadPromise;
}
