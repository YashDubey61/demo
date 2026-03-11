import os
import json
import math
from groq import Groq
from dotenv import load_dotenv

load_dotenv()


class AzureOpenAIChatClient:
    """
    Drop-in replacement for the Azure OpenAI client, now powered by Groq.

    Groq details:
      - Base URL  : https://api.groq.com/openai/v1  (set internally by the SDK)
      - Model     : llama-3.3-70b-versatile  (change via GROQ_MODEL env var)
      - API key   : GROQ_API_KEY env var
    """

    def __init__(
        self,
        api_key: str = None,
        model: str = None,
        # Legacy Azure params kept for signature compatibility — ignored
        azure_endpoint: str = None,
        deployment_name: str = None,
        api_version: str = None,
    ):
        self.api_key = api_key or os.environ.get("GROQ_API_KEY")
        # Allow overriding model via env var; fall back to a capable default
        self.model = model or os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

        self.client = Groq(api_key=self.api_key)

    # ------------------------------------------------------------------
    # Helper: single-call wrapper
    # ------------------------------------------------------------------
    def _chat(self, messages: list, max_tokens: int = 2000, temperature: float = 0.1) -> str:
        completion = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
        )
        return completion.choices[0].message.content

    # ------------------------------------------------------------------
    # 1. Disease name resolver
    # ------------------------------------------------------------------
    def generate_disease_name_from_prompt(self, user_text: str) -> str:
        system_prompt = {
            "role": "system",
            "content": (
                "You are a Disease Name Resolver for biomedical APIs.\n\n"
                "Your task:\n"
                "- You will receive user input that may contain symptoms, one disease name, "
                "multiple disease names, or a combination.\n"
                "- Based on the input, identify the most accurate and standardized disease name(s) "
                "compatible with api.platform.opentargets.org (EFO-compatible).\n\n"
                "Rules you MUST follow:\n"
                "1. Always return disease names that resolve correctly on api.platform.opentargets.org.\n"
                "2. Use standardized clinical disease names aligned with EFO / Open Targets ontology.\n"
                "3. Infer diseases from symptoms only when explicit disease names are not provided.\n"
                "4. Return multiple diseases only when the input clearly indicates more than one condition.\n"
                "5. Do NOT include explanations, reasoning, comments, or extra text.\n"
                "6. Output MUST be valid JSON only.\n"
                '7. The JSON key must be exactly "disease".\n'
                "8. The value must be an array of one or more disease name strings.\n"
                "9. Do NOT include duplicates, abbreviations, or non-disease terms.\n"
                "10. Use lowercase disease names unless capitalization is required by convention.\n\n"
                "Strict output format:\n"
                '{"disease":["<disease name 1>","<disease name 2>"]}\n\n'
                "VALID EXAMPLES (ONLY RETURN THE JSON, NO EXTRA TEXT):\n"
                '{"disease":["breast cancer"]}\n'
                '{"disease":["type 2 diabetes mellitus"]}\n'
                '{"disease":["hypertension"]}\n'
                '{"disease":["breast cancer","lung cancer"]}\n'
                '{"disease":["type 2 diabetes mellitus","hypertension"]}\n\n'
                "If the input is ambiguous, return the most likely disease name(s) "
                "that follow Open Targets Platform naming conventions."
            ),
        }
        messages = [system_prompt, {"role": "user", "content": user_text}]
        return self._chat(messages, max_tokens=2000, temperature=0.1)

    # ------------------------------------------------------------------
    # 2. Compound report generator
    # ------------------------------------------------------------------
    def generate_report_from_smiles_ic50_value_association_score_target_symbol_max_phase(
        self,
        smiles: str,
        ic50_value: float,
        association_score: float,
        target_symbol: str,
        max_phase: int,
        user_prompt: str = "",
    ) -> str:
        """
        Generate a comprehensive medicinal-chemistry report for a compound.
        """

        # ---- Derived IC50 metrics ----
        pIC50 = None
        potency = "unknown"
        try:
            if ic50_value is not None and ic50_value > 0:
                pIC50 = round(9.0 - math.log10(float(ic50_value)), 3)
                ic50_f = float(ic50_value)
                if ic50_f <= 10:
                    potency = "very high potency (<10 nM)"
                elif ic50_f <= 100:
                    potency = "high potency (10–100 nM)"
                elif ic50_f <= 1000:
                    potency = "moderate potency (100–1000 nM)"
                elif ic50_f <= 10000:
                    potency = "low potency (1–10 µM)"
                else:
                    potency = "very low potency / inactive (>10 µM)"
        except Exception:
            pass

        # ---- Association score interpretation ----
        assoc_interp = "unknown"
        try:
            if association_score is not None:
                assoc = float(association_score)
                if 0 <= assoc <= 1:
                    if assoc >= 0.8:
                        assoc_interp = "strong association"
                    elif assoc >= 0.5:
                        assoc_interp = "moderate association"
                    elif assoc >= 0.2:
                        assoc_interp = "weak association"
                    else:
                        assoc_interp = "negligible association"
                else:
                    assoc_interp = "association score out of expected 0–1 range; interpret cautiously"
        except Exception:
            pass

        # ---- RDKit descriptors (optional) ----
        rdkit_data: dict = {}
        try:
            from rdkit import Chem
            from rdkit.Chem import Descriptors, rdMolDescriptors, Crippen

            mol = Chem.MolFromSmiles(smiles)
            if mol is not None:
                mw = Descriptors.MolWt(mol)
                logp = Crippen.MolLogP(mol)
                hbd = rdMolDescriptors.CalcNumHBD(mol)
                hba = rdMolDescriptors.CalcNumHBA(mol)
                tpsa = rdMolDescriptors.CalcTPSA(mol)
                rot_bonds = rdMolDescriptors.CalcNumRotatableBonds(mol)
                heavy_atoms = mol.GetNumHeavyAtoms()
                formula = rdMolDescriptors.CalcMolFormula(mol)
                violations = []
                if mw > 500:
                    violations.append("MW>500")
                if logp > 5:
                    violations.append("logP>5")
                if hbd > 5:
                    violations.append("HBD>5")
                if hba > 10:
                    violations.append("HBA>10")
                rdkit_data = {
                    "molecular_weight": round(mw, 2),
                    "formula": formula,
                    "logP": round(logp, 2),
                    "hbd": int(hbd),
                    "hba": int(hba),
                    "tpsa": round(tpsa, 2),
                    "rotatable_bonds": int(rot_bonds),
                    "heavy_atom_count": int(heavy_atoms),
                    "lipinski_violations_count": len(violations),
                    "lipinski_violations": violations,
                }
            else:
                rdkit_data = {"error": "invalid SMILES or RDKit could not parse SMILES"}
        except Exception as e:
            rdkit_data = {"error": f"RDKit failed: {e}"}

        # ---- Ligand efficiency ----
        ligand_efficiency = None
        try:
            if pIC50 is not None and rdkit_data.get("heavy_atom_count"):
                ha = rdkit_data["heavy_atom_count"]
                if ha > 0:
                    ligand_efficiency = round(pIC50 / ha, 3)
        except Exception:
            pass

        # ---- Build payload ----
        payload = {
            "user_prompt": user_prompt or "",
            "smiles": smiles,
            "ic50_nM": ic50_value,
            "pIC50": pIC50,
            "potency": potency,
            "association_score": association_score,
            "association_interpretation": assoc_interp,
            "target_symbol": target_symbol,
            "max_phase": max_phase,
            "ligand_efficiency": ligand_efficiency,
            "rdkit": rdkit_data,
            "assumptions": [
                "IC50 values are assumed to be in nanomolar (nM) unless specified.",
                "Association score is assumed to be normalized between 0 and 1 unless specified.",
                "Derived descriptors may be omitted if RDKit is unavailable or SMILES is invalid.",
            ],
        }

        system_prompt = {
            "role": "system",
            "content": (
                "You are an expert medicinal chemist and drug discovery scientist. "
                "Given the compound data (SMILES, IC50, association score, target symbol, clinical phase) "
                "and any derived metrics, generate a comprehensive, evidence-based report suitable for a "
                "cross-functional team (med chem, bio, DMPK, clinical). "
                "The report must include the following sections:\n\n"
                "1) Executive summary (2-3 lines): one-sentence conclusion about the compound's promise and primary risk.\n"
                "2) Compound summary: key identifiers and computed descriptors "
                "(molecular weight, formula, logP, HBD/HBA, TPSA, heavy atoms, rotatable bonds), mention if unavailable.\n"
                "3) Bioactivity and potency: interpret IC50 (in nM), pIC50, potency category, "
                "ligand efficiency, and what these imply for target engagement.\n"
                "4) Target & disease context: interpret association score and target symbol to suggest "
                "likely therapeutic areas.\n"
                "5) Clinical development perspective: explain the implication of 'max_phase' "
                "(0: preclinical, 1–4: clinical phases) and recommend next milestones.\n"
                "6) ADME/Tox and developability flags: highlight Lipinski violations or concerning "
                "physicochemical properties.\n"
                "7) Recommended next steps: prioritized experiments and go/no-go criteria.\n"
                "8) Assumptions and confidence: list assumptions and confidence level for each recommendation.\n\n"
                "Be explicit about limitations and do NOT invent experimental measurements. "
                "Present key numbers in a short bullet list at the top. "
                "Keep the language professional, clear, and concise."
            ),
        }

        messages = [
            system_prompt,
            {"role": "user", "content": json.dumps(payload, indent=2)},
        ]
        return self._chat(messages, max_tokens=1500, temperature=0.2)