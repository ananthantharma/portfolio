import {Mp3Encoder} from '@breezystack/lamejs';
import {
  ChevronsRight,
  Loader2,
  Maximize2,
  Mic,
  Minimize2,
  Monitor,
  Pause,
  Play,
  Radio,
  Save,
  Settings2,
  StopCircle,
  Trash2,
  X,
} from 'lucide-react';
import React, {useCallback, useEffect, useRef, useState} from 'react';

interface AudioRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Re-open the modal (used by the floating pill while minimized) */
  onOpen?: () => void;
}

type CaptureMode = 'both' | 'system' | 'mic';

const SAMPLE_RATE = 44100;
const KBPS = 128;
const MP3_BLOCK = 1152; // lamejs requires multiples of 1152 samples

const MODE_OPTIONS: Array<{id: CaptureMode; label: string; hint: string}> = [
  {id: 'both', label: 'Everything', hint: 'System audio + microphone'},
  {id: 'system', label: 'System', hint: 'What your computer plays'},
  {id: 'mic', label: 'Microphone', hint: 'Only your voice'},
];

function formatTime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const AudioRecorderModal: React.FC<AudioRecorderModalProps> = ({isOpen, onClose, onOpen}) => {
  const [mode, setMode] = useState<CaptureMode>('both');
  const [isCapturing, setIsCapturing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [encodedSize, setEncodedSize] = useState(0);
  const [level, setLevel] = useState(0); // 0..1 live input level
  const [error, setError] = useState<string | null>(null);

  // ── Audio pipeline refs ───────────────────────────────────────────────────
  const streamsRef = useRef<MediaStream[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  // ── Streaming MP3 encoder state (encodes WHILE recording, so memory stays
  //    tiny and long recordings never blow up) ───────────────────────────────
  const encoderRef = useRef<Mp3Encoder | null>(null);
  const mp3PartsRef = useRef<Uint8Array[]>([]);
  const leftoverRef = useRef<Int16Array>(new Int16Array(0));
  const encodedBytesRef = useRef(0);
  const levelRef = useRef(0);
  const pausedRef = useRef(false);
  const capturingRef = useRef(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const meterRef = useRef<NodeJS.Timeout | null>(null);

  // Keep preview URL in sync with the recorded blob
  useEffect(() => {
    if (!recordedBlob) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(recordedBlob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [recordedBlob]);

  // Timer + size readout (pause-aware)
  useEffect(() => {
    if (isCapturing && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
        setEncodedSize(encodedBytesRef.current);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isCapturing, isPaused]);

  // Live level meter (~10fps while recording)
  useEffect(() => {
    if (isCapturing) {
      meterRef.current = setInterval(() => setLevel(levelRef.current), 100);
    } else if (meterRef.current) {
      clearInterval(meterRef.current);
      meterRef.current = null;
      setLevel(0);
    }
    return () => {
      if (meterRef.current) clearInterval(meterRef.current);
    };
  }, [isCapturing]);

  const teardownPipeline = useCallback(async () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (audioContextRef.current) {
      await audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    streamsRef.current.forEach(stream => stream.getTracks().forEach(t => t.stop()));
    streamsRef.current = [];
  }, []);

  const stopCapture = useCallback(async () => {
    if (!capturingRef.current) return;
    capturingRef.current = false;

    await teardownPipeline();
    setIsCapturing(false);
    setIsPaused(false);
    pausedRef.current = false;

    // Finalize the MP3: encode any leftover samples, then flush the encoder.
    try {
      const encoder = encoderRef.current;
      if (encoder) {
        const leftover = leftoverRef.current;
        if (leftover.length > 0) {
          // Pad the final partial block with silence
          const padded = new Int16Array(MP3_BLOCK);
          padded.set(leftover.subarray(0, Math.min(leftover.length, MP3_BLOCK)));
          const enc = encoder.encodeBuffer(padded);
          if (enc.length > 0) {
            mp3PartsRef.current.push(new Uint8Array(enc.buffer as ArrayBuffer, enc.byteOffset, enc.length).slice());
          }
        }
        const flushed = encoder.flush();
        if (flushed.length > 0) {
          mp3PartsRef.current.push(
            new Uint8Array(flushed.buffer as ArrayBuffer, flushed.byteOffset, flushed.length).slice(),
          );
        }
      }
      if (mp3PartsRef.current.length > 0) {
        setRecordedBlob(new Blob(mp3PartsRef.current as BlobPart[], {type: 'audio/mpeg'}));
      }
    } catch (err) {
      console.error('MP3 finalize failed', err);
      setError('Failed to finalize the MP3: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      encoderRef.current = null;
      mp3PartsRef.current = [];
      leftoverRef.current = new Int16Array(0);
      encodedBytesRef.current = 0;
    }
  }, [teardownPipeline]);

  const startCapture = useCallback(
    async (captureMode?: CaptureMode) => {
      const activeMode = captureMode ?? mode;
      if (capturingRef.current || isStarting) return;
      setIsStarting(true);
      try {
        setError(null);
        setRecordedBlob(null);
        setRecordingTime(0);
        setEncodedSize(0);

        const streams: MediaStream[] = [];

        // 1. System audio ("out") via screen share
        let systemTrack: MediaStreamTrack | null = null;
        if (activeMode === 'system' || activeMode === 'both') {
          const screenStream = await navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: {echoCancellation: false, noiseSuppression: false, autoGainControl: false},
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any);
          systemTrack = screenStream.getAudioTracks()[0] || null;
          if (!systemTrack) {
            screenStream.getTracks().forEach(t => t.stop());
            setError(
              'No system audio was shared. Pick "Entire Screen" and tick "Share system audio" in the browser prompt' +
                (activeMode === 'both' ? ', or switch to Microphone-only mode.' : '.'),
            );
            return;
          }
          // We only need the audio — drop the video track
          screenStream.getVideoTracks().forEach(t => t.stop());
          const sysStream = new MediaStream([systemTrack]);
          streams.push(sysStream);
          // If the user clicks the browser's own "Stop sharing" button, finish gracefully
          systemTrack.addEventListener('ended', () => {
            stopCapture();
            onOpen?.();
          });
        }

        // 2. Microphone ("in")
        if (activeMode === 'mic' || activeMode === 'both') {
          try {
            const micStream = await navigator.mediaDevices.getUserMedia({
              audio: {echoCancellation: true, noiseSuppression: true, autoGainControl: true},
            });
            streams.push(micStream);
          } catch (micErr) {
            // In "both" mode keep going with system audio only; in mic mode it's fatal
            if (activeMode === 'mic') {
              streams.forEach(s => s.getTracks().forEach(t => t.stop()));
              setError('Microphone access was denied. Allow the mic permission in your browser and try again.');
              return;
            }
            setError('Mic unavailable — recording system audio only.');
          }
        }

        if (streams.length === 0) {
          setError('No audio source available.');
          return;
        }
        streamsRef.current = streams;

        // 3. Mix all sources into one mono pipeline and encode MP3 on the fly
        const audioContext = new AudioContext({sampleRate: SAMPLE_RATE});
        audioContextRef.current = audioContext;

        const processor = audioContext.createScriptProcessor(4096, 1, 1);
        processorRef.current = processor;

        // Multiple sources connected to one node are summed automatically
        streams.forEach(stream => {
          audioContext.createMediaStreamSource(stream).connect(processor);
        });

        encoderRef.current = new Mp3Encoder(1, SAMPLE_RATE, KBPS);
        mp3PartsRef.current = [];
        leftoverRef.current = new Int16Array(0);
        encodedBytesRef.current = 0;

        processor.onaudioprocess = e => {
          if (pausedRef.current || !capturingRef.current) return;
          const input = e.inputBuffer.getChannelData(0);

          // Live level (RMS)
          let sum = 0;
          for (let i = 0; i < input.length; i += 8) sum += input[i] * input[i];
          levelRef.current = Math.min(1, Math.sqrt(sum / (input.length / 8)) * 3);

          // Float32 → Int16, prepended with leftover samples from the last block
          const prev = leftoverRef.current;
          const int16 = new Int16Array(prev.length + input.length);
          int16.set(prev, 0);
          for (let i = 0; i < input.length; i++) {
            const s = Math.max(-1, Math.min(1, input[i]));
            int16[prev.length + i] = s < 0 ? s * 0x8000 : s * 0x7fff;
          }

          // Encode complete 1152-sample blocks immediately; keep the remainder
          const encoder = encoderRef.current;
          if (!encoder) return;
          let offset = 0;
          for (; offset + MP3_BLOCK <= int16.length; offset += MP3_BLOCK) {
            const enc = encoder.encodeBuffer(int16.subarray(offset, offset + MP3_BLOCK));
            if (enc.length > 0) {
              mp3PartsRef.current.push(new Uint8Array(enc.buffer as ArrayBuffer, enc.byteOffset, enc.length).slice());
              encodedBytesRef.current += enc.length;
            }
          }
          leftoverRef.current = int16.slice(offset);
        };

        // ScriptProcessor needs a destination to fire; output buffer stays silent
        processor.connect(audioContext.destination);

        capturingRef.current = true;
        pausedRef.current = false;
        setIsPaused(false);
        setIsCapturing(true);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        await teardownPipeline();
        if (err?.name === 'NotAllowedError') {
          setError('Permission denied. Choose a screen/window and allow audio sharing to record.');
        } else {
          setError(err?.message || 'Capture failed');
        }
      } finally {
        setIsStarting(false);
      }
    },
    [mode, isStarting, stopCapture, teardownPipeline, onOpen],
  );

  const togglePause = useCallback(() => {
    if (!capturingRef.current) return;
    pausedRef.current = !pausedRef.current;
    setIsPaused(pausedRef.current);
  }, []);

  // ── Global hotkey: Ctrl+Alt+R — start instantly from anywhere, or stop ────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        if (capturingRef.current) {
          stopCapture();
          onOpen?.();
        } else {
          onOpen?.();
          startCapture();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [startCapture, stopCapture, onOpen]);

  // Cleanup on unmount only — closing the modal keeps the recording alive
  useEffect(() => {
    return () => {
      capturingRef.current = false;
      teardownPipeline();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveAudioLocally() {
    if (!recordedBlob) return;
    try {
      const filename = `recording-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.mp3`;

      if ('showSaveFilePicker' in window) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [{description: 'MP3 Audio', accept: {'audio/mpeg': ['.mp3']}}],
          });
          const writable = await handle.createWritable();
          await writable.write(recordedBlob);
          await writable.close();
          return;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
          if (err.name === 'AbortError') return;
        }
      }

      const url = URL.createObjectURL(recordedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError('Failed to save: ' + err.message);
    }
  }

  // ── Floating pill — recording continues while the modal is minimized ──────
  if (!isOpen) {
    if (!isCapturing && !recordedBlob) return null;
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999]">
        <div className="flex items-center gap-3 rounded-full bg-slate-900 pl-4 pr-2 py-2 shadow-2xl shadow-slate-900/30 border border-white/10">
          {isCapturing ? (
            <>
              <span className={`h-2.5 w-2.5 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-rose-500 animate-pulse'}`} />
              <span className="font-mono text-[13px] font-semibold text-white tabular-nums">
                {formatTime(recordingTime)}
              </span>
              <span className="text-[10px] text-white/40 tabular-nums hidden sm:inline">{formatBytes(encodedSize)}</span>
              <button
                className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
                onClick={togglePause}
                title={isPaused ? 'Resume' : 'Pause'}>
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </button>
              <button
                className="rounded-full p-1.5 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300 transition-colors"
                onClick={() => {
                  stopCapture();
                  onOpen?.();
                }}
                title="Stop recording">
                <StopCircle className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <Radio className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-[12px] font-medium text-white/80">Recording ready</span>
            </>
          )}
          <button
            className="rounded-full p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            onClick={onOpen}
            title="Open recorder">
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
                isCapturing
                  ? isPaused
                    ? 'bg-amber-50 text-amber-500 ring-2 ring-amber-100'
                    : 'bg-rose-50 text-rose-500 animate-pulse ring-2 ring-rose-100'
                  : 'bg-indigo-50 text-indigo-500'
              }`}>
              {isCapturing ? <Radio className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-slate-900 leading-tight">Audio Recorder</h2>
              <p className="text-[10.5px] text-slate-400 font-medium">
                {isCapturing
                  ? isPaused
                    ? 'Paused'
                    : 'Recording — minimizing keeps it going'
                  : 'System audio + mic → MP3 · Ctrl+Alt+R'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isCapturing && (
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
                title="Minimize — keeps recording">
                <Minimize2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
              title={isCapturing ? 'Minimize — keeps recording' : 'Close'}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 flex flex-col gap-4">
          {error && (
            <div className="w-full px-3.5 py-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-[12px] leading-relaxed flex items-start justify-between gap-2">
              <span>{error}</span>
              <button className="text-rose-300 hover:text-rose-500 flex-shrink-0" onClick={() => setError(null)}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Source picker */}
          {!isCapturing && !recordedBlob && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">What to record</p>
              <div className="grid grid-cols-3 gap-1.5">
                {MODE_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setMode(opt.id)}
                    title={opt.hint}
                    className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[11.5px] font-semibold transition-all border ${
                      mode === opt.id
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 ring-1 ring-indigo-100'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
                    }`}>
                    {opt.id === 'mic' ? (
                      <Mic className="w-3.5 h-3.5" />
                    ) : opt.id === 'system' ? (
                      <Monitor className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronsRight className="w-3.5 h-3.5" />
                    )}
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-[10.5px] text-slate-400 mt-1.5">{MODE_OPTIONS.find(o => o.id === mode)?.hint}</p>
            </div>
          )}

          {/* Status display */}
          <div className="flex items-center justify-center gap-5 py-3">
            <div className="text-center">
              <div
                className={`text-4xl font-mono font-bold tracking-tight tabular-nums ${
                  isCapturing ? (isPaused ? 'text-amber-500' : 'text-rose-600') : 'text-slate-300'
                }`}>
                {formatTime(recordingTime)}
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">
                {isCapturing
                  ? isPaused
                    ? 'Paused'
                    : `Recording · ${formatBytes(encodedSize)}`
                  : recordedBlob
                  ? `Done · ${formatBytes(recordedBlob.size)}`
                  : 'Ready'}
              </p>
            </div>

            {/* Live level meter */}
            {isCapturing && (
              <div className="flex gap-[3px] items-end h-10">
                {[0.5, 0.75, 1, 0.85, 0.6].map((scale, i) => (
                  <div
                    key={i}
                    className={`w-1.5 rounded-full transition-all duration-100 ${
                      isPaused ? 'bg-amber-200' : 'bg-rose-400'
                    }`}
                    style={{height: `${Math.max(8, level * scale * 100)}%`}}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Controls */}
          {!recordedBlob ? (
            isCapturing ? (
              <div className="flex gap-2">
                <button
                  onClick={togglePause}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98]">
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  {isPaused ? 'Resume' : 'Pause'}
                </button>
                <button
                  onClick={stopCapture}
                  className="flex-[2] flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-bold px-4 py-3.5 rounded-2xl transition-all shadow-lg shadow-rose-200 active:scale-[0.98]">
                  <StopCircle className="w-5 h-5" />
                  Stop & Finish
                </button>
              </div>
            ) : (
              <button
                onClick={() => startCapture()}
                disabled={isStarting}
                className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-4 rounded-2xl transition-all shadow-lg shadow-indigo-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed">
                {isStarting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mic className="w-5 h-5" />}
                {isStarting ? 'Requesting access…' : 'Start Recording'}
              </button>
            )
          ) : (
            <div className="flex flex-col gap-2.5">
              {/* Playback preview before saving */}
              {previewUrl && <audio className="w-full h-10" controls src={previewUrl} />}
              <button
                onClick={saveAudioLocally}
                className="w-full flex items-center justify-center gap-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-6 py-3.5 rounded-2xl transition-all shadow-lg shadow-emerald-200 active:scale-[0.98]">
                <Save className="w-4 h-4" />
                Save MP3 ({formatBytes(recordedBlob.size)})
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setRecordedBlob(null);
                    setRecordingTime(0);
                    setError(null);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold px-4 py-3 rounded-2xl transition-all active:scale-[0.98] text-[13px]">
                  <Trash2 className="w-3.5 h-3.5" />
                  Discard
                </button>
                <button
                  onClick={() => startCapture()}
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold px-4 py-3 rounded-2xl transition-all active:scale-[0.98] text-[13px]">
                  <Mic className="w-3.5 h-3.5" />
                  Record New
                </button>
              </div>
            </div>
          )}

          {/* Help */}
          {!isCapturing && !recordedBlob && (
            <div className="w-full px-4 py-3 bg-slate-50 rounded-xl text-[10.5px] text-slate-500 leading-relaxed border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-700 font-bold mb-1 uppercase tracking-wider text-[9.5px]">
                <Settings2 className="w-3 h-3 text-indigo-500" />
                Tips
              </div>
              For system audio, pick <span className="font-semibold text-slate-700">Entire Screen</span> and tick{' '}
              <span className="font-semibold text-slate-700">Share system audio</span> in the browser prompt. Press{' '}
              <kbd className="px-1 py-0.5 bg-white border border-slate-200 rounded text-[9.5px] font-mono">
                Ctrl+Alt+R
              </kbd>{' '}
              anywhere to start/stop instantly. The MP3 is encoded live while recording, so even hours-long sessions
              stay safe — and minimizing this window keeps the recording running.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AudioRecorderModal;
