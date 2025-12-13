import os
import io
import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import insightface
from insightface.app import FaceAnalysis
import base64
from PIL import Image

app = FastAPI(title="InsightFace Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

face_app = None

class FaceData(BaseModel):
    bbox: List[float]
    embedding: List[float]
    age: Optional[int] = None
    gender: Optional[str] = None
    confidence: float

class DetectionResponse(BaseModel):
    success: bool
    faces: List[FaceData]
    message: str

class VerificationRequest(BaseModel):
    stored_embedding: List[float]
    threshold: float = 0.4

class VerificationResponse(BaseModel):
    success: bool
    match: bool
    distance: float
    confidence: float
    message: str

def initialize_face_app():
    global face_app
    if face_app is None:
        print("Initializing InsightFace models...")
        face_app = FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider'])
        face_app.prepare(ctx_id=-1, det_size=(640, 640))
        print("InsightFace models loaded successfully!")
    return face_app

def decode_image(file_bytes: bytes) -> np.ndarray:
    nparr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("Could not decode image")
    return img

def decode_base64_image(base64_string: str) -> np.ndarray:
    if ',' in base64_string:
        base64_string = base64_string.split(',')[1]
    img_bytes = base64.b64decode(base64_string)
    return decode_image(img_bytes)

def euclidean_distance(emb1: np.ndarray, emb2: np.ndarray) -> float:
    return float(np.linalg.norm(emb1 - emb2))

def cosine_similarity(emb1: np.ndarray, emb2: np.ndarray) -> float:
    return float(np.dot(emb1, emb2) / (np.linalg.norm(emb1) * np.linalg.norm(emb2)))

@app.on_event("startup")
async def startup_event():
    initialize_face_app()

@app.get("/")
async def root():
    return {"status": "ok", "service": "InsightFace Face Detection Service"}

@app.get("/health")
async def health():
    return {"status": "healthy", "models_loaded": face_app is not None}

@app.post("/detect", response_model=DetectionResponse)
async def detect_faces(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        img = decode_image(contents)
        
        faces = face_app.get(img)
        
        face_data_list = []
        for face in faces:
            face_data = FaceData(
                bbox=face.bbox.tolist(),
                embedding=face.embedding.tolist(),
                age=int(face.age) if hasattr(face, 'age') and face.age is not None else None,
                gender="M" if hasattr(face, 'gender') and face.gender == 1 else "F" if hasattr(face, 'gender') and face.gender is not None else None,
                confidence=float(face.det_score)
            )
            face_data_list.append(face_data)
        
        return DetectionResponse(
            success=True,
            faces=face_data_list,
            message=f"Detected {len(faces)} face(s)"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/detect-base64", response_model=DetectionResponse)
async def detect_faces_base64(image: str = Form(...)):
    try:
        img = decode_base64_image(image)
        
        faces = face_app.get(img)
        
        face_data_list = []
        for face in faces:
            face_data = FaceData(
                bbox=face.bbox.tolist(),
                embedding=face.embedding.tolist(),
                age=int(face.age) if hasattr(face, 'age') and face.age is not None else None,
                gender="M" if hasattr(face, 'gender') and face.gender == 1 else "F" if hasattr(face, 'gender') and face.gender is not None else None,
                confidence=float(face.det_score)
            )
            face_data_list.append(face_data)
        
        return DetectionResponse(
            success=True,
            faces=face_data_list,
            message=f"Detected {len(faces)} face(s)"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/verify")
async def verify_face(
    file: UploadFile = File(...),
    stored_embedding: str = Form(...)
):
    try:
        import json
        stored_emb = np.array(json.loads(stored_embedding))
        
        contents = await file.read()
        img = decode_image(contents)
        
        faces = face_app.get(img)
        
        if len(faces) == 0:
            return VerificationResponse(
                success=False,
                match=False,
                distance=1.0,
                confidence=0.0,
                message="No face detected in image"
            )
        
        if len(faces) > 1:
            return VerificationResponse(
                success=False,
                match=False,
                distance=1.0,
                confidence=0.0,
                message="Multiple faces detected. Please ensure only one face is visible"
            )
        
        current_emb = faces[0].embedding
        
        distance = euclidean_distance(current_emb, stored_emb)
        similarity = cosine_similarity(current_emb, stored_emb)
        
        threshold = 1.0
        match = distance < threshold
        confidence = max(0, min(100, (1 - distance / 2) * 100))
        
        return VerificationResponse(
            success=True,
            match=match,
            distance=distance,
            confidence=confidence,
            message="Face verified successfully" if match else "Face does not match"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/verify-base64")
async def verify_face_base64(
    image: str = Form(...),
    stored_embedding: str = Form(...)
):
    try:
        import json
        stored_emb = np.array(json.loads(stored_embedding))
        
        img = decode_base64_image(image)
        
        faces = face_app.get(img)
        
        if len(faces) == 0:
            return VerificationResponse(
                success=False,
                match=False,
                distance=1.0,
                confidence=0.0,
                message="No face detected in image"
            )
        
        if len(faces) > 1:
            return VerificationResponse(
                success=False,
                match=False,
                distance=1.0,
                confidence=0.0,
                message="Multiple faces detected. Please ensure only one face is visible"
            )
        
        current_emb = faces[0].embedding
        
        distance = euclidean_distance(current_emb, stored_emb)
        similarity = cosine_similarity(current_emb, stored_emb)
        
        threshold = 1.0
        match = distance < threshold
        confidence = max(0, min(100, (1 - distance / 2) * 100))
        
        return VerificationResponse(
            success=True,
            match=match,
            distance=distance,
            confidence=confidence,
            message="Face verified successfully" if match else "Face does not match"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/compare")
async def compare_faces(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...)
):
    try:
        contents1 = await file1.read()
        contents2 = await file2.read()
        
        img1 = decode_image(contents1)
        img2 = decode_image(contents2)
        
        faces1 = face_app.get(img1)
        faces2 = face_app.get(img2)
        
        if len(faces1) == 0:
            return {"success": False, "message": "No face detected in first image"}
        if len(faces2) == 0:
            return {"success": False, "message": "No face detected in second image"}
        
        emb1 = faces1[0].embedding
        emb2 = faces2[0].embedding
        
        distance = euclidean_distance(emb1, emb2)
        similarity = cosine_similarity(emb1, emb2)
        
        threshold = 1.0
        match = distance < threshold
        confidence = max(0, min(100, (1 - distance / 2) * 100))
        
        return {
            "success": True,
            "match": match,
            "distance": distance,
            "similarity": similarity,
            "confidence": confidence,
            "message": "Faces match" if match else "Faces do not match"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("FACE_SERVICE_PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
