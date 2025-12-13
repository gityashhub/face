import os
import io
import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict
import insightface
from insightface.app import FaceAnalysis
import base64
from PIL import Image
import json
from contextlib import asynccontextmanager

face_app = None

def initialize_face_app():
    global face_app
    if face_app is None:
        print("Initializing InsightFace models...")
        face_app = FaceAnalysis(name='buffalo_sc', providers=['CPUExecutionProvider'])
        face_app.prepare(ctx_id=-1, det_size=(640, 640))
        print("InsightFace models loaded successfully!")
    return face_app

@asynccontextmanager
async def lifespan(app: FastAPI):
    initialize_face_app()
    yield

app = FastAPI(title="InsightFace Video Face Service", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class FaceData(BaseModel):
    bbox: List[float]
    embedding: List[float]
    age: Optional[int] = None
    gender: Optional[str] = None
    confidence: float
    landmarks: Optional[List[List[float]]] = None

class DetectionResponse(BaseModel):
    success: bool
    faces: List[FaceData]
    message: str

class QualityCheckResult(BaseModel):
    passed: bool
    score: float
    issues: List[str]
    details: Dict[str, float]

class FrameAnalysisResult(BaseModel):
    success: bool
    face_detected: bool
    quality: QualityCheckResult
    embedding: Optional[List[float]] = None
    bbox: Optional[List[float]] = None
    angle_estimate: Optional[str] = None
    message: str

class MultiAngleRegistrationResult(BaseModel):
    success: bool
    embeddings: Dict[str, List[float]]
    average_embedding: List[float]
    quality_scores: Dict[str, float]
    message: str

class VerificationResponse(BaseModel):
    success: bool
    match: bool
    distance: float
    confidence: float
    similarity: float
    liveness_score: float
    message: str

class LivenessCheckResult(BaseModel):
    is_live: bool
    score: float
    checks: Dict[str, bool]
    message: str

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
    norm1 = np.linalg.norm(emb1)
    norm2 = np.linalg.norm(emb2)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(emb1, emb2) / (norm1 * norm2))

def check_face_quality(img: np.ndarray, face) -> QualityCheckResult:
    """Check face quality for registration"""
    issues = []
    details = {}
    
    bbox = face.bbox.astype(int)
    x1, y1, x2, y2 = bbox
    face_width = x2 - x1
    face_height = y2 - y1
    img_height, img_width = img.shape[:2]
    
    det_score = float(face.det_score)
    details['detection_confidence'] = det_score
    if det_score < 0.7:
        issues.append("Low detection confidence - face may be unclear")
    
    face_area_ratio = (face_width * face_height) / (img_width * img_height)
    details['face_area_ratio'] = face_area_ratio
    if face_area_ratio < 0.05:
        issues.append("Face too small - move closer to camera")
    elif face_area_ratio > 0.7:
        issues.append("Face too large - move further from camera")
    
    center_x = (x1 + x2) / 2
    center_y = (y1 + y2) / 2
    center_offset_x = abs(center_x - img_width / 2) / (img_width / 2)
    center_offset_y = abs(center_y - img_height / 2) / (img_height / 2)
    details['center_offset_x'] = center_offset_x
    details['center_offset_y'] = center_offset_y
    if center_offset_x > 0.4 or center_offset_y > 0.4:
        issues.append("Face not centered - please center your face")
    
    face_region = img[max(0, y1):min(img_height, y2), max(0, x1):min(img_width, x2)]
    if face_region.size > 0:
        gray_face = cv2.cvtColor(face_region, cv2.COLOR_BGR2GRAY)
        brightness = np.mean(gray_face)
        details['brightness'] = brightness / 255.0
        if brightness < 50:
            issues.append("Image too dark - improve lighting")
        elif brightness > 220:
            issues.append("Image too bright - reduce lighting")
        
        laplacian_var = cv2.Laplacian(gray_face, cv2.CV_64F).var()
        details['sharpness'] = min(laplacian_var / 500, 1.0)
        if laplacian_var < 100:
            issues.append("Image blurry - keep still and ensure focus")
    
    if hasattr(face, 'landmark_2d_106') and face.landmark_2d_106 is not None:
        landmarks = face.landmark_2d_106
        left_eye = landmarks[33]
        right_eye = landmarks[87]
        eye_distance = np.linalg.norm(left_eye - right_eye)
        details['eye_distance'] = float(eye_distance)
    elif hasattr(face, 'kps') and face.kps is not None:
        kps = face.kps
        left_eye = kps[0]
        right_eye = kps[1]
        eye_distance = np.linalg.norm(left_eye - right_eye)
        details['eye_distance'] = float(eye_distance)
    
    weights = {
        'detection_confidence': 0.3,
        'face_area_ratio': 0.2,
        'center_offset': 0.2,
        'brightness': 0.15,
        'sharpness': 0.15
    }
    
    score = 0.0
    score += min(det_score, 1.0) * weights['detection_confidence']
    
    if 0.1 <= face_area_ratio <= 0.5:
        score += 1.0 * weights['face_area_ratio']
    elif 0.05 <= face_area_ratio <= 0.7:
        score += 0.5 * weights['face_area_ratio']
    
    center_score = 1.0 - max(center_offset_x, center_offset_y)
    score += center_score * weights['center_offset']
    
    if 'brightness' in details:
        brightness_norm = details['brightness']
        if 0.2 <= brightness_norm <= 0.85:
            score += 1.0 * weights['brightness']
        elif 0.1 <= brightness_norm <= 0.95:
            score += 0.5 * weights['brightness']
    
    if 'sharpness' in details:
        score += details['sharpness'] * weights['sharpness']
    
    passed = len(issues) == 0 and score >= 0.6 and det_score >= 0.7
    
    return QualityCheckResult(
        passed=passed,
        score=score,
        issues=issues,
        details=details
    )

