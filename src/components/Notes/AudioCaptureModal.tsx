import React, { useState, useRef } from 'react';
import { X, Mic, StopCircle, Radio, Loader2, Copy, Plus } from 'lucide-react';

interface AudioCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscriptReady?: (text: string) => void;
}

const AudioCaptureModal: React.FC<AudioCaptureModalProps> = ({ isOpen, onClose, onTranscriptReady }) => {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  if (!isOpen) return null;

  async function startCapture() {
    try {
      setError(null);
      // 1. Request the screen share with audio enabled
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true, // Required to trigger the system audio checkbox in most browsers
        audio: true  // This is what we actually want
      });

      // 2. Isolate the audio track
      const audioTrack = screenStream.getAudioTracks()[0];
      if (!audioTrack) {
        screenStream.getTracks().forEach(t => t.stop());
        setError("Make sure to check the 'Share System Audio' box in the window picker!");
        return;
      }

      // 3. Stop the video track immediately (we don't need it)
      screenStream.getVideoTracks().forEach(track => track.stop());

      // 4. Create a new stream with ONLY the audio
      const onlyAudioStream = new MediaStream([audioTrack]);
      
      const mediaRecorder = new MediaRecorder(onlyAudioStream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsCapturing(true);

    } catch (err: any) {
      console.error("Capture Error:", err);
      setError(err.message || "Failed to start capture. You may have cancelled the request.");
    }
  }

  function stopCapture() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
    setIsCapturing(false);
  }

  async function transcribeAudio(blob: Blob) {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', blob);

      const res = await fetch('/api/openai/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Transcription failed');
      }

      const data = await res.json();
      setTranscript(prev => prev + (prev ? '\n\n' : '') + data.text);
    } catch (err: any) {
      setError("Transcription failed: " + err.message);
    } finally {
      setIsTranscribing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300 ${isCapturing ? 'bg-red-50 text-red-500 animate-pulse' : 'bg-indigo-50 text-indigo-500'}`}>
              {isCapturing ? <Radio className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">System Audio Transcriber</h2>
              <p className="text-xs text-gray-500 font-medium">Capture system audio for AI transcription</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6 min-h-[400px] flex flex-col">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm flex items-center gap-3">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          <div className="flex-1 bg-slate-50 rounded-2xl p-6 relative group border border-slate-100 overflow-y-auto max-h-[300px]">
            {transcript ? (
              <p className="text-gray-800 leading-relaxed font-medium whitespace-pre-wrap">{transcript}</p>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                <Mic className="w-12 h-12 opacity-20" />
                <p className="text-sm font-medium">Your transcript will appear here...</p>
              </div>
            )}
            {isTranscribing && (
              <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg border border-slate-100">
                  <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
                  <span className="text-xs font-bold text-slate-600">Transcribing with AI...</span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
             <div className="flex items-center gap-2">
               {isCapturing ? (
                 <button
                   onClick={stopCapture}
                   className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold px-6 py-3 rounded-2xl transition-all shadow-lg shadow-red-200 active:scale-95"
                 >
                   <StopCircle className="w-5 h-5" />
                   Stop Recording
                 </button>
               ) : (
                 <button
                   onClick={startCapture}
                   className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-2xl transition-all shadow-lg shadow-indigo-200 active:scale-95"
                 >
                   <Mic className="w-5 h-5" />
                   Start Audio Capture
                 </button>
               )}
             </div>

             <div className="flex items-center gap-2">
               {transcript && (
                 <>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(transcript);
                      // Simple feedback
                    }}
                    className="p-3 bg-white hover:bg-slate-100 text-slate-500 rounded-xl transition-all border border-slate-200 shadow-sm"
                    title="Copy to Clipboard"
                  >
                    <Copy className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => {
                        if (onTranscriptReady) {
                            onTranscriptReady(transcript);
                            onClose();
                        }
                    }}
                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-3 rounded-2xl transition-all shadow-lg shadow-emerald-200"
                  >
                    <Plus className="w-5 h-5" />
                    Insert to Note
                  </button>
                 </>
               )}
             </div>
          </div>
          
          <div className="p-4 bg-indigo-50/50 rounded-xl text-[11px] text-indigo-700 font-medium">
            <span className="font-bold">Pro Tip:</span> To capture other apps (Spotify, Teams, etc.), select <span className="font-bold">"Entire Screen"</span> or <span className="font-bold">"Window"</span> and ensure you check the <span className="font-bold">"Share system audio"</span> toggle before clicking Share.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioCaptureModal;
