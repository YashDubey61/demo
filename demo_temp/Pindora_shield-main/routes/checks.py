from fastapi import APIRouter
import json

router = APIRouter(
    prefix="/checks",
    tags=["pindora_check"],
    responses={404: {"description": "Not found"}},
)

@router.post("/status_checks")
async def process_text():
    default_status = {"status": "No status set"}

    try:
        with open("data/status.json", "r", encoding="utf-8") as f:
            try:
                status = json.load(f)
            except json.JSONDecodeError:
                status = default_status
                with open("data/status.json", "w", encoding="utf-8") as wf:
                    json.dump(status, wf)
    except FileNotFoundError:
        status = default_status
        with open("data/status.json", "w", encoding="utf-8") as wf:
            json.dump(status, wf)
    status_show=status.get("status")
    # if status.get("status") == "Molecules Generation Completed":
    #     status["status"] = "Molecules are not Generating"
    #     with open("data/status.json", "w", encoding="utf-8") as f:
    #         json.dump(status, f)

    return {
        "status": "success",
        "message": status_show
    }
