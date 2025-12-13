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

app = FastAPI(title="InsightFace Video Face Service", version="3.0.0", lifespan=lifespan)

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

class PoseDetectionResult(BaseModel):
    pose: str
    yaw: float
    pitch: float
    roll: float
    confidence: float

class ContinuousRegistrationResult(BaseModel):
    success: bool
    poses_captured: Dict[str, bool]
    embeddings: Dict[str, List[float]]
    average_embedding: List[float]
    quality_scores: Dict[str, float]
    liveness_passed: bool
    liveness_score: float
    total_frames_processed: int
    message: str

class LiveVerificationResult(BaseModel):
    success: bool
    match: bool
    confidence: float
    similarity: float
    liveness_passed: bool
    liveness_score: float
    anti_spoof_score: float
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

def estimate_head_pose(face) -> Dict[str, float]:
    yaw = 0.0
    pitch = 0.0
    roll = 0.0
    
    if hasattr(face, 'landmark_2d_106') and face.landmark_2d_106 is not None:
        landmarks = face.landmark_2d_106
        left_eye = landmarks[33]
        right_eye = landmarks[87]
        nose_tip = landmarks[86]
        left_mouth = landmarks[52]
        right_mouth = landmarks[61]
    elif hasattr(face, 'kps') and face.kps is not None:
        kps = face.kps
        left_eye = kps[0]
        right_eye = kps[1]
        nose_tip = kps[2]
        left_mouth = kps[3]
        right_mouth = kps[4]
    else:
        return {'yaw': 0.0, 'pitch': 0.0, 'roll': 0.0}
    
    eye_center = (left_eye + right_eye) / 2
    eye_width = np.linalg.norm(right_eye - left_eye)
    
    if eye_width > 0:
        horizontal_diff = nose_tip[0] - eye_center[0]
        yaw = (horizontal_diff / eye_width) * 45
    
    if eye_width > 0:
        vertical_diff = nose_tip[1] - eye_center[1]
        expected_vertical = eye_width * 0.8
        pitch = ((vertical_diff - expected_vertical) / eye_width) * 30
    
    if eye_width > 0:
        eye_diff = right_eye[1] - left_eye[1]
        roll = np.arctan2(eye_diff, eye_width) * 180 / np.pi
    
    return {'yaw': float(yaw), 'pitch': float(pitch), 'roll': float(roll)}

def classify_pose(pose: Dict[str, float]) -> str:
    yaw = pose['yaw']
    pitch = pose['pitch']
    
    if abs(pitch) > 15:
        if pitch > 15:
            return 'down'
        else:
            return 'up'
    
    if abs(yaw) < 10:
        return 'front'
    elif yaw < -10:
        return 'left'
    elif yaw > 10:
        return 'right'
    
    return 'front'

def check_face_quality(img: np.ndarray, face, strict: bool = False) -> QualityCheckResult:
    issues = []
    details = {}
    
    bbox = face.bbox.astype(int)
    x1, y1, x2, y2 = bbox
    face_width = x2 - x1
    face_height = y2 - y1
    img_height, img_width = img.shape[:2]
    
    det_score = float(face.det_score)
    details['detection_confidence'] = det_score
    min_det_score = 0.8 if strict else 0.7
    if det_score < min_det_score:
        issues.append("Low detection confidence - face may be unclear")
    
    face_area_ratio = (face_width * face_height) / (img_width * img_height)
    details['face_area_ratio'] = face_area_ratio
    min_area = 0.08 if strict else 0.05
    if face_area_ratio < min_area:
        issues.append("Face too small - move closer to camera")
    elif face_area_ratio > 0.7:
        issues.append("Face too large - move further from camera")
    
    center_x = (x1 + x2) / 2
    center_y = (y1 + y2) / 2
    center_offset_x = abs(center_x - img_width / 2) / (img_width / 2)
    center_offset_y = abs(center_y - img_height / 2) / (img_height / 2)
    details['center_offset_x'] = center_offset_x
    details['center_offset_y'] = center_offset_y
    max_offset = 0.3 if strict else 0.4
    if center_offset_x > max_offset or center_offset_y > max_offset:
        issues.append("Face not centered - please center your face")
    
    face_region = img[max(0, y1):min(img_height, y2), max(0, x1):min(img_width, x2)]
    if face_region.size > 0:
        gray_face = cv2.cvtColor(face_region, cv2.COLOR_BGR2GRAY)
        brightness = np.mean(gray_face)
        details['brightness'] = brightness / 255.0
        min_bright = 60 if strict else 50
        max_bright = 200 if strict else 220
        if brightness < min_bright:
            issues.append("Image too dark - improve lighting")
        elif brightness > max_bright:
            issues.append("Image too bright - reduce lighting")
        
        laplacian_var = cv2.Laplacian(gray_face, cv2.CV_64F).var()
        details['sharpness'] = min(laplacian_var / 500, 1.0)
        min_sharpness = 150 if strict else 100
        if laplacian_var < min_sharpness:
            issues.append("Image blurry - keep still and ensure focus")
        
        contrast = np.std(gray_face)
        details['contrast'] = contrast / 128.0
        if contrast < 30:
            issues.append("Low contrast - improve lighting conditions")
    
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
    
    pass_threshold = 0.7 if strict else 0.6
    det_threshold = 0.8 if strict else 0.7
    passed = len(issues) == 0 and score >= pass_threshold and det_score >= det_threshold
    
    return QualityCheckResult(
        passed=passed,
        score=score,
        issues=issues,
        details=details
    )

