"""Generate 3D molecular coordinates from SMILES using RDKit (ETKDG + MMFF/UFF)."""
import uuid
import os
from typing import Any
from rdkit import Chem
from rdkit.Chem import AllChem, Descriptors


def get_molecule_metadata(mol: "Chem.Mol") -> dict[str, Any]:
    """
    Extract molecule metadata using RDKit.
    Returns: drug_name (caller provides), smiles, formula, mol_weight, num_atoms, num_bonds.
    """
    return {
        "molecular_formula": Chem.rdMolDescriptors.CalcMolFormula(mol),
        "molecular_weight": round(Descriptors.ExactMolWt(mol), 2),
        "num_atoms": mol.GetNumAtoms(),
        "num_bonds": mol.GetNumBonds(),
    }


class Molecule3DGenerator:
    def __init__(self):
        self.output_dir = "3d_models"
        os.makedirs(self.output_dir, exist_ok=True)

    def generate_3d_from_smiles(self, smiles: str) -> tuple["Chem.Mol", str]:
        """
        Convert SMILES to RDKit mol, add H, embed with ETKDG, optimize with MMFF or UFF.
        Returns (mol, sdf_string) for frontend use.
        """
        mol = Chem.MolFromSmiles(smiles)
        if mol is None:
            raise ValueError("Invalid SMILES string")

        mol = Chem.AddHs(mol)

        status = AllChem.EmbedMolecule(mol, AllChem.ETKDG())
        if status != 0:
            try:
                status = AllChem.EmbedMolecule(mol, AllChem.ETKDGv2())
            except Exception:
                pass
        if status != 0:
            raise RuntimeError("3D embedding failed")

        # Prefer MMFF, fall back to UFF
        mmff_ok = AllChem.MMFFOptimizeMolecule(mol) == 0
        if not mmff_ok:
            AllChem.UFFOptimizeMolecule(mol)

        sdf_string = Chem.MolToMolBlock(mol)
        return mol, sdf_string

    def generate_sdf_string(self, smiles: str) -> str:
        """Return SDF (MOL block) string for frontend visualization."""
        _, sdf_string = self.generate_3d_from_smiles(smiles)
        return sdf_string

    def _generate_3d(self, smiles: str) -> str:
        """Legacy: write SDF to disk and return file path."""
        mol, sdf_string = self.generate_3d_from_smiles(smiles)
        filename = f"molecule_{uuid.uuid4().hex[:8]}.sdf"
        output_path = os.path.join(self.output_dir, filename)
        with open(output_path, "w") as f:
            f.write(sdf_string)
        return output_path