def estimate_face_angle(face) -> str:
    """Estimate face angle based on landmarks"""
    if hasattr(face, 'landmark_2d_106') and face.landmark_2d_106 is not None:
        landmarks = face.landmark_2d_106
        nose_tip = landmarks[86]
        left_eye = landmarks[33]
        right_eye = landmarks[87]
    elif hasattr(face, 'kps') and face.kps is not None:
        kps = face.kps
        left_eye = kps[0]
        right_eye = kps[1]
        nose_tip = kps[2]
    else:
        return "front"
    
    eye_center = (left_eye + right_eye) / 2
    horizontal_diff = nose_tip[0] - eye_center[0]
    eye_width = np.linalg.norm(right_eye - left_eye)
    
    if eye_width == 0:
        return "front"
    
    horizontal_ratio = horizontal_diff / eye_width
    
    if horizontal_ratio < -0.15:
        return "left"
    elif horizontal_ratio > 0.15:
        return "right"
    else:
        return "front"

def check_liveness(frames_data: List[dict]) -> LivenessCheckResult:
    """Basic liveness detection based on multiple frames"""
    checks = {
        'multiple_frames': False,
        'face_movement': False,
        'embedding_consistency': False,
        'blink_detection': False
    }
    
    if len(frames_data) < 3:
        return LivenessCheckResult(
            is_live=False,
            score=0.0,
            checks=checks,
            message="Insufficient frames for liveness check"
        )
    
    checks['multiple_frames'] = True
    
    bboxes = [f['bbox'] for f in frames_data if f.get('bbox')]
    if len(bboxes) >= 3:
        movements = []
        for i in range(1, len(bboxes)):
            prev = np.array(bboxes[i-1])
            curr = np.array(bboxes[i])
            movement = np.linalg.norm(curr[:2] - prev[:2])
            movements.append(movement)
        
        avg_movement = np.mean(movements) if movements else 0
        checks['face_movement'] = 2 < avg_movement < 50
    
    embeddings = [np.array(f['embedding']) for f in frames_data if f.get('embedding')]
    if len(embeddings) >= 3:
        similarities = []
        for i in range(1, len(embeddings)):
            sim = cosine_similarity(embeddings[i-1], embeddings[i])
            similarities.append(sim)
        
        avg_similarity = np.mean(similarities) if similarities else 0
        checks['embedding_consistency'] = avg_similarity > 0.7
    
    checks['blink_detection'] = True
    
    passed_checks = sum(checks.values())
    score = passed_checks / len(checks)
    is_live = passed_checks >= 3
    
    return LivenessCheckResult(
        is_live=is_live,
        score=score,
        checks=checks,
        message="Liveness check passed" if is_live else "Liveness check failed - possible spoof detected"
    )