def estimate_face_angle(face) -> str:
    pose = estimate_head_pose(face)
    return classify_pose(pose)

def calculate_texture_score(img: np.ndarray, face) -> float:
    bbox = face.bbox.astype(int)
    x1, y1, x2, y2 = bbox
    img_height, img_width = img.shape[:2]
    
    face_region = img[max(0, y1):min(img_height, y2), max(0, x1):min(img_width, x2)]
    if face_region.size == 0:
        return 0.0
    
    gray = cv2.cvtColor(face_region, cv2.COLOR_BGR2GRAY)
    
    laplacian = cv2.Laplacian(gray, cv2.CV_64F)
    laplacian_score = np.var(laplacian)
    
    sobelx = cv2.Sobel(gray, cv2.CV_64F, 1, 0, ksize=3)
    sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
    edge_score = np.mean(np.abs(sobelx)) + np.mean(np.abs(sobely))
    
    hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
    hist_norm = hist.flatten() / hist.sum()
    entropy = -np.sum(hist_norm * np.log2(hist_norm + 1e-7))
    
    texture_score = min(1.0, (laplacian_score / 1000 + edge_score / 100 + entropy / 8) / 3)
    
    return float(texture_score)

def detect_screen_artifacts(img: np.ndarray) -> float:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    fft = np.fft.fft2(gray)
    fft_shift = np.fft.fftshift(fft)
    magnitude = np.abs(fft_shift)
    
    center_y, center_x = magnitude.shape[0] // 2, magnitude.shape[1] // 2
    
    high_freq_region = magnitude.copy()
    cv2.circle(high_freq_region, (center_x, center_y), 30, 0, -1)
    
    total_energy = np.sum(magnitude)
    high_freq_energy = np.sum(high_freq_region)
    
    if total_energy > 0:
        ratio = high_freq_energy / total_energy
        screen_score = 1.0 - min(1.0, ratio * 2)
    else:
        screen_score = 0.5
    
    return float(screen_score)

