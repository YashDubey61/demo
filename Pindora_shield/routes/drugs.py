import asyncio
from fastapi import APIRouter, HTTPException
from models.schemas import (
    TextInput,
    TextResponse,
    Generate3DInput,
    Generate3DResponse,
    Generate3DMoleculeInput,
    Generate3DMoleculeResponse,
)
from pindora import Pindora
from utils.generate_3d import Molecule3DGenerator, get_molecule_metadata
import json

router = APIRouter(
    prefix="/api",
    tags=["pindora"],
    responses={404: {"description": "Not found"}},
)

def _run_drug_discovery(text: str):
    with open("data/status.json", "w") as f:
        json.dump({"status": "Molecules Generation in Progress"}, f)

    pindora_instance = Pindora()
    mol_gen = pindora_instance.drug_discovery_pipeline(text)

    with open("data/status.json", "w") as f:
        json.dump({"status": "Molecules Generation Completed"}, f)

    return mol_gen

@router.post("/drug_discovery", response_model=TextResponse)
async def process_text(request: TextInput):
    if not request.text or len(request.text.strip()) == 0:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    print("Received text:", request.text)

    try:
        mol_gen = await asyncio.to_thread(_run_drug_discovery, request.text)
    except Exception as e:
        with open("data/status.json", "w") as f:
            json.dump({"status": "Molecules are not Generating"}, f)
        raise HTTPException(status_code=500, detail=str(e))

    return {
        "input_text": request.text,
        "results": mol_gen,
        "status": "success",
        "message": f"Drug discovery pipeline completed. Found {len(mol_gen)} molecules."
    }

@router.post("/generate-3d", response_model=Generate3DResponse)
async def generate_3d_endpoint(request: Generate3DInput):
    if not request.input_smile or len(request.input_smile.strip()) == 0:
        raise HTTPException(status_code=400, detail="SMILES string is required")

    try:
        generator = Molecule3DGenerator()
        path = generator._generate_3d(request.input_smile)
        return {
            "message": "3D model generated successfully",
            "file_path": path,
            "status": "success",
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/generate-3d-molecule", response_model=Generate3DMoleculeResponse)
async def generate_3d_molecule_endpoint(request: Generate3DMoleculeInput):
    """Generate 3D coordinates from SMILES and return SDF for frontend visualization."""
    if not request.smiles or len(request.smiles.strip()) == 0:
        raise HTTPException(status_code=400, detail="SMILES string is required")

    try:
        generator = Molecule3DGenerator()
        mol, sdf = generator.generate_3d_from_smiles(request.smiles.strip())
        metadata = get_molecule_metadata(mol)
        return {
            "smiles": request.smiles,
            "sdf": sdf,
            "status": "success",
            "message": "3D molecule generated successfully",
            "molecular_formula": metadata["molecular_formula"],
            "molecular_weight": metadata["molecular_weight"],
            "num_atoms": metadata["num_atoms"],
            "num_bonds": metadata["num_bonds"],
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/get_discovery_results")
async def get_discovery_results():

    with open("data/status.json", "r") as f:
        status = json.load(f)
    if status.get("status") == "Molecules are not Generating" or status.get("status") == "Molecules Generation in Progress":
        return {
            "status": "failed",
            "results": [status.get("status")],
        }
    elif status.get("status") == "Molecules Generation Completed":
        status["status"] = "Molecules are not Generating"
        with open("data/status.json", "w") as f:
            json.dump(status, f)
    with open("data/generated_molecules_new.json", "r") as f:
        results = json.load(f)

    return {
        "status": "success",
        "results": results
    }
