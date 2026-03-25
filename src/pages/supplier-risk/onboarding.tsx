import Head from 'next/head';
import Link from 'next/link';
import {useRouter} from 'next/router';
import {useSession} from 'next-auth/react';
import React, {useCallback, useEffect, useState} from 'react';

import {SupplierRiskLayout} from '../../components/SupplierRisk/SupplierRiskLayout';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupplierDoc = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QuestionnaireDoc = any;

const STATUS_CONFIG: Record<string, {badge: string; label: string}> = {
  Pending: {badge: 'bg-gray-100 text-gray-600', label: 'Pending'},
  Sent: {badge: 'bg-blue-100 text-blue-700', label: 'Sent'},
  'In Progress': {badge: 'bg-yellow-100 text-yellow-700', label: 'In Progress'},
  Completed: {badge: 'bg-emerald-100 text-emerald-700', label: 'Completed'},
  Overdue: {badge: 'bg-red-100 text-red-700', label: 'Overdue'},
};

const OnboardingPage = () => {
  const {data: session, status} = useSession();
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<SupplierDoc[]>([]);
  const [questionnaires, setQuestionnaires] = useState<QuestionnaireDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [sending, setSending] = useState(false);
  const [activeQ, setActiveQ] = useState<QuestionnaireDoc | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, qRes] = await Promise.all([
        fetch('/api/supplier-risk/suppliers?status=Onboarding'),
        fetch('/api/supplier-risk/questionnaires'),
      ]);
      if (sRes.ok) setSuppliers(await sRes.json());
      if (qRes.ok) setQuestionnaires(await qRes.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
    else if (status === 'authenticated') fetchData();
  }, [status, router, fetchData]);

  const handleSendQuestionnaire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    setSending(true);
    try {
      await fetch('/api/supplier-risk/questionnaires', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({supplierId: selectedSupplier, dueDate}),
      });
      setSelectedSupplier('');
      setDueDate('');
      await fetchData();
    } finally {
      setSending(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    if (!activeQ) return;
    setActiveQ({
      ...activeQ,
      answers: activeQ.answers.map((a: {questionId: string; answer: string}) =>
        a.questionId === questionId ? {...a, answer} : a,
      ),
    });
  };

  const handleSubmitAnswers = async () => {
    if (!activeQ) return;
    await fetch('/api/supplier-risk/questionnaires', {
      method: 'PUT',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        questionnaireId: activeQ._id,
        answers: activeQ.answers,
        status: 'Completed',
      }),
    });
    setActiveQ(null);
    await fetchData();
  };

  if (status === 'loading') return null;
  if (!session) return null;

  return (
    <>
      <Head>
        <title>Supplier Onboarding — Supplier Risk Platform</title>
      </Head>
      <SupplierRiskLayout title="Supplier Onboarding & Due Diligence">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Send questionnaire */}
          <div className="space-y-4 lg:col-span-1">
            <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="mb-4 font-semibold text-gray-700">Send Risk Questionnaire</h3>
              <form className="space-y-3" onSubmit={handleSendQuestionnaire}>
                <div>
                  <label className="label">Supplier (Onboarding status)</label>
                  <select
                    className="input"
                    value={selectedSupplier}
                    onChange={e => setSelectedSupplier(e.target.value)}
                    required>
                    <option value="">Select supplier...</option>
                    {suppliers.map(s => (
                      <option key={s._id} value={s._id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {suppliers.length === 0 && (
                    <p className="mt-1 text-xs text-gray-400">
                      No suppliers with &quot;Onboarding&quot; status.{' '}
                      <Link href="/supplier-risk/suppliers" className="text-blue-600 hover:underline">
                        Add one →
                      </Link>
                    </p>
                  )}
                </div>
                <div>
                  <label className="label">Due Date</label>
                  <input
                    type="date"
                    className="input"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn-primary w-full" disabled={sending || !selectedSupplier}>
                  {sending ? 'Sending...' : '📧 Send Questionnaire'}
                </button>
              </form>
            </div>

            {/* Info box */}
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
              <p className="font-semibold">About Due Diligence Questionnaires</p>
              <ul className="mt-2 space-y-1 text-blue-700">
                <li>• 13 standard questions across 4 risk dimensions</li>
                <li>• Financial, Operational, Compliance & ESG</li>
                <li>• Responses used to calibrate supplier risk scores</li>
                <li>• All data verified against 3rd-party sources</li>
              </ul>
            </div>
          </div>

          {/* Right: Questionnaire list */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="flex h-40 items-center justify-center text-gray-400">Loading...</div>
            ) : (
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-700">Questionnaire Tracker</h3>
                {questionnaires.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center text-sm text-gray-400 shadow-sm">
                    No questionnaires yet. Send one to a supplier in onboarding status.
                  </div>
                ) : (
                  questionnaires.map((q: QuestionnaireDoc) => {
                    const cfg = STATUS_CONFIG[q.status] || STATUS_CONFIG['Pending'];
                    const answered = q.answers?.filter((a: {answer: string}) => a.answer?.trim()).length ?? 0;
                    const total = q.answers?.length ?? 0;
                    const pct = total > 0 ? Math.round((answered / total) * 100) : 0;
                    return (
                      <div key={q._id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-800">{q.supplierName}</p>
                            <p className="text-xs text-gray-400">
                              Sent {new Date(q.createdAt).toLocaleDateString()}
                              {q.dueDate && ` · Due ${new Date(q.dueDate).toLocaleDateString()}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.badge}`}>
                              {cfg.label}
                            </span>
                            {q.status !== 'Completed' && (
                              <button
                                className="btn-secondary text-xs"
                                onClick={() => setActiveQ({...q})}>
                                Fill In →
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="mb-1 flex justify-between text-xs text-gray-400">
                            <span>Completion</span>
                            <span>{answered}/{total} answered</span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all"
                              style={{width: `${pct}%`}}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        {/* Questionnaire Answer Modal */}
        {activeQ && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
              <div className="sticky top-0 flex items-center justify-between border-b bg-white px-6 py-4">
                <div>
                  <h2 className="font-bold text-gray-800">Risk Questionnaire</h2>
                  <p className="text-xs text-gray-400">{activeQ.supplierName}</p>
                </div>
                <button className="rounded-lg p-1 text-gray-400 hover:bg-gray-100" onClick={() => setActiveQ(null)}>
                  ✕
                </button>
              </div>
              <div className="space-y-4 p-6">
                {/* Group by section */}
                {['Financial', 'Operational', 'Compliance', 'ESG'].map(section => {
                  const sectionAnswers = activeQ.answers.filter((a: {questionId: string}) =>
                    a.questionId.startsWith(section.toLowerCase().slice(0, 3)),
                  );
                  if (sectionAnswers.length === 0) return null;
                  return (
                    <div key={section}>
                      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">{section}</h4>
                      <div className="space-y-3">
                        {sectionAnswers.map((a: {questionId: string; question: string; answer: string}) => (
                          <div key={a.questionId} className="rounded-lg border border-gray-100 p-3">
                            <p className="mb-1.5 text-sm text-gray-700">{a.question}</p>
                            <input
                              className="input text-sm"
                              placeholder="Supplier response..."
                              value={a.answer}
                              onChange={e => handleAnswerChange(a.questionId, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="sticky bottom-0 flex justify-end gap-3 border-t bg-white px-6 py-4">
                <button className="btn-secondary" onClick={() => setActiveQ(null)}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleSubmitAnswers}>
                  Submit & Complete
                </button>
              </div>
            </div>
          </div>
        )}
      </SupplierRiskLayout>
    </>
  );
};

export default OnboardingPage;