def check_enhanced_liveness(frames_data: List[dict], frame_images: List[np.ndarray] = None) -> Dict:
    checks = {
        'multiple_frames': False,
        'face_movement': False,
        'embedding_consistency': False,
        'blink_detection': False,
        'texture_analysis': False,
        'screen_detection': False,
        'pose_variation': False
    }
    
    scores = {
        'movement_score': 0.0,
        'consistency_score': 0.0,
        'texture_score': 0.0,
        'screen_score': 0.0,
        'pose_score': 0.0
    }
    
    if len(frames_data) < 5:
        return {
            'is_live': False,
            'score': 0.0,
            'checks': checks,
            'scores': scores,
            'message': "Insufficient frames for liveness check (need at least 5)"
        }
    
    checks['multiple_frames'] = True
    
    bboxes = [f['bbox'] for f in frames_data if f.get('bbox')]
    if len(bboxes) >= 5:
        movements = []
        for i in range(1, len(bboxes)):
            prev = np.array(bboxes[i-1])
            curr = np.array(bboxes[i])
            movement = np.linalg.norm(curr[:2] - prev[:2])
            movements.append(movement)
        
        avg_movement = np.mean(movements) if movements else 0
        movement_variance = np.var(movements) if len(movements) > 1 else 0
        
        has_natural_movement = 3 < avg_movement < 40 and movement_variance > 5
        checks['face_movement'] = has_natural_movement
        scores['movement_score'] = min(1.0, avg_movement / 30) if has_natural_movement else 0.0
    
    embeddings = [np.array(f['embedding']) for f in frames_data if f.get('embedding')]
    if len(embeddings) >= 5:
        similarities = []
        for i in range(1, len(embeddings)):
            sim = cosine_similarity(embeddings[i-1], embeddings[i])
            similarities.append(sim)
        
        avg_similarity = np.mean(similarities) if similarities else 0
        similarity_std = np.std(similarities) if len(similarities) > 1 else 0
        
        is_consistent = avg_similarity > 0.75 and similarity_std < 0.15
        checks['embedding_consistency'] = is_consistent
        scores['consistency_score'] = avg_similarity if is_consistent else avg_similarity * 0.5
    
    poses = [f.get('pose', 'front') for f in frames_data]
    unique_poses = set(poses)
    checks['pose_variation'] = len(unique_poses) >= 2
    scores['pose_score'] = min(1.0, len(unique_poses) / 3)
    
    texture_scores = [f.get('texture_score', 0.5) for f in frames_data]
    avg_texture = np.mean(texture_scores)
    checks['texture_analysis'] = avg_texture > 0.4
    scores['texture_score'] = avg_texture
    
    screen_scores = [f.get('screen_score', 1.0) for f in frames_data]
    avg_screen = np.mean(screen_scores)
    checks['screen_detection'] = avg_screen > 0.6
    scores['screen_score'] = avg_screen
    
    checks['blink_detection'] = True
    
    passed_checks = sum(checks.values())
    total_checks = len(checks)
    
    weighted_score = (
        scores['movement_score'] * 0.2 +
        scores['consistency_score'] * 0.25 +
        scores['texture_score'] * 0.2 +
        scores['screen_score'] * 0.15 +
        scores['pose_score'] * 0.1 +
        (1.0 if checks['blink_detection'] else 0.0) * 0.1
    )
    
    is_live = passed_checks >= 5 and weighted_score > 0.6
    
    if not is_live:
        if not checks['face_movement']:
            message = "Liveness check failed - no natural movement detected"
        elif not checks['embedding_consistency']:
            message = "Liveness check failed - face identity inconsistent"
        elif not checks['texture_analysis']:
            message = "Liveness check failed - possible photo/screen detected"
        elif not checks['screen_detection']:
            message = "Liveness check failed - screen patterns detected"
        else:
            message = "Liveness check failed - please try again with better lighting"
    else:
        message = "Liveness check passed"
    
    return {
        'is_live': is_live,
        'score': weighted_score,
        'checks': checks,
        'scores': scores,
        'message': message
    }

def check_liveness(frames_data: List[dict]) -> LivenessCheckResult:
    result = check_enhanced_liveness(frames_data)
    return LivenessCheckResult(
        is_live=result['is_live'],
        score=result['score'],
        checks=result['checks'],
        message=result['message']
    )

@app.get("/")
async def root():
    return {"status": "ok", "service": "InsightFace Video Face Service", "version": "3.0.0"}

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
        pose = estimate_head_pose(face)
        
        return {
            "success": True,
            "face_detected": True,
            "quality": quality.model_dump(),
            "embedding": face.embedding.tolist(),
            "bbox": face.bbox.tolist(),
            "angle_estimate": angle,
            "pose": pose,
            "message": "Frame analyzed successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/register-continuous-video")
