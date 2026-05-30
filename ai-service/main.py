import os
import io
import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json

app = FastAPI(title="SmartAttend AI Service")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Paths to models
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DETECTOR_MODEL = os.path.join(BASE_DIR, "models", "face_detection_yunet_2023mar.onnx")
RECOGNIZER_MODEL = os.path.join(BASE_DIR, "models", "face_recognition_sface_2021dec.onnx")

# Initialize models globally
detector = None
recognizer = None

def init_models():
    global detector, recognizer
    if not os.path.exists(DETECTOR_MODEL) or not os.path.exists(RECOGNIZER_MODEL):
        raise RuntimeError(
            "ONNX model files not found. Please run download_models.py first."
        )
    
    # Create YuNet Face Detector
    # We initialize it with default size (320, 320), but will resize it dynamically per frame
    detector = cv2.FaceDetectorYN.create(
        model=DETECTOR_MODEL,
        config="",
        input_size=(320, 320),
        score_threshold=0.6,
        nms_threshold=0.3,
        top_k=5000
    )
    
    # Create SFace Face Recognizer
    recognizer = cv2.FaceRecognizerSF.create(
        model=RECOGNIZER_MODEL,
        config=""
    )
    print("AI Models successfully loaded.")

@app.on_event("startup")
async def startup_event():
    try:
        init_models()
    except Exception as e:
        print(f"Error loading models during startup: {e}")

class KnownStudent(BaseModel):
    studentId: str
    embeddings: List[List[float]] # A student can have multiple registered face embeddings

class RecognitionResult(BaseModel):
    box: List[int] # [x, y, w, h]
    studentId: Optional[str] = None
    confidence: float

def decode_image(file_bytes: bytes) -> np.ndarray:
    nparr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="Invalid image file or format")
    return img

def cosine_similarity(v1: np.ndarray, v2: np.ndarray) -> float:
    dot_product = np.dot(v1, v2)
    norm_v1 = np.linalg.norm(v1)
    norm_v2 = np.linalg.norm(v2)
    if norm_v1 == 0 or norm_v2 == 0:
        return 0.0
    return float(dot_product / (norm_v1 * norm_v2))

@app.post("/extract-embeddings")
async def extract_embeddings(file: UploadFile = File(...)):
    """
    Detects faces in the uploaded image and extracts their embeddings.
    Returns list of embeddings, where each embedding is a list of 128 floats.
    """
    if detector is None or recognizer is None:
        init_models()
        
    contents = await file.read()
    img = decode_image(contents)
    
    h, w = img.shape[:2]
    detector.setInputSize((w, h))
    
    _, faces = detector.detect(img)
    
    if faces is None:
        return {"embeddings": [], "faces_count": 0}
    
    embeddings = []
    for face in faces:
        # Align face crop
        aligned_face = recognizer.alignCrop(img, face)
        # Extract features
        feat = recognizer.feature(aligned_face)
        embeddings.append(feat[0].tolist())
        
    return {"embeddings": embeddings, "faces_count": len(embeddings)}

@app.post("/recognize")
async def recognize(
    file: UploadFile = File(...),
    known_students_json: str = Form(...) # JSON-encoded list of KnownStudent
):
    """
    Detects all faces in the image, extracts their embeddings, and matches
    them against the provided list of registered student embeddings.
    """
    if detector is None or recognizer is None:
        init_models()

    # Parse known students list
    try:
        data = json.loads(known_students_json)
        known_students = [KnownStudent(**s) for s in data]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid known_students_json: {e}")

    contents = await file.read()
    img = decode_image(contents)
    
    h, w = img.shape[:2]
    detector.setInputSize((w, h))
    
    _, faces = detector.detect(img)
    
    results = []
    if faces is None:
        return {"matches": results, "faces_count": 0}
        
    # Match threshold for SFace Cosine Similarity is typically 0.36
    THRESHOLD = 0.36
    
    for face in faces:
        # Box coordinates: [x, y, w, h]
        box = [int(face[0]), int(face[1]), int(face[2]), int(face[3])]
        
        # Align face crop and get embedding
        aligned_face = recognizer.alignCrop(img, face)
        feat = recognizer.feature(aligned_face)[0] # Shape (128,)
        
        best_match_id = "unknown"
        best_similarity = -1.0
        
        for student in known_students:
            for registered_emb_list in student.embeddings:
                registered_emb = np.array(registered_emb_list, dtype=np.float32)
                sim = cosine_similarity(feat, registered_emb)
                if sim > best_similarity:
                    best_similarity = sim
                    if sim >= THRESHOLD:
                        best_match_id = student.studentId
            
        results.append({
            "box": box,
            "studentId": best_match_id,
            "confidence": round(best_similarity, 4)
        })
        
    return {"matches": results, "faces_count": len(results)}

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "models_loaded": detector is not None and recognizer is not None
    }
