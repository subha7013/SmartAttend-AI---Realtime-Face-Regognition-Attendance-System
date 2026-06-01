import React, { useState, useEffect, useRef } from 'react';
import { recognizeAttendance } from '../services/api';
import { Camera, VideoOff, ShieldCheck, UserCheck, AlertCircle, Play, Square, Loader } from 'lucide-react';

const Attendance = () => {
  const [activeSession, setActiveSession] = useState(false);
  const [sessionLogs, setSessionLogs] = useState([]);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [facesDetected, setFacesDetected] = useState(0);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const sessionIntervalRef = useRef(null);

  // Stop camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setCameraLoading(true);
    setFacesDetected(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setActiveSession(true);
      
      // Start processing frames
      startRecognitionLoop();
    } catch (err) {
      console.error('Camera Access Error:', err);
      alert('Could not access webcam. Please check permissions and connection.');
    } finally {
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    setActiveSession(false);
    if (sessionIntervalRef.current) {
      clearInterval(sessionIntervalRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setFacesDetected(0);
  };

  const startRecognitionLoop = () => {
    // Run every 1.5 seconds
    sessionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      // Sync canvas dimensions
      if (canvas.width !== video.videoWidth) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert canvas to blob file
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        try {
          const file = new File([blob], 'snapshot.jpg', { type: 'image/jpeg' });
          const response = await recognizeAttendance(file);

          const { matches, faces_count } = response;
          setFacesDetected(faces_count);

          // Re-draw clean video frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Draw overlays for each match
          matches.forEach((match) => {
            const [x, y, w, h] = match.box;
            
            // Choose border color based on identity
            const isKnown = match.studentId && match.studentId !== 'unknown';
            const strokeColor = isKnown ? '#10b981' : '#ef4444'; // green for known, red for unknown
            const label = isKnown ? `${match.name} (${match.rollNo})` : 'Unknown Face';

            // Draw bounding rectangle
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, w, h);

            // Draw label background
            ctx.fillStyle = strokeColor;
            ctx.font = 'bold 12px Outfit, sans-serif';
            const textWidth = ctx.measureText(label).width;
            ctx.fillRect(x, y - 22, textWidth + 12, 22);

            // Draw label text
            ctx.fillStyle = '#ffffff';
            ctx.fillText(label, x + 6, y - 6);

            // If a known student was recognized, add to session activity logs
            if (isKnown) {
              const timestamp = new Date().toLocaleTimeString();
              setSessionLogs((prev) => {
                // Check if already in list to avoid clutter
                const exists = prev.some((log) => log.rollNo === match.rollNo && log.status === match.status);
                if (exists) return prev;
                return [
                  {
                    id: Math.random().toString(),
                    time: timestamp,
                    name: match.name,
                    rollNo: match.rollNo,
                    department: match.department,
                    status: match.status,
                  },
                  ...prev,
                ];
              });
            }
          });
        } catch (err) {
          console.error('Frame processing failure:', err.message);
        }
      }, 'image/jpeg');
    }, 1500);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Camera Scanning Session</h1>
        <p className="text-slate-400 mt-1 text-sm">Real-time face recognition classroom attendance processing</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left webcam screen (2 columns width) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-panel rounded-2xl p-4 border border-slate-800 relative overflow-hidden flex flex-col items-center justify-center min-h-[400px]">
            {/* Webcam feed wrapper */}
            <div className="relative rounded-xl overflow-hidden w-full aspect-video bg-slate-950 flex items-center justify-center">
              <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full object-cover hidden"
                playsInline
                muted
              ></video>
              <canvas
                ref={canvasRef}
                className={`w-full h-full object-cover ${activeSession ? 'block' : 'hidden'}`}
              ></canvas>

              {!activeSession && !cameraLoading && (
                <div className="text-center p-6 space-y-4 z-10">
                  <div className="inline-flex p-4 bg-slate-900 border border-slate-800 rounded-full text-slate-500">
                    <VideoOff className="w-10 h-10" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Camera Offline</h3>
                  <p className="text-sm text-slate-500 max-w-sm">
                    Start a scanning session to open the webcam and log attendance.
                  </p>
                </div>
              )}

              {cameraLoading && (
                <div className="text-center p-6 space-y-4 z-10">
                  <Loader className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
                  <p className="text-sm text-slate-400">Initializing camera feed...</p>
                </div>
              )}

              {/* Laser scanner effect when active */}
              {activeSession && <div className="scanner-beam"></div>}
            </div>

            {/* Controls */}
            <div className="w-full flex items-center justify-between mt-6 pt-4 border-t border-slate-900">
              <div className="flex items-center space-x-2 text-xs">
                <span className={`w-2.5 h-2.5 rounded-full ${activeSession ? 'bg-emerald-500 pulse-dot' : 'bg-red-500'}`}></span>
                <span className="font-semibold text-slate-400">
                  {activeSession ? `Camera Active | Detects: ${facesDetected} face(s)` : 'Camera Offline'}
                </span>
              </div>

              {!activeSession ? (
                <button
                  onClick={startCamera}
                  disabled={cameraLoading}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-lg transition cursor-pointer text-sm disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Scanning</span>
                </button>
              ) : (
                <button
                  onClick={stopCamera}
                  className="flex items-center space-x-2 px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg transition cursor-pointer text-sm"
                >
                  <Square className="w-4 h-4 fill-white" />
                  <span>Stop Scanning</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right side live log */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 flex flex-col h-[525px]">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center space-x-2 shrink-0">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            <span>Session Logs ({sessionLogs.length})</span>
          </h3>

          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {sessionLogs.length > 0 ? (
              sessionLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 bg-slate-900/60 border border-slate-850 rounded-xl space-y-2 text-xs hover:border-slate-800 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-500">{log.time}</span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        log.status === 'Marked Present'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {log.status === 'Marked Present' ? 'Present' : 'Already Marked'}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white">{log.name}</h4>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Roll: {log.rollNo}</span>
                    <span className="font-semibold text-indigo-400">{log.department}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-sm italic shrink-0 px-4">
                <Camera className="w-8 h-8 text-slate-700 mb-2" />
                <p>No faces recognized in this session yet.</p>
                <p className="text-xs text-slate-600 mt-1 max-w-[200px]">
                  Start scanning to log present students.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Attendance;
