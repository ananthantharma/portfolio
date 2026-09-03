/* eslint-disable react-memo/require-memo, react-memo/require-usememo */
'use client';

import {AlertTriangle, Loader2, RotateCw, Video, VideoOff, X} from 'lucide-react';
import type {MqttClient} from 'mqtt';
import React, {useEffect, useRef, useState} from 'react';

interface CameraModalProps {
  onClose: () => void;
}

type Phase = 'connecting' | 'waiting' | 'live' | 'camera-offline' | 'error';

interface Creds {
  url: string;
  username: string;
  password: string;
  topicBase: string;
}

export default function CameraModal({onClose}: CameraModalProps) {
  const [phase, setPhase] = useState<Phase>('connecting');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [attempt, setAttempt] = useState(0);

  const imgRef = useRef<HTMLImageElement>(null);
  const objectUrlRef = useRef<string | null>(null);
  const cmdTopicRef = useRef<string | null>(null);
  const frameStampsRef = useRef<number[]>([]);
  const gotFrameRef = useRef(false);

  // ── Esc to close ────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // ── Broker connection + frame pump ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    let client: MqttClient | undefined;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let fpsTimer: ReturnType<typeof setInterval> | undefined;

    setPhase('connecting');
    setErrorMsg(null);
    setFps(0);
    gotFrameRef.current = false;
    frameStampsRef.current = [];

    const fail = (msg: string) => {
      if (cancelled) return;
      setErrorMsg(msg);
      setPhase('error');
    };

    (async () => {
      let creds: Creds;
      try {
        const res = await fetch('/api/notes/camera/mqtt-creds', {cache: 'no-store'});
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error || `Config request failed (${res.status})`);
        creds = body as Creds;
      } catch (err) {
        fail(err instanceof Error ? err.message : 'Failed to load camera config');
        return;
      }
      if (cancelled) return;

      const tCmd = `${creds.topicBase}/cmd`;
      const tFrame = `${creds.topicBase}/frame`;
      const tStatus = `${creds.topicBase}/status`;
      cmdTopicRef.current = tCmd;

      let mqtt;
      try {
        // Import the prebuilt, self-contained browser bundle directly so no
        // compilation pass ever pulls in mqtt's Node build (ws / bufferutil).
        mqtt = (await import('mqtt/dist/mqtt.esm')).default;
      } catch {
        fail('Could not load the MQTT client library');
        return;
      }
      if (cancelled) return;

      client = mqtt.connect(creds.url, {
        username: creds.username,
        password: creds.password,
        clientId: 'notes-web-' + Math.random().toString(16).slice(2, 10),
        protocolVersion: 4,
        clean: true,
        reconnectPeriod: 3000,
        connectTimeout: 10000,
      });

      const sendLive = () => {
        if (client?.connected) client.publish(tCmd, 'live', {qos: 0});
      };

      client.on('connect', () => {
        if (cancelled) return;
        client?.subscribe([tFrame, tStatus], {qos: 0});
        sendLive();
        heartbeat = setInterval(sendLive, 10000);
        setPhase(prev => (prev === 'live' ? prev : 'waiting'));
      });

      client.on('reconnect', () => {
        if (!cancelled && !gotFrameRef.current) setPhase('connecting');
      });

      client.on('message', (topic, payload) => {
        if (cancelled) return;

        if (topic === tStatus) {
          const online = payload.toString() === 'online';
          if (!online && !gotFrameRef.current) setPhase('camera-offline');
          if (online) setPhase(prev => (prev === 'camera-offline' ? 'waiting' : prev));
          return;
        }

        if (topic === tFrame) {
          gotFrameRef.current = true;
          const blob = new Blob([payload], {type: 'image/jpeg'});
          const next = URL.createObjectURL(blob);
          if (imgRef.current) imgRef.current.src = next;
          if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = next;

          frameStampsRef.current.push(performance.now());
          setPhase('live');
        }
      });

      client.on('error', err => fail(err?.message || 'Broker connection error'));

      fpsTimer = setInterval(() => {
        const cutoff = performance.now() - 1000;
        frameStampsRef.current = frameStampsRef.current.filter(t => t >= cutoff);
        if (!cancelled) setFps(frameStampsRef.current.length);
      }, 500);
    })();

    return () => {
      cancelled = true;
      if (heartbeat) clearInterval(heartbeat);
      if (fpsTimer) clearInterval(fpsTimer);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      if (client) {
        try {
          if (client.connected && cmdTopicRef.current) client.publish(cmdTopicRef.current, 'stop', {qos: 0});
        } catch {
          /* best effort — the firmware also times out on its own */
        }
        client.end(true);
      }
    };
  }, [attempt]);

  const statusBar = (() => {
    switch (phase) {
      case 'connecting':
        return {icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, text: 'Connecting to broker…', tone: 'text-white/50'};
      case 'waiting':
        return {icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, text: 'Waiting for camera…', tone: 'text-amber-300/80'};
      case 'live':
        return {icon: <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400/60" />, text: `Live · ${fps} fps`, tone: 'text-emerald-300'};
      case 'camera-offline':
        return {icon: <VideoOff className="h-3.5 w-3.5" />, text: 'Camera is offline', tone: 'text-rose-300'};
      case 'error':
        return {icon: <AlertTriangle className="h-3.5 w-3.5" />, text: errorMsg || 'Error', tone: 'text-rose-300'};
    }
  })();

  return (
    <div
      className="fixed inset-0 z-[240] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="flex w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#12141d] shadow-float">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.07] px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-300">
              <Video className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-white">Camera</h2>
              <p className="text-[11px] text-white/35">ESP32-CAM live feed</p>
            </div>
          </div>
          <button
            className="rounded-lg p-2 text-white/30 transition-colors hover:bg-white/[0.08] hover:text-white"
            onClick={onClose}
            title="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Video surface */}
        <div className="relative aspect-[4/3] w-full bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="Camera feed"
            className={`h-full w-full object-contain transition-opacity ${phase === 'live' ? 'opacity-100' : 'opacity-0'}`}
            ref={imgRef}
          />

          {phase !== 'live' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
              {phase === 'error' || phase === 'camera-offline' ? (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
                    {phase === 'error' ? (
                      <AlertTriangle className="h-5 w-5 text-rose-400/70" />
                    ) : (
                      <VideoOff className="h-5 w-5 text-rose-400/70" />
                    )}
                  </div>
                  <div className="px-6">
                    <p className="text-[13px] font-semibold text-white/70">
                      {phase === 'error' ? 'Could not connect' : 'Camera is not online'}
                    </p>
                    <p className="mt-1 text-[11.5px] text-white/35">
                      {phase === 'error'
                        ? errorMsg
                        : 'The ESP32-CAM has not checked in. Check that it has power and Wi-Fi.'}
                    </p>
                  </div>
                  <button
                    className="mt-1 flex items-center gap-1.5 rounded-lg border border-violet-400/30 px-3 py-1.5 text-[12px] font-medium text-violet-300 transition-colors hover:bg-violet-500/10"
                    onClick={() => setAttempt(a => a + 1)}>
                    <RotateCw className="h-3.5 w-3.5" /> Retry
                  </button>
                </>
              ) : (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-violet-400/60" />
                  <p className="text-[12px] text-white/40">
                    {phase === 'connecting' ? 'Connecting…' : 'Waiting for the first frame…'}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Status footer */}
        <div className="flex shrink-0 items-center justify-between border-t border-white/[0.07] bg-white/[0.015] px-5 py-2.5">
          <span className={`flex items-center gap-2 text-[11.5px] font-medium ${statusBar?.tone}`}>
            {statusBar?.icon}
            <span className="truncate">{statusBar?.text}</span>
          </span>
          <span className="hidden text-[10.5px] text-white/25 sm:block">QVGA · streams only while this window is open</span>
        </div>
      </div>
    </div>
  );
}
