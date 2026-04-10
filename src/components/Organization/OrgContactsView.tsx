'use client';

import React, {useState, useEffect, useCallback} from 'react';
import axios from 'axios';
import {
  Plus,
  Search,
  X,
  Edit3,
  Trash2,
  Mail,
  Phone,
  Building2,
  User,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface Contact {
  _id: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  notes?: string;
  position?: string;
  department?: string;
  type?: string;
  image?: string;
  userEmail?: string;
}

const POSITIONS = [
  'C-Suite/Executive',
  'VP',
  'Director',
  'Manager',
  'Senior/Lead',
  'Specialist',
  'Entry Level',
  'Intern',
  'Consultant/Freelance',
];

const DEPARTMENTS = [
  'Cloud & Platform',
  'Commercial & Finance',
  'Cyber Security',
  'Digital Systems/AI',
  'Enterprise Architecture',
  'Finance',
  'Legal',
  'HR',
  'Marketing',
  'Operations',
  'Product',
  'Engineering',
  'Sales',
  'Design',
  'Data & Analytics',
  'Risk & Compliance',
  'IT Support',
  'DevOps',
  'QA',
  'Research',
  'Strategy',
  'Communications',
  'Procurement',
  'Other',
];

function getInitialsColor(name: string): string {
  const colors = [
    'bg-indigo-100 text-indigo-700',
    'bg-emerald-100 text-emerald-700',
    'bg-purple-100 text-purple-700',
    'bg-amber-100 text-amber-700',
    'bg-rose-100 text-rose-700',
    'bg-cyan-100 text-cyan-700',
    'bg-orange-100 text-orange-700',
    'bg-teal-100 text-teal-700',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const EMPTY_CONTACT: Omit<Contact, '_id' | 'userEmail'> = {
  name: '',
  company: '',
  phone: '',
  email: '',
  notes: '',
  position: '',
  department: '',
  type: 'External',
  image: '',
};

interface ContactModalProps {
  contact: Omit<Contact, '_id' | 'userEmail'>;
  onChange: (c: Omit<Contact, '_id' | 'userEmail'>) => void;
  onClose: () => void;
  onSubmit: () => void;
  loading: boolean;
  title: string;
}

function ContactModal({contact, onChange, onClose, onSubmit, loading, title}: ContactModalProps) {
  const set = (key: string, val: string) => onChange({...contact, [key]: val});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Name *</label>
              <input
                value={contact.name}
                onChange={e => set('name', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Full name"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Company</label>
              <input
                value={contact.company || ''}
                onChange={e => set('company', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Company"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                value={contact.email || ''}
                onChange={e => set('email', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
              <input
                value={contact.phone || ''}
                onChange={e => set('phone', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Position</label>
              <select
                value={contact.position || ''}
                onChange={e => set('position', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                <option value="">Select position</option>
                {POSITIONS.map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Department</label>
              <select
                value={contact.department || ''}
                onChange={e => set('department', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                <option value="">Select department</option>
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
              <div className="flex gap-2">
                {['Internal', 'External'].map(t => (
                  <button
                    key={t}
                    onClick={() => set('type', t)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                      contact.type === t
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Image URL</label>
              <input
                value={contact.image || ''}
                onChange={e => set('image', e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="https://..."
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              value={contact.notes || ''}
              onChange={e => set('notes', e.target.value)}
              rows={3}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              placeholder="Additional notes..."
            />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 hover:bg-slate-50 text-slate-700">
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={loading || !contact.name.trim()}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Contact'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface AIImportModalProps {
  onClose: () => void;
  onImport: (contact: Omit<Contact, '_id' | 'userEmail'>) => void;
}

function AIImportModal({onClose, onImport}: AIImportModalProps) {
  const [text, setText] = useState('');
  const [model, setModel] = useState<'gemini' | 'openai'>('gemini');
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<Omit<Contact, '_id' | 'userEmail'> | null>(null);
  const [error, setError] = useState('');

  const parse = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError('');
    setParsed(null);
    const prompt = `Extract contact information from this text. Return a JSON object with these exact fields: name, company, email, phone, position, department, type (Internal or External), notes. Only include fields you can confidently extract. Return only valid JSON, no markdown, no code blocks.\n\n${text}`;
    try {
      let responseText = '';
      if (model === 'gemini') {
        const res = await axios.post('/api/gemini/generate', {
          apiKey: 'GEMINI_SCOPED',
          prompt,
          model: 'gemini-flash-latest',
        });
        responseText = res.data.text || '';
      } else {
        const res = await axios.post('/api/openai/generate', {
          apiKey: 'MANAGED',
          model: 'gpt-4o-mini',
          messages: [{role: 'user', content: prompt}],
        });
        responseText = res.data.text || '';
      }
      // Strip markdown if present
      const clean = responseText
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      const obj = JSON.parse(clean);
      setParsed({...EMPTY_CONTACT, ...obj});
    } catch (err: any) {
      setError('Failed to parse contact. Please check the AI response or try again.');
      console.error('AI parse error', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            AI Smart Import
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Paste any text</label>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={5}
              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
              placeholder="Paste an email, LinkedIn profile, business card, bio..."
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-slate-700">Model:</label>
            <select
              value={model}
              onChange={e => setModel(e.target.value as 'gemini' | 'openai')}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500">
              <option value="gemini">Gemini Flash</option>
              <option value="openai">GPT-4o-mini</option>
            </select>
            <button
              onClick={parse}
              disabled={loading || !text.trim()}
              className="ml-auto flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Parse Contact
            </button>
          </div>
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg text-red-600 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          {parsed && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
              <p className="text-xs font-semibold text-slate-700 mb-2">Extracted fields:</p>
              {Object.entries(parsed)
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-xs">
                    <span className="font-medium text-slate-500 capitalize w-24 shrink-0">{k}:</span>
                    <span className="text-slate-800 break-all">{v as string}</span>
                  </div>
                ))}
              <button
                onClick={() => {
                  onImport(parsed);
                  onClose();
                }}
                className="mt-3 w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2 text-sm font-medium">
                Use This Contact
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrgContactsView({globalSearch}: {globalSearch?: string}) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(globalSearch || '');
  const [showModal, setShowModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [form, setForm] = useState<Omit<Contact, '_id' | 'userEmail'>>(EMPTY_CONTACT);
  const [saving, setSaving] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [detailNotes, setDetailNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  useEffect(() => {
    setSearch(globalSearch || '');
  }, [globalSearch]);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/contacts');
      if (res.data.success) setContacts(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const openAdd = () => {
    setEditContact(null);
    setForm(EMPTY_CONTACT);
    setShowModal(true);
  };
  const openEdit = (c: Contact) => {
    setEditContact(c);
    const {_id, userEmail, ...rest} = c;
    setForm({...EMPTY_CONTACT, ...rest});
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editContact) {
        const res = await axios.put(`/api/contacts/${editContact._id}`, form);
        if (res.data.success) {
          setContacts(prev => prev.map(c => (c._id === editContact._id ? {...c, ...form} : c)));
        }
      } else {
        const res = await axios.post('/api/contacts', form);
        if (res.data.success) setContacts(prev => [...prev, res.data.data]);
      }
      setShowModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this contact?')) return;
    try {
      await axios.delete(`/api/contacts/${id}`);
      setContacts(prev => prev.filter(c => c._id !== id));
      if (selectedContact?._id === id) setSelectedContact(null);
    } catch (err) {
      console.error(err);
    }
  };

  const saveNotes = async () => {
    if (!selectedContact) return;
    setSavingNotes(true);
    try {
      await axios.put(`/api/contacts/${selectedContact._id}`, {...selectedContact, notes: detailNotes});
      setContacts(prev => prev.map(c => (c._id === selectedContact._id ? {...c, notes: detailNotes} : c)));
      setSelectedContact(prev => (prev ? {...prev, notes: detailNotes} : prev));
    } catch (err) {
      console.error(err);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSelectContact = (c: Contact) => {
    setSelectedContact(c);
    setDetailNotes(c.notes || '');
  };

  const handleAIImport = (parsed: Omit<Contact, '_id' | 'userEmail'>) => {
    setEditContact(null);
    setForm({...EMPTY_CONTACT, ...parsed});
    setShowModal(true);
  };

  const filtered = contacts.filter(
    c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      (c.company && c.company.toLowerCase().includes(search.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="flex h-full">
      {/* Main contacts area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-slate-900 placeholder-slate-400"
            />
          </div>
          <button
            onClick={() => setShowAIModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all duration-200">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            Smart Import
          </button>
          <button
            onClick={openAdd}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200">
            <Plus className="w-4 h-4" />
            Add Contact
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-36 bg-white rounded-xl border border-slate-200 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <User className="w-12 h-12 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No contacts found</p>
              <button onClick={openAdd} className="mt-3 text-indigo-600 text-sm hover:underline">
                Add your first contact
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(contact => (
                <div
                  key={contact._id}
                  onClick={() => handleSelectContact(contact)}
                  className={`group relative bg-white rounded-xl border p-4 cursor-pointer hover:shadow-md transition-all duration-200 ${
                    selectedContact?._id === contact._id
                      ? 'border-indigo-300 shadow-md ring-1 ring-indigo-200'
                      : 'border-slate-200'
                  }`}>
                  <div className="flex items-start gap-3">
                    {contact.image ? (
                      <img
                        src={contact.image}
                        alt={contact.name}
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${getInitialsColor(
                          contact.name,
                        )}`}>
                        {getInitials(contact.name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 text-sm truncate">{contact.name}</p>
                      {contact.company && (
                        <p className="text-xs text-slate-500 truncate flex items-center gap-1">
                          <Building2 className="w-3 h-3 shrink-0" />
                          {contact.company}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 space-y-1">
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        onClick={e => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-xs text-indigo-600 hover:underline truncate">
                        <Mail className="w-3 h-3 shrink-0" />
                        {contact.email}
                      </a>
                    )}
                    {contact.phone && (
                      <p className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
                        <Phone className="w-3 h-3 shrink-0" />
                        {contact.phone}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {contact.position && (
                      <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                        {contact.position}
                      </span>
                    )}
                    {contact.department && (
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {contact.department}
                      </span>
                    )}
                    {contact.type && (
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          contact.type === 'Internal' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                        {contact.type}
                      </span>
                    )}
                  </div>

                  {/* Hover actions */}
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        openEdit(contact);
                      }}
                      className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors">
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handleDelete(contact._id);
                      }}
                      className="w-7 h-7 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-red-600 hover:border-red-300 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      {selectedContact && (
        <div className="w-[320px] shrink-0 bg-white border-l border-slate-200 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-900">Contact Details</h3>
            <button onClick={() => setSelectedContact(null)} className="text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="flex items-center gap-3">
              {selectedContact.image ? (
                <img
                  src={selectedContact.image}
                  alt={selectedContact.name}
                  className="w-14 h-14 rounded-full object-cover"
                />
              ) : (
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-semibold ${getInitialsColor(
                    selectedContact.name,
                  )}`}>
                  {getInitials(selectedContact.name)}
                </div>
              )}
              <div>
                <p className="font-semibold text-slate-900">{selectedContact.name}</p>
                {selectedContact.company && <p className="text-sm text-slate-500">{selectedContact.company}</p>}
              </div>
            </div>

            <div className="space-y-2 text-sm">
              {selectedContact.email && (
                <div className="flex items-center gap-2 text-slate-700">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <a href={`mailto:${selectedContact.email}`} className="text-indigo-600 hover:underline truncate">
                    {selectedContact.email}
                  </a>
                </div>
              )}
              {selectedContact.phone && (
                <div className="flex items-center gap-2 text-slate-700">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  {selectedContact.phone}
                </div>
              )}
              {selectedContact.position && (
                <div className="flex items-center gap-2 text-slate-700">
                  <User className="w-4 h-4 text-slate-400 shrink-0" />
                  {selectedContact.position}
                </div>
              )}
              {selectedContact.department && (
                <div className="flex items-center gap-2 text-slate-700">
                  <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
                  {selectedContact.department}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {selectedContact.type && (
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    selectedContact.type === 'Internal'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}>
                  {selectedContact.type}
                </span>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                value={detailNotes}
                onChange={e => setDetailNotes(e.target.value)}
                rows={4}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                placeholder="Add notes about this contact..."
              />
              <button
                onClick={saveNotes}
                disabled={savingNotes}
                className="mt-1.5 w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-1.5 text-xs font-medium transition-all disabled:opacity-50">
                {savingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => openEdit(selectedContact)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all">
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </button>
              <button
                onClick={() => handleDelete(selectedContact._id)}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-white border border-red-200 hover:bg-red-50 text-red-600 transition-all">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <ContactModal
          contact={form}
          onChange={setForm}
          onClose={() => setShowModal(false)}
          onSubmit={handleSave}
          loading={saving}
          title={editContact ? 'Edit Contact' : 'Add Contact'}
        />
      )}
      {showAIModal && <AIImportModal onClose={() => setShowAIModal(false)} onImport={handleAIImport} />}
    </div>
  );
}
