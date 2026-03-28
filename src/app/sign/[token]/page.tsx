'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {useParams} from 'next/navigation';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface SigningField {
  id: string;
  type: string;
  page: number;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  value: string | null;
}

interface SigningData {
  recipient: {
    id: string;
    name: string;
    email: string;
    status: string;
  };
  document: {
    id: string;
    title: string;
    pdf_url: string;
    status: string;
    message: string;
    owner_email: string;
  };
  fields: SigningField[];
}

export default function PublicSigningPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<SigningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentPage, _setCurrentPage] = useState(1);
  const [signatureModal, setSignatureModal] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Signature drawing
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [typedSig, setTypedSig] = useState('');
  const [sigMode, setSigMode] = useState<'draw' | 'type'>('draw');

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/signing/sign?token=${token}`);
      const result = await res.json();
      if (result.success) {
        setData(result.data);
        if (result.data.recipient.status === 'SIGNED') {
          setCompleted(true);
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to load document');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Canvas drawing handlers
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return {x: 0, y: 0};
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    setIsDrawing(true);
    const {x, y} = getCanvasCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    const {x, y} = getCanvasCoords(e);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDraw = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const applySignature = (fieldId: string) => {
    let sigData = '';

    if (sigMode === 'draw') {
      const canvas = canvasRef.current;
      if (!canvas) return;
      sigData = canvas.toDataURL('image/png');
    } else {
      // Generate typed signature as canvas
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 400;
      tempCanvas.height = 120;
      const ctx = tempCanvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = 'transparent';
      ctx.fillRect(0, 0, 400, 120);
      ctx.font = 'italic 36px "Georgia", serif';
      ctx.fillStyle = '#1a1a2e';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(typedSig || data?.recipient.name || '', 200, 60);
      sigData = tempCanvas.toDataURL('image/png');
    }

    setFieldValues(prev => ({...prev, [fieldId]: sigData}));
    setSignatureModal(null);
    setTypedSig('');
    clearCanvas();
  };

  const handleFieldClick = (field: SigningField) => {
    if (completed || field.value) return;

    if (field.type === 'SIGNATURE' || field.type === 'INITIALS') {
      setSignatureModal(field.id);
    } else if (field.type === 'DATE') {
      setFieldValues(prev => ({
        ...prev,
        [field.id]: new Date().toLocaleDateString('en-US', {month: 'long', day: 'numeric', year: 'numeric'}),
      }));
    } else if (field.type === 'TEXT') {
      const text = prompt('Enter text:');
      if (text) {
        setFieldValues(prev => ({...prev, [field.id]: text}));
      }
    }
  };

  const handleSubmit = async () => {
    if (!data) return;

    const unfilled = data.fields.filter(f => !f.value && !fieldValues[f.id]);
    if (unfilled.length > 0) {
      alert(`Please complete all ${unfilled.length} field(s) before signing`);
      return;
    }

    setSubmitting(true);
    try {
      const signatures = Object.entries(fieldValues).map(([field_id, value]) => ({
        field_id,
        value,
      }));

      const res = await fetch('/api/signing/sign', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({token, signatures}),
      });

      const result = await res.json();
      if (result.success) {
        setCompleted(true);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (err) {
      alert('Failed to submit signature');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Unable to Load</h2>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Document Signed!</h2>
          <p className="text-sm text-gray-500 mb-6">
            Thank you, {data?.recipient.name}. Your signature has been recorded for &ldquo;{data?.document.title}&rdquo;.
          </p>
          <p className="text-xs text-gray-400">You can close this page now.</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const filledCount = Object.keys(fieldValues).length + data.fields.filter(f => f.value).length;
  const totalFields = data.fields.length;
  const pageFields = data.fields.filter(f => f.page === currentPage);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <div>
              <h1 className="text-sm font-bold text-gray-900">{data.document.title}</h1>
              <p className="text-[10px] text-gray-400">
                Sent by {data.document.owner_email} • Signing as {data.recipient.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              {filledCount}/{totalFields} fields
            </span>
            <button
              onClick={handleSubmit}
              disabled={submitting || filledCount < totalFields}
              className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white text-sm font-semibold rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg shadow-emerald-200 disabled:opacity-40 disabled:cursor-not-allowed">
              {submitting ? 'Signing...' : 'Complete Signing'}
            </button>
          </div>
        </div>
      </div>

      {/* Message banner */}
      {data.document.message && (
        <div className="max-w-5xl mx-auto px-6 mt-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
            <p className="text-xs text-indigo-700">
              <span className="font-semibold">Message from sender:</span> {data.document.message}
            </p>
          </div>
        </div>
      )}

      {/* PDF + Fields */}
      <div className="max-w-5xl mx-auto px-6 py-8 flex justify-center">
        <div className="relative bg-white shadow-xl rounded-lg" style={{width: 816, minHeight: 1056}}>
          <iframe
            src={`${data.document.pdf_url}#page=${currentPage}`}
            className="w-full h-full absolute inset-0 rounded-lg"
            style={{minHeight: 1056}}
          />

          {/* Clickable fields */}
          {pageFields.map(field => {
            const hasValue = field.value || fieldValues[field.id];
            return (
              <div
                key={field.id}
                onClick={() => handleFieldClick(field)}
                className={`absolute rounded-lg border-2 flex items-center justify-center transition-all ${
                  hasValue
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : 'border-indigo-400 bg-indigo-50/30 border-dashed cursor-pointer hover:bg-indigo-50/60 animate-pulse'
                }`}
                style={{
                  left: field.pos_x,
                  top: field.pos_y,
                  width: field.width,
                  height: field.height,
                }}>
                {field.value ? (
                  <img src={field.value} alt="signed" className="max-w-full max-h-full object-contain p-1" />
                ) : fieldValues[field.id] ? (
                  typeof fieldValues[field.id] === 'string' && fieldValues[field.id].startsWith('data:') ? (
                    <img src={fieldValues[field.id]} alt="signature" className="max-w-full max-h-full object-contain p-1" />
                  ) : (
                    <span className="text-xs font-medium text-emerald-700 px-2 truncate">
                      {fieldValues[field.id]}
                    </span>
                  )
                ) : (
                  <div className="text-center pointer-events-none select-none">
                    <p className="text-[10px] font-bold text-indigo-500">
                      Click to {field.type === 'SIGNATURE' ? 'sign' : field.type === 'DATE' ? 'add date' : 'fill'}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Signature Modal */}
      {signatureModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">Add Your Signature</h3>
              <button
                onClick={() => { setSignatureModal(null); clearCanvas(); setTypedSig(''); }}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Mode tabs */}
            <div className="flex gap-1 bg-gray-50 mx-6 mt-4 p-1 rounded-xl">
              {(['draw', 'type'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setSigMode(mode)}
                  className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                    sigMode === mode
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}>
                  {mode === 'draw' ? '✏️ Draw' : '⌨️ Type'}
                </button>
              ))}
            </div>

            <div className="p-6">
              {sigMode === 'draw' ? (
                <div>
                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={150}
                    className="w-full border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 cursor-crosshair"
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={stopDraw}
                    onMouseLeave={stopDraw}
                  />
                  <button
                    onClick={clearCanvas}
                    className="mt-2 text-xs text-gray-500 hover:text-gray-700 transition-colors">
                    Clear
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    value={typedSig}
                    onChange={e => setTypedSig(e.target.value)}
                    placeholder={data.recipient.name}
                    className="w-full px-4 py-4 text-2xl italic font-serif text-center border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 focus:outline-none focus:border-indigo-300"
                  />
                  <p className="text-center text-[10px] text-gray-400 mt-2">
                    Preview: <span className="italic text-lg font-serif text-gray-700">{typedSig || data.recipient.name}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => { setSignatureModal(null); clearCanvas(); setTypedSig(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                Cancel
              </button>
              <button
                onClick={() => applySignature(signatureModal)}
                className="px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-violet-600 rounded-lg hover:from-indigo-600 hover:to-violet-700 transition-all shadow-lg shadow-indigo-200">
                Apply Signature
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
