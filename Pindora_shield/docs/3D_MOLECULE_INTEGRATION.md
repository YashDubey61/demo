# 3D Molecule Generation - Integration Guide

## Overview

This feature generates 3D molecular structures from SMILES strings using RDKit (ETKDG + MMFF/UFF) and displays them in an interactive 3Dmol.js viewer.

## Enhanced Visualization Features

- **Atom color legend**: CPK/Jmol colors with legend panel
- **Molecule title**: Dynamic title with drug name
- **Atom labels**: Toggle C1, O2, N3 etc.
- **Molecular info panel**: Formula, weight, atoms, bonds
- **Style controls**: Ball-and-stick, Stick, Sphere, Surface
- **Functional group highlighting**: O, N, S highlighting toggle
- **Hover tooltips**: Atom type, atomic number, coordinates
- **Export**: Save as PNG
- **Lighting**: Outline style, orthographic projection

---

## 1. Backend (RDKit)

### Location
- `utils/generate_3d.py` - `Molecule3DGenerator` class
- `routes/drugs.py` - API endpoints
- `models/schemas.py` - Request/response models

### Usage

```python
from utils.generate_3d import Molecule3DGenerator

generator = Molecule3DGenerator()
sdf_string = generator.generate_sdf_string("CCO")  # Ethanol
```

### Pipeline
1. SMILES → RDKit mol via `Chem.MolFromSmiles()`
2. Add hydrogens: `Chem.AddHs()`
3. 3D embedding: `AllChem.EmbedMolecule(mol, AllChem.ETKDG())` (ETKDGv2 fallback)
4. Geometry optimization: MMFF preferred, UFF fallback
5. Output: MOL block string via `Chem.MolToMolBlock()`

---

## 2. API Endpoint

### `POST /api/generate-3d-molecule`

**Input:**
```json
{ "smiles": "CCO" }
```

**Output:**
```json
{
  "smiles": "CCO",
  "sdf": "... MOL block content ...",
  "status": "success",
  "message": "3D molecule generated successfully"
}
```

**Errors:**
- `400`: Invalid or empty SMILES
- `500`: Embedding failed or server error

---

## 3. Frontend Components

### Molecule3DViewer
Renders SDF in 3D with ball-and-stick, rotation, zoom, pan, and atom highlighting on hover.

```tsx
import Molecule3DViewer from "./pages/Molecule3DViewer";

<Molecule3DViewer
  sdf={sdfString}
  height="400px"
  width="100%"
  backgroundColor="#0f172a"
  onError={(msg) => console.error(msg)}
/>
```

### Molecule3DModal
Fetches 3D molecule from API and displays in a modal.

```tsx
import Molecule3DModal from "./pages/Molecule3DModal";

{show3D && (
  <Molecule3DModal
    smiles="CCO"
    onClose={() => setShow3D(false)}
  />
)}
```

### Adding to Any Page

1. Load 3Dmol.js in `index.html`:
```html
<script src="https://cdn.jsdelivr.net/npm/3dmol@2.5.4/build/3Dmol-min.js"></script>
```

2. Add a button that opens the modal:
```tsx
<button onClick={() => setView3DSmile(mol.smiles)}>View 3D Molecule</button>
{view3DSmile && (
  <Molecule3DModal smiles={view3DSmile} onClose={() => setView3DSmile(null)} />
)}
```

3. The modal calls `getApiUrl("/api/generate-3d-molecule")` - ensure your Vite proxy or backend URL is correct.

---

## 4. Dependencies

- **Backend:** `rdkit` (in requirements.txt)
- **Frontend:** 3Dmol.js loaded via CDN (no npm package needed)

---

## 5. ResultPage Integration

The "View 3D Molecule" button is added next to the Report button in `ResultPage.tsx`. It uses the SMILES from the currently displayed molecule (`mol.smiles`).
