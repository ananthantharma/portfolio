import React, { useState, useRef, useEffect } from 'react';
import { X, Mic, StopCircle, Radio, Save, Trash2, Settings2, Loader2 } from 'lucide-react';
// @ts-ignore
import { Mp3Encoder } from 'lamejs';

interface AudioRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AudioRecorderModal: React.FC<AudioRecorderModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  const [isCapturing, setIsCapturing] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCapture();
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isCapturing) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [isCapturing]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  async function startCapture() {
    try {
      setError(null);
      setRecordedBlob(null);
      setRecordingTime(0);
      setIsConverting(false);
      audioChunksRef.current = [];

      // Request screen stream to capture system audio if needed
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: {
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
        }
      } as any);

      const audioTrack = screenStream.getAudioTracks()[0];
      if (!audioTrack) {
        screenStream.getTracks().forEach(t => t.stop());
        setError("Make sure to check the 'Share System Audio' box in the window picker!");
        return;
      }

      // Stop video track since we only want audio
      screenStream.getVideoTracks().forEach(track => track.stop());
      const onlyAudioStream = new MediaStream([audioTrack]);
      streamRef.current = onlyAudioStream;

      // We still record as webm/opus initially as it's the most reliable browser format
      const mediaRecorder = new MediaRecorder(onlyAudioStream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const webmBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Convert to MP3
        setIsConverting(true);
        try {
            const mp3Blob = await convertToMp3(webmBlob);
            setRecordedBlob(mp3Blob);
        } catch (err: any) {
            console.error("MP3 Conversion failed", err);
            setError("MP3 conversion failed. Saving as fallback WebM.");
            setRecordedBlob(webmBlob);
        } finally {
            setIsConverting(false);
        }
      };

      mediaRecorder.start();
      setIsCapturing(true);

    } catch (err: any) {
      setError(err.message || "Capture failed");
    }
  }

  // Pure JS MP3 Encoding logic
  async function convertToMp3(webmBlob: Blob): Promise<Blob> {
    const arrayBuffer = await webmBlob.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    const channels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const kbps = 128;
    const mp3encoder = new Mp3Encoder(channels, sampleRate, kbps);
    const mp3Data: any[] = [];
    
    const sampleBlockSize = 1152;
    const leftChannel = audioBuffer.getChannelData(0);
    const rightChannel = channels > 1 ? audioBuffer.getChannelData(1) : leftChannel;
    
    // Helper to convert float32 to int16
    const floatTo16BitPCM = (input: Float32Array) => {
        const output = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return output;
    };
    
    const leftInt16 = floatTo16BitPCM(leftChannel);
    const rightInt16 = channels > 1 ? floatTo16BitPCM(rightChannel) : leftInt16;
    
    for (let i = 0; i < leftInt16.length; i += sampleBlockSize) {
        const leftChunk = leftInt16.subarray(i, i + sampleBlockSize);
        const rightChunk = rightInt16.subarray(i, i + sampleBlockSize);
        const mp3buf = mp3encoder.encodeBuffer(leftChunk, rightChunk);
        if (mp3buf.length > 0) {
            mp3Data.push(mp3buf);
        }
    }
    
    const endPart = mp3encoder.flush();
    if (endPart.length > 0) {
        mp3Data.push(endPart);
    }
    
    return new Blob(mp3Data, { type: 'audio/mp3' });
  }

  function stopCapture() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }

  async function saveAudioLocally() {
    if (!recordedBlob) return;

    try {
      const isMp3 = recordedBlob.type === 'audio/mp3';
      const extension = isMp3 ? 'mp3' : 'webm';
      const mimeType = isMp3 ? 'audio/mp3' : 'audio/webm';

      // Use File System Access API if available
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: `recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${extension}`,
            types: [{
              description: 'Audio File',
              accept: { [mimeType]: [`.${extension}`] },
            }],
          });
          const writable = await handle.createWritable();
          await writable.write(recordedBlob);
          await writable.close();
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') return;
          console.error("File Picker failed, falling back to download", err);
        }
      }

      // Fallback: standard download
      const url = URL.createObjectURL(recordedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError("Failed to save audio: " + err.message);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300 border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isCapturing ? 'bg-red-50 text-red-500 animate-pulse ring-2 ring-red-100' : 'bg-slate-50 text-slate-500'}`}>
              {isCapturing ? <Radio className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">Audio Recorder</h2>
              <p className="text-xs text-gray-500 font-medium">Capture system audio as MP3</p>
            </div>
          </div>
          
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 flex flex-col items-center justify-center min-h-[300px]">
          {error && (
            <div className="w-full p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm flex items-center gap-3">
              <span className="font-bold whitespace-nowrap">Error:</span> {error}
            </div>
          )}

          <div className="relative flex flex-col items-center justify-center space-y-6">
            <div className={`w-40 h-40 rounded-full flex flex-col items-center justify-center transition-all duration-500 ${isCapturing ? 'bg-red-50 scale-110 shadow-inner' : isConverting ? 'bg-indigo-50 border-4 border-indigo-100 border-t-indigo-500 animate-spin-slow' : 'bg-slate-50'}`}>
              {!isConverting ? (
                <>
                  <div className={`text-3xl font-mono font-bold tracking-tighter ${isCapturing ? 'text-red-600' : 'text-slate-400'}`}>
                    {formatTime(recordingTime)}
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">
                    {isCapturing ? 'Recording' : 'Standby'}
                  </p>
                </>
              ) : (
                <div className="flex flex-col items-center gap-2 animate-none">
                   <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                   <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">Encoding MP3</p>
                </div>
              )}
            </div>

            {isCapturing && (
              <div className="flex gap-1 justify-center items-end h-8">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 bg-red-400 rounded-full animate-bounce"
                    style={{
                      height: `${Math.random() * 100}%`,
                      animationDuration: `${0.5 + Math.random()}s`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="w-full flex flex-col items-center gap-4">
            {!recordedBlob ? (
              isCapturing ? (
                <button
                  onClick={stopCapture}
                  className="group flex items-center gap-4 bg-rose-500 hover:bg-rose-600 text-white font-bold px-10 py-5 rounded-2xl transition-all shadow-xl shadow-rose-200 active:scale-95"
                >
                  <StopCircle className="w-6 h-6 animate-pulse" />
                  <span className="text-lg">Stop Recording</span>
                </button>
              ) : (
                <button
                  onClick={startCapture}
                  disabled={isConverting}
                  className="group flex items-center gap-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-10 py-5 rounded-2xl transition-all shadow-xl shadow-indigo-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Mic className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  <span className="text-lg">Start Recording</span>
                </button>
              )
            ) : (
              <div className="w-full flex flex-col gap-3">
                <button
                  onClick={saveAudioLocally}
                  disabled={isConverting}
                  className="w-full flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-8 py-4 rounded-2xl transition-all shadow-lg shadow-emerald-200 active:scale-95 disabled:opacity-50"
                >
                  {isConverting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  {isConverting ? 'Encoding to MP3...' : 'Download MP3 Recording'}
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                        setRecordedBlob(null);
                        setRecordingTime(0);
                        setIsConverting(false);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-6 py-4 rounded-2xl transition-all active:scale-95"
                  >
                    <Trash2 className="w-4 h-4" />
                    Discard
                  </button>
                  <button
                    onClick={startCapture}
                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold px-6 py-4 rounded-2xl transition-all active:scale-95"
                  >
                    <Mic className="w-4 h-4" />
                    Record New
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="w-full p-5 bg-slate-50 rounded-2xl text-[11px] text-slate-500 font-medium leading-relaxed border border-slate-100">
            <div className="flex items-center gap-2 text-slate-900 font-bold mb-2 uppercase tracking-wider">
              <Settings2 className="w-3.5 h-3.5 text-indigo-500" />
              Recording Instructions
            </div>
            To capture system sound (Spotify, YouTube, Teams, etc.), select <span className="text-indigo-600 font-bold">"Entire Screen"</span> and ensure you check <span className="text-indigo-600 font-bold">"Share system audio"</span> in the browser prompt. The recording will be automatically converted to <span className="text-indigo-600 font-bold">MP3 format</span> after you stop.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioRecorderModal;