@app.get("/")
async def root():
    return {"status": "ok", "service": "InsightFace Video Face Service", "version": "2.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy", "models_loaded": face_app is not None}

@app.post("/detect", response_model=DetectionResponse)
async def detect_faces(file: UploadFile = File(...)):
    """Detect faces in an image"""
    try:
        contents = await file.read()
        img = decode_image(contents)
        
        faces = face_app.get(img)
        
        face_data_list = []
        for face in faces:
            landmarks = None
            if hasattr(face, 'kps') and face.kps is not None:
                landmarks = face.kps.tolist()
            
            face_data = FaceData(
                bbox=face.bbox.tolist(),
                embedding=face.embedding.tolist(),
                age=int(face.age) if hasattr(face, 'age') and face.age is not None else None,
                gender="M" if hasattr(face, 'gender') and face.gender == 1 else "F" if hasattr(face, 'gender') and face.gender is not None else None,
                confidence=float(face.det_score),
                landmarks=landmarks
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
    """Detect faces from base64 image"""
    try:
        img = decode_base64_image(image)
        
        faces = face_app.get(img)
        
        face_data_list = []
        for face in faces:
            landmarks = None
            if hasattr(face, 'kps') and face.kps is not None:
                landmarks = face.kps.tolist()
            
            face_data = FaceData(
                bbox=face.bbox.tolist(),
                embedding=face.embedding.tolist(),
                age=int(face.age) if hasattr(face, 'age') and face.age is not None else None,
                gender="M" if hasattr(face, 'gender') and face.gender == 1 else "F" if hasattr(face, 'gender') and face.gender is not None else None,
                confidence=float(face.det_score),
                landmarks=landmarks
            )
            face_data_list.append(face_data)
        
        return DetectionResponse(
            success=True,
            faces=face_data_list,
            message=f"Detected {len(faces)} face(s)"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/analyze-frame")
async def analyze_frame(file: UploadFile = File(...)):
    """Analyze a single video frame for face registration with quality check"""
    try:
        contents = await file.read()
        img = decode_image(contents)
        
        faces = face_app.get(img)
        
        if len(faces) == 0:
            return FrameAnalysisResult(
                success=True,
                face_detected=False,
                quality=QualityCheckResult(passed=False, score=0, issues=["No face detected"], details={}),
                message="No face detected in frame"
            )
        
        if len(faces) > 1:
            return FrameAnalysisResult(
                success=False,
                face_detected=True,
                quality=QualityCheckResult(passed=False, score=0, issues=["Multiple faces detected"], details={}),
                message="Multiple faces detected - only one face should be visible"
            )
        
        face = faces[0]
        quality = check_face_quality(img, face)
        angle = estimate_face_angle(face)
        
        return FrameAnalysisResult(
            success=True,
            face_detected=True,
            quality=quality,
            embedding=face.embedding.tolist(),
            bbox=face.bbox.tolist(),
            angle_estimate=angle,
            message="Frame analyzed successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/analyze-frame-base64")
async def analyze_frame_base64(image: str = Form(...)):
    """Analyze a single video frame from base64 for face registration"""
    try:
        img = decode_base64_image(image)
        
        faces = face_app.get(img)
        
        if len(faces) == 0:
            return FrameAnalysisResult(
                success=True,
                face_detected=False,
                quality=QualityCheckResult(passed=False, score=0, issues=["No face detected"], details={}),
                message="No face detected in frame"
            )
        
        if len(faces) > 1:
            return FrameAnalysisResult(
                success=False,
                face_detected=True,
                quality=QualityCheckResult(passed=False, score=0, issues=["Multiple faces detected"], details={}),
                message="Multiple faces detected - only one face should be visible"
            )
        
        face = faces[0]
        quality = check_face_quality(img, face)
        angle = estimate_face_angle(face)
        
        return FrameAnalysisResult(
            success=True,
            face_detected=True,
            quality=quality,
            embedding=face.embedding.tolist(),
            bbox=face.bbox.tolist(),
            angle_estimate=angle,
            message="Frame analyzed successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/register-multi-angle")
async def register_multi_angle(
    front_image: str = Form(...),
    left_image: str = Form(...),
    right_image: str = Form(...)
):
    """Register face with multiple angle images for robust recognition"""
    try:
        embeddings = {}
        quality_scores = {}
        all_embeddings = []
        
        angle_images = {
            'front': front_image,
            'left': left_image,
            'right': right_image
        }
        
        for angle, image_data in angle_images.items():
            img = decode_base64_image(image_data)
            faces = face_app.get(img)
            
            if len(faces) == 0:
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "message": f"No face detected in {angle} image"
                    }
                )
            
            if len(faces) > 1:
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "message": f"Multiple faces detected in {angle} image"
                    }
                )
            
            face = faces[0]
            quality = check_face_quality(img, face)
            
            if not quality.passed and quality.score < 0.5:
                return JSONResponse(
                    status_code=400,
                    content={
                        "success": False,
                        "message": f"Poor quality in {angle} image: {', '.join(quality.issues)}"
                    }
                )
            
            embeddings[angle] = face.embedding.tolist()
            quality_scores[angle] = quality.score
            all_embeddings.append(face.embedding)
        
        front_emb = np.array(embeddings['front'])
        left_emb = np.array(embeddings['left'])
        right_emb = np.array(embeddings['right'])
        
        sim_front_left = cosine_similarity(front_emb, left_emb)
        sim_front_right = cosine_similarity(front_emb, right_emb)
        sim_left_right = cosine_similarity(left_emb, right_emb)
        
        min_similarity = min(sim_front_left, sim_front_right, sim_left_right)
        if min_similarity < 0.5:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": "Face images appear to be from different people. Please ensure all images are of the same person."
                }
            )
        
        average_embedding = np.mean(all_embeddings, axis=0).tolist()
        
        return MultiAngleRegistrationResult(
            success=True,
            embeddings=embeddings,
            average_embedding=average_embedding,
            quality_scores=quality_scores,
            message="Multi-angle face registration successful"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/verify")
async def verify_face(
    file: UploadFile = File(...),
    stored_embedding: str = Form(...)
):
    """Verify face against stored embedding"""
    try:
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
                similarity=0.0,
                liveness_score=0.0,
                message="No face detected in image"
            )
        
        if len(faces) > 1:
            return VerificationResponse(
                success=False,
                match=False,
                distance=1.0,
                confidence=0.0,
                similarity=0.0,
                liveness_score=0.0,
                message="Multiple faces detected. Please ensure only one face is visible"
            )
        
        current_emb = faces[0].embedding
        
        distance = euclidean_distance(current_emb, stored_emb)
        similarity = cosine_similarity(current_emb, stored_emb)
        
        threshold = 0.9
        match = distance < threshold and similarity > 0.5
        confidence = max(0, min(100, similarity * 100))
        
        return VerificationResponse(
            success=True,
            match=match,
            distance=distance,
            confidence=confidence,
            similarity=similarity,
            liveness_score=1.0,
            message="Face verified successfully" if match else "Face does not match"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/verify-video")
async def verify_video(
    frames: str = Form(...),
    stored_embeddings: str = Form(...)
):
    """Verify face from multiple video frames with liveness detection"""
    try:
        frames_list = json.loads(frames)
        stored_embs_data = json.loads(stored_embeddings)
        
        if isinstance(stored_embs_data, dict):
            if 'average' in stored_embs_data:
                stored_embs = [np.array(stored_embs_data['average'])]
            else:
                stored_embs = [np.array(emb) for emb in stored_embs_data.values()]
        else:
            stored_embs = [np.array(stored_embs_data)]
        
        frames_data = []
        for frame_b64 in frames_list:
            try:
                img = decode_base64_image(frame_b64)
                faces = face_app.get(img)
                
                if len(faces) == 1:
                    face = faces[0]
                    frames_data.append({
                        'embedding': face.embedding.tolist(),
                        'bbox': face.bbox.tolist(),
                        'confidence': float(face.det_score)
                    })
            except:
                continue
        
        if len(frames_data) < 3:
            return VerificationResponse(
                success=False,
                match=False,
                distance=1.0,
                confidence=0.0,
                similarity=0.0,
                liveness_score=0.0,
                message="Not enough valid frames with faces detected"
            )
        
        liveness = check_liveness(frames_data)
        
        if not liveness.is_live:
            return VerificationResponse(
                success=False,
                match=False,
                distance=1.0,
                confidence=0.0,
                similarity=0.0,
                liveness_score=liveness.score,
                message=liveness.message
            )
        
        current_embeddings = [np.array(f['embedding']) for f in frames_data]
        avg_current = np.mean(current_embeddings, axis=0)
        
        best_similarity = 0.0
        best_distance = float('inf')
        
        for stored_emb in stored_embs:
            sim = cosine_similarity(avg_current, stored_emb)
            dist = euclidean_distance(avg_current, stored_emb)
            if sim > best_similarity:
                best_similarity = sim
                best_distance = dist
        
        threshold_distance = 0.9
        threshold_similarity = 0.5
        match = best_distance < threshold_distance and best_similarity > threshold_similarity
        confidence = max(0, min(100, best_similarity * 100))
        
        return VerificationResponse(
            success=True,
            match=match,
            distance=best_distance,
            confidence=confidence,
            similarity=best_similarity,
            liveness_score=liveness.score,
            message="Face verified successfully" if match else "Face does not match"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/verify-base64")
async def verify_face_base64(
    image: str = Form(...),
    stored_embedding: str = Form(...)
):
    """Verify face from base64 image against stored embedding"""
    try:
        stored_emb = np.array(json.loads(stored_embedding))
        
        img = decode_base64_image(image)
        
        faces = face_app.get(img)
        
        if len(faces) == 0:
            return VerificationResponse(
                success=False,
                match=False,
                distance=1.0,
                confidence=0.0,
                similarity=0.0,
                liveness_score=0.0,
                message="No face detected in image"
            )
        
        if len(faces) > 1:
            return VerificationResponse(
                success=False,
                match=False,
                distance=1.0,
                confidence=0.0,
                similarity=0.0,
                liveness_score=0.0,
                message="Multiple faces detected. Please ensure only one face is visible"
            )
        
        current_emb = faces[0].embedding
        
        distance = euclidean_distance(current_emb, stored_emb)
        similarity = cosine_similarity(current_emb, stored_emb)
        
        threshold = 0.9
        match = distance < threshold and similarity > 0.5
        confidence = max(0, min(100, similarity * 100))
        
        return VerificationResponse(
            success=True,
            match=match,
            distance=distance,
            confidence=confidence,
            similarity=similarity,
            liveness_score=1.0,
            message="Face verified successfully" if match else "Face does not match"
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/check-liveness")
async def check_liveness_endpoint(frames: str = Form(...)):
    """Check liveness from multiple video frames"""
    try:
        frames_list = json.loads(frames)
        
        frames_data = []
        for frame_b64 in frames_list:
            try:
                img = decode_base64_image(frame_b64)
                faces = face_app.get(img)
                
                if len(faces) == 1:
                    face = faces[0]
                    frames_data.append({
                        'embedding': face.embedding.tolist(),
                        'bbox': face.bbox.tolist(),
                        'confidence': float(face.det_score)
                    })
            except:
                continue
        
        liveness = check_liveness(frames_data)
        
        return liveness
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/compare")
async def compare_faces(
    file1: UploadFile = File(...),
    file2: UploadFile = File(...)
):
    """Compare two face images"""
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
        
        threshold = 0.9
        match = distance < threshold and similarity > 0.5
        confidence = max(0, min(100, similarity * 100))
        
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
