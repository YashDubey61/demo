import requests
import json
import pandas as pd
from typing import List, Dict, Any, Optional
import time
from utils.copilot import AzureOpenAIChatClient

OPEN_TARGETS_URL = "https://api.platform.opentargets.org/api/v4/graphql"
CHEMBL_URL = "https://www.ebi.ac.uk/chembl/api/data"

def query_open_targets(query: str, variables: Dict[str, Any] = None, max_retries: int = 3) -> Dict[str, Any]:
    payload = {"query": query}
    if variables:
        payload["variables"] = variables
    for attempt in range(max_retries):
        try:
            response = requests.post(OPEN_TARGETS_URL, json=payload, timeout=30)
            response.raise_for_status()
            data = response.json()
            return data
            
        except requests.exceptions.HTTPError as e:
            if response.status_code in [502, 503, 504] and attempt < max_retries - 1:
                wait_time = 2 ** attempt
                time.sleep(wait_time)
                continue
            else:
                raise
        except requests.exceptions.RequestException as e:
            if attempt < max_retries - 1:
                wait_time = 2 ** attempt
                time.sleep(wait_time)
                continue
            else:
                raise
    

def query_chembl(endpoint: str, params: Dict[str, Any] = None) -> Dict[str, Any]:
    if endpoint.endswith(".json"):
        url = f"{CHEMBL_URL}/{endpoint}"
    elif "/" in endpoint and "molecule/" in endpoint:
        url = f"{CHEMBL_URL}/{endpoint}.json"
    else:
        url = f"{CHEMBL_URL}/{endpoint}.json"
    response = requests.get(url, params=params)
    response.raise_for_status()
    return response.json()


class FetchData():
    def __init__(self):
        pass
    # ============================
    # Step 1: Disease → EFO ID
    # ============================

    def map_disease_to_efo(self,disease_name: str) -> List[str]:

        query = """
            query MapIds($terms: [String!]!, $entityNames: [String!]) {
                mapIds(queryTerms: $terms, entityNames: $entityNames) {
                    mappings {
                        term
                        hits {
                            id
                            entity
                        }
                    }
                }
            }
        """
        
        variables = {
            "terms": [disease_name],
            "entityNames": ["disease"]
        }
        
        data = query_open_targets(query, variables)
        efo_ids = []
        
        for mapping in data["data"]["mapIds"]["mappings"]:
            for hit in mapping["hits"]:
                if hit["entity"] == "disease":
                    efo_ids.append(hit["id"])
        
        return efo_ids

    def get_associated_targets(self,efo_id: str, max_targets: int = 50) -> List[Dict[str, Any]]:
        query = """
            query AssociatedTargets($efoId: String!, $pageIndex: Int!, $pageSize: Int!) {
                disease(efoId: $efoId) {
                    associatedTargets(page: { index: $pageIndex, size: $pageSize }) {
                        count
                        rows {
                            score
                            target {
                                id
                                approvedSymbol
                            }
                        }
                    }
                }
            }
        """
        
        targets = []
        page_index = 0
        page_size = 50

        while len(targets) < max_targets:
            variables = {
                "efoId": efo_id,
                "pageIndex": page_index,
                "pageSize": page_size
            }
            
            data = query_open_targets(query, variables)
            rows = data["data"]["disease"]["associatedTargets"]["rows"]
            
            if not rows:
                break
            for row in rows:
                targets.append({
                    "target_id": row["target"]["id"],
                    "approved_symbol": row["target"]["approvedSymbol"],
                    "association_score": row["score"]
                })
            
            page_index += 1
            
            if len(rows) < page_size:
                break
        return targets[:max_targets]

    # ============================
    # Step 3: Target → Known Drugs
    # ============================

    def get_known_drugs_for_target(self, target_id: str, max_drugs: int = 50) -> List[Dict[str, Any]]:

        query = """
            query KnownDrugs($targetId: String!, $size: Int!, $cursor: String) {
                target(ensemblId: $targetId) {
                    knownDrugs(size: $size, cursor: $cursor) {
                        count
                        cursor
                        rows {
                            drugId
                            prefName
                            phase
                        }
                    }
                }
            }
        """

        drugs = []
        cursor = None
        size = 50

        while len(drugs) < max_drugs:
            variables = {
                "targetId": target_id,
                "size": size,
                "cursor": cursor
            }

            data = query_open_targets(query, variables)
            known_drugs = data["data"]["target"]["knownDrugs"]

            for row in known_drugs["rows"]:
                drugs.append({
                    "drug_id": row["drugId"],
                    "pref_name": row["prefName"],
                    "phase": row["phase"]
                })
            cursor = known_drugs.get("cursor")
            if not cursor:
                break
        return drugs[:max_drugs]

    # ============================
    # Step 4: Drug → IC50 Data (ChEMBL)
    # ============================

    def get_ic50_data_for_molecule(self, molecule_chembl_id: str, limit: int = 1000) -> List[Dict[str, Any]]:
        params = {
            "molecule_chembl_id": molecule_chembl_id,
            "standard_type__exact": "IC50",
            "limit": limit,
            "offset": 0
        }
        
        data = query_chembl("activity", params)

        ic50_records = []
        
        for activity in data.get("activities", []):
            if activity.get("standard_value") is None:
                continue
            
            ic50_records.append({
                "molecule_chembl_id": molecule_chembl_id,
                "standard_value": activity["standard_value"],
                "standard_units": activity.get("standard_units", "nM"),
                "target_chembl_id": activity.get("target_chembl_id"),
                "target_pref_name": activity.get("target_pref_name"),
                "assay_chembl_id": activity.get("assay_chembl_id"),
                "pchembl_value": activity.get("pchembl_value"),
                "document_chembl_id": activity.get("document_chembl_id")
            })
        
        return ic50_records

    # ============================
    # Step 5: Drug → Molecular Features (ChEMBL)
    # ============================

    def get_molecule_properties(self, molecule_chembl_id: str) -> Dict[str, Any]:
        try:
            data = query_chembl(f"molecule/{molecule_chembl_id}")
        except Exception as e:
            print(f"Error fetching molecule {molecule_chembl_id}: {e}")
            return None
            
        if not data:
            return None
            
        # with open(f"{molecule_chembl_id}_raw.json", "w", encoding="utf-8") as f:
        #     json.dump(data, f, indent=2)
        
        props = data.get("molecule_properties", {})
        structs = data.get("molecule_structures", {})
        
        if props is None:
            props = {}
        if structs is None:
            structs = {}

        return {
            "chembl_id": data.get("molecule_chembl_id"),
            "max_phase": data.get("max_phase"),
            "molecular_formula": props.get("full_molformula"),
            "molecular_weight": props.get("full_mwt"),
            "alogp": props.get("alogp"),
            "aromatic_rings": props.get("aromatic_rings"),
            "mw_freebase" : props.get("mw_freebase"),
            "hba": props.get("hba"),
            "hbd": props.get("hbd"),
            "heavy_atoms": props.get("heavy_atoms"),
            "np_likeness_score": props.get("np_likeness_score"),
            "num_ro5_violations": props.get("num_ro5_violations"),
            "psa": props.get("psa"),
            "qed_weighted": props.get("qed_weighted"),
            "ro3_pass": props.get("ro3_pass"),
            "rtb": props.get("rtb"),
            "smiles": structs.get("canonical_smiles"),
            "inchi": structs.get("standard_inchi"),
            "inchi_key": structs.get("standard_inchi_key"),
            "molfile_preview": structs.get("molfile", "") if structs.get("molfile") else None
        }