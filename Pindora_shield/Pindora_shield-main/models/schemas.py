from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class TextInput(BaseModel):
    text: str
    
class TextResponse(BaseModel):
    input_text: str
    results: Optional[List[Dict[str, Any]]] = None
    status: str
    message: Optional[str] = None

class Generate3DInput(BaseModel):
    input_smile: str

class Generate3DResponse(BaseModel):
    message: str
    file_path: str
    status: str