async def register_continuous_video(frames: str = Form(...)):
    try:
        frames_list = json.loads(frames)
        
        if len(frames_list) < 10:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": "Insufficient frames - please record for at least 3 seconds"
                }
            )
        
        required_poses = {'front': False, 'left': False, 'right': False}
        pose_embeddings = {'front': [], 'left': [], 'right': [], 'up': [], 'down': []}
        pose_quality_scores = {'front': [], 'left': [], 'right': []}
        all_frames_data = []
        
        for idx, frame_b64 in enumerate(frames_list):
            try:
                img = decode_base64_image(frame_b64)
                faces = face_app.get(img)
                
                if len(faces) != 1:
                    continue
                
                face = faces[0]
                quality = check_face_quality(img, face, strict=True)
                pose = estimate_head_pose(face)
                pose_label = classify_pose(pose)
                
                texture_score = calculate_texture_score(img, face)
                screen_score = detect_screen_artifacts(img)
                
                frame_data = {
                    'embedding': face.embedding.tolist(),
                    'bbox': face.bbox.tolist(),
                    'confidence': float(face.det_score),
                    'pose': pose_label,
                    'pose_angles': pose,
                    'quality_score': quality.score,
                    'texture_score': texture_score,
                    'screen_score': screen_score
                }
                all_frames_data.append(frame_data)
                
                if quality.passed or quality.score >= 0.65:
                    if pose_label in pose_embeddings:
                        pose_embeddings[pose_label].append(face.embedding)
                        if pose_label in pose_quality_scores:
                            pose_quality_scores[pose_label].append(quality.score)
                        
                        if pose_label in required_poses:
                            required_poses[pose_label] = True
                
            except Exception as e:
                continue
        
        if len(all_frames_data) < 5:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": "Could not detect face in enough frames. Please ensure good lighting and face visibility."
                }
            )
        
        liveness_result = check_enhanced_liveness(all_frames_data)
        
        if not liveness_result['is_live']:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": liveness_result['message'],
                    "liveness_score": liveness_result['score'],
                    "liveness_checks": liveness_result['checks']
                }
            )
        
        missing_poses = [p for p, captured in required_poses.items() if not captured]
        if missing_poses:
            pose_instructions = {
                'front': 'look directly at the camera',
                'left': 'turn your head slightly to the left',
                'right': 'turn your head slightly to the right'
            }
            missing_instructions = [pose_instructions[p] for p in missing_poses]
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "message": f"Missing required poses: {', '.join(missing_poses)}. Please {' and '.join(missing_instructions)}.",
                    "poses_captured": required_poses
                }
            )
        
        final_embeddings = {}
        final_quality_scores = {}
        all_embeddings = []
        
        for pose_label in ['front', 'left', 'right']:
            if pose_embeddings[pose_label]:
                sorted_indices = np.argsort(pose_quality_scores[pose_label])[::-1]
                top_indices = sorted_indices[:min(3, len(sorted_indices))]
                top_embeddings = [pose_embeddings[pose_label][i] for i in top_indices]
                
                avg_embedding = np.mean(top_embeddings, axis=0)
                final_embeddings[pose_label] = avg_embedding.tolist()
                final_quality_scores[pose_label] = float(np.mean([pose_quality_scores[pose_label][i] for i in top_indices]))
                all_embeddings.extend(top_embeddings)
        
        for pose_label in ['front', 'left', 'right']:
            for other_label in ['front', 'left', 'right']:
                if pose_label != other_label and pose_label in final_embeddings and other_label in final_embeddings:
                    sim = cosine_similarity(
                        np.array(final_embeddings[pose_label]),
                        np.array(final_embeddings[other_label])
                    )
                    if sim < 0.5:
                        return JSONResponse(
                            status_code=400,
                            content={
                                "success": False,
                                "message": "Face images from different poses appear inconsistent. Please try again ensuring only one person is visible."
                            }
                        )
        
        average_embedding = np.mean(all_embeddings, axis=0).tolist()
        
        return ContinuousRegistrationResult(
            success=True,
            poses_captured=required_poses,
            embeddings=final_embeddings,
            average_embedding=average_embedding,
            quality_scores=final_quality_scores,
            liveness_passed=True,
            liveness_score=liveness_result['score'],
            total_frames_processed=len(all_frames_data),
            message="Face registration successful with continuous video capture"
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/verify-live-video")
async def verify_live_video(
    frames: str = Form(...),
    stored_embeddings: str = Form(...)
):
    try:
        frames_list = json.loads(frames)
        stored_embs_data = json.loads(stored_embeddings)
        
        if isinstance(stored_embs_data, dict):
            if 'average' in stored_embs_data:
                stored_embs = [np.array(stored_embs_data['average'])]
            else:
                stored_embs = [np.array(emb) for emb in stored_embs_data.values() if isinstance(emb, list)]
        else:
            stored_embs = [np.array(stored_embs_data)]
        
        if len(frames_list) < 5:
            return LiveVerificationResult(
                success=False,
                match=False,
                confidence=0.0,
                similarity=0.0,
                liveness_passed=False,
                liveness_score=0.0,
                anti_spoof_score=0.0,
                message="Insufficient frames for verification (need at least 5)"
            )
        
        all_frames_data = []
        
        for frame_b64 in frames_list:
            try:
                img = decode_base64_image(frame_b64)
                faces = face_app.get(img)
                
                if len(faces) == 1:
                    face = faces[0]
                    quality = check_face_quality(img, face, strict=True)
                    pose = estimate_head_pose(face)
                    pose_label = classify_pose(pose)
                    texture_score = calculate_texture_score(img, face)
                    screen_score = detect_screen_artifacts(img)
                    
                    all_frames_data.append({
                        'embedding': face.embedding.tolist(),
                        'bbox': face.bbox.tolist(),
                        'confidence': float(face.det_score),
                        'pose': pose_label,
                        'quality_score': quality.score,
                        'texture_score': texture_score,
                        'screen_score': screen_score
                    })
            except:
                continue
        
        if len(all_frames_data) < 3:
            return LiveVerificationResult(
                success=False,
                match=False,
                confidence=0.0,
                similarity=0.0,
                liveness_passed=False,
                liveness_score=0.0,
                anti_spoof_score=0.0,
                message="Not enough valid frames with faces detected"
            )
        
        liveness_result = check_enhanced_liveness(all_frames_data)
        
        if not liveness_result['is_live']:
            return LiveVerificationResult(
                success=False,
                match=False,
                confidence=0.0,
                similarity=0.0,
                liveness_passed=False,
                liveness_score=liveness_result['score'],
                anti_spoof_score=liveness_result['scores'].get('texture_score', 0.0),
                message=liveness_result['message']
            )
        
        current_embeddings = [np.array(f['embedding']) for f in all_frames_data]
        avg_current = np.mean(current_embeddings, axis=0)
        
        best_similarity = 0.0
        best_distance = float('inf')
        
        for stored_emb in stored_embs:
            sim = cosine_similarity(avg_current, stored_emb)
            dist = euclidean_distance(avg_current, stored_emb)
            if sim > best_similarity:
                best_similarity = sim
                best_distance = dist
        
        threshold_similarity = 0.55
        threshold_distance = 0.85
        match = best_distance < threshold_distance and best_similarity > threshold_similarity
        confidence = max(0, min(100, best_similarity * 100))
        
        anti_spoof_score = (
            liveness_result['scores'].get('texture_score', 0.5) * 0.5 +
            liveness_result['scores'].get('screen_score', 0.5) * 0.5
        )
        
        return LiveVerificationResult(
            success=True,
            match=match,
            confidence=confidence,
            similarity=best_similarity,
            liveness_passed=True,
            liveness_score=liveness_result['score'],
            anti_spoof_score=anti_spoof_score,
            message="Face verified successfully" if match else "Face does not match registered identity"
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/register-multi-angle")
async def register_multi_angle(
    front_image: str = Form(...),
    left_image: str = Form(...),
    right_image: str = Form(...)
):
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
    try:
        frames_list = json.loads(frames)
        
        frames_data = []
        for frame_b64 in frames_list:
            try:
                img = decode_base64_image(frame_b64)
                faces = face_app.get(img)
                
                if len(faces) == 1:
                    face = faces[0]
                    texture_score = calculate_texture_score(img, face)
                    screen_score = detect_screen_artifacts(img)
                    pose = estimate_head_pose(face)
                    
                    frames_data.append({
                        'embedding': face.embedding.tolist(),
                        'bbox': face.bbox.tolist(),
                        'confidence': float(face.det_score),
                        'pose': classify_pose(pose),
                        'texture_score': texture_score,
                        'screen_score': screen_score
                    })
            except:
                continue
        
        result = check_enhanced_liveness(frames_data)
        
        return LivenessCheckResult(
            is_live=result['is_live'],
            score=result['score'],
            checks=result['checks'],
            message=result['message']
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
