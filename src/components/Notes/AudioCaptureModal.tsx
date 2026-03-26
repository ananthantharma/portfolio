import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, StopCircle, Radio, Loader2, Copy, Plus, Cpu, Cloud, Settings2 } from 'lucide-react';

interface AudioCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscriptReady?: (text: string) => void;
}

type ModelType = 'openai' | 'vosk';

const AudioCaptureModal: React.FC<AudioCaptureModalProps> = ({ isOpen, onClose, onTranscriptReady }) => {
  if (!isOpen) return null;
  
  const [modelType, setModelType] = useState<ModelType>('openai');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  // Vosk State
  const [voskReady, setVoskReady] = useState(false);
  const [loadingModel, setLoadingModel] = useState(false);
  const recognizerRef = useRef<any>(null);
  const modelRef = useRef<any>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCapture();
    }
  }, [isOpen]);

  async function initVosk() {
    if (voskReady) return true;
    setLoadingModel(true);
    try {
      const { createModel } = await import('vosk-browser');
      // Using a small, fast-loading English model
      const model = await createModel('https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.tar.gz');
      modelRef.current = model;
      setVoskReady(true);
      return true;
    } catch (err: any) {
      setError("Failed to load Vosk model: " + err.message);
      return false;
    } finally {
      setLoadingModel(false);
    }
  }

  async function startCapture() {
    try {
      setError(null);
      
      if (modelType === 'vosk' && !voskReady) {
        const ok = await initVosk();
        if (!ok) return;
      }

      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      const audioTrack = screenStream.getAudioTracks()[0];
      if (!audioTrack) {
        screenStream.getTracks().forEach(t => t.stop());
        setError("Make sure to check the 'Share System Audio' box in the window picker!");
        return;
      }

      screenStream.getVideoTracks().forEach(track => track.stop());
      const onlyAudioStream = new MediaStream([audioTrack]);
      streamRef.current = onlyAudioStream;

      if (modelType === 'openai') {
        const mediaRecorder = new MediaRecorder(onlyAudioStream, { mimeType: 'audio/webm' });
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) audioChunksRef.current.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await transcribeWithOpenAI(audioBlob);
        };

        mediaRecorder.start();
      } else if (modelType === 'vosk') {
        const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(onlyAudioStream);
        
        const recognizer = new modelRef.current.KaldiRecognizer(audioContext.sampleRate);
        recognizerRef.current = recognizer;
        
        recognizer.on("result", (message: any) => {
          if (message.result?.text) {
            setTranscript(prev => prev + (prev ? ' ' : '') + message.result.text);
          }
        });
        
        recognizer.on("partialresult", () => {
          // Log or handle partials if needed
        });

        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processor.onaudioprocess = (e: any) => {
          if (isCapturing && recognizerRef.current) {
            recognizerRef.current.acceptWaveform(e.inputBuffer.getChannelData(0));
          }
        };

        source.connect(processor);
        processor.connect(audioContext.destination);
      }

      setIsCapturing(true);

    } catch (err: any) {
      setError(err.message || "Capture failed");
    }
  }

  function stopCapture() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (recognizerRef.current) {
      recognizerRef.current.remove();
      recognizerRef.current = null;
    }
    setIsCapturing(false);
  }

  async function transcribeWithOpenAI(blob: Blob) {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', blob);

      const res = await fetch('/api/openai/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Transcription failed');
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
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isCapturing ? 'bg-red-50 text-red-500 animate-pulse ring-2 ring-red-100' : 'bg-slate-50 text-slate-500'}`}>
              {isCapturing ? <Radio className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">Audio Transcriber</h2>
              <p className="text-xs text-gray-500 font-medium">Select a model to begin capturing</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Model Selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl ring-1 ring-slate-200">
              <button
                disabled={isCapturing}
                onClick={() => setModelType('openai')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${modelType === 'openai' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Cloud className="w-3.5 h-3.5" />
                Whisper
              </button>
              <button
                disabled={isCapturing}
                onClick={() => setModelType('vosk')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${modelType === 'vosk' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Cpu className="w-3.5 h-3.5" />
                Vosk
              </button>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6 min-h-[400px] flex flex-col">
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm flex items-center gap-3">
              <span className="font-bold whitespace-nowrap">Error:</span> {error}
            </div>
          )}

          <div className="flex-1 bg-slate-50 rounded-2xl p-6 relative group border border-slate-100 overflow-y-auto max-h-[300px]">
            {transcript ? (
              <p className="text-gray-800 leading-relaxed font-medium whitespace-pre-wrap">{transcript}</p>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
                  <Mic className="w-8 h-8 opacity-20" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-500">Ready to Capture</p>
                  <p className="text-[11px] text-slate-400 max-w-[200px] mt-1">
                    {modelType === 'vosk' ? 'Vosk provides private, local transcription directly in your browser.' : 'Whisper uses OpenAI for high-accuracy cloud transcription.'}
                  </p>
                </div>
              </div>
            )}
            {(isTranscribing || loadingModel) && (
              <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center rounded-2xl">
                <div className="flex items-center gap-3 px-6 py-3 bg-white rounded-2xl shadow-xl border border-slate-100">
                  <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                  <span className="text-[13px] font-bold text-slate-700 whitespace-nowrap">
                    {loadingModel ? 'Loading Local AI Model (70MB)...' : 'AI Transcribing...'}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-4">
             <div className="flex items-center gap-2">
               {isCapturing ? (
                 <button
                   onClick={stopCapture}
                   className="flex items-center gap-3 bg-rose-500 hover:bg-rose-600 text-white font-bold px-7 py-3.5 rounded-2xl transition-all shadow-lg shadow-rose-200 active:scale-95"
                 >
                   <StopCircle className="w-5 h-5" />
                   End Session
                 </button>
               ) : (
                 <button
                   onClick={startCapture}
                   disabled={loadingModel}
                   className={`flex items-center gap-3 font-bold px-7 py-3.5 rounded-2xl transition-all shadow-lg active:scale-95 ${loadingModel ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200'}`}
                 >
                   <Mic className="w-5 h-5" />
                   {loadingModel ? 'Preparing...' : 'Start Capture'}
                 </button>
               )}
             </div>

             <div className="flex items-center gap-2">
               {transcript && (
                 <>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(transcript);
                    }}
                    className="p-3.5 bg-white hover:bg-slate-50 text-slate-500 rounded-2xl transition-all border border-slate-200 shadow-sm"
                    title="Copy Text"
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
                    className="flex items-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-7 py-3.5 rounded-2xl transition-all shadow-lg shadow-emerald-200"
                  >
                    <Plus className="w-5 h-5" />
                    Insert as Note
                  </button>
                 </>
               )}
             </div>
          </div>
          
          <div className="p-4 bg-slate-50 rounded-2xl text-[11px] text-slate-500 font-medium leading-relaxed border border-slate-100">
            <div className="flex items-center gap-2 text-slate-900 font-bold mb-1">
              <Settings2 className="w-3.5 h-3.5 text-indigo-500" />
              Recording Instructions
            </div>
            To capture system sound (Spotify, Teams, etc.), select <span className="text-indigo-600 font-bold">"Entire Screen"</span> or <span className="text-indigo-600 font-bold">"Window"</span> and ensure you check <span className="text-indigo-600 font-bold">"Share system audio"</span> in the browser prompt.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioCaptureModal;
