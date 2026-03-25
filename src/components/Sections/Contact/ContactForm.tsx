import {FC, memo, useCallback, useState} from 'react';

interface FormData {
  name: string;
  email: string;
  message: string;
}

const ContactForm: FC = memo(() => {
  const [data, setData] = useState<FormData>({name: '', email: '', message: ''});
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const onChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setData(prev => ({...prev, [e.target.name]: e.target.value}));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setStatus('sending');
      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(data),
        });
        if (res.ok) {
          setStatus('success');
          setData({name: '', email: '', message: ''});
        } else {
          setStatus('error');
        }
      } catch {
        setStatus('error');
      }
    },
    [data],
  );

  const inputClasses =
    'bg-neutral-700 border-0 focus:border-0 focus:outline-none focus:ring-1 focus:ring-orange-600 rounded-md placeholder:text-neutral-400 placeholder:text-sm text-neutral-200 text-sm';

  if (status === 'success') {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-xl border border-orange-600/30 bg-orange-600/10 p-8 text-center">
        <div className="text-4xl">✉️</div>
        <p className="text-lg font-semibold text-white">Message sent!</p>
        <p className="text-sm text-neutral-400">Thanks for reaching out. I'll get back to you soon.</p>
        <button
          className="mt-2 text-sm text-orange-500 hover:underline"
          onClick={() => setStatus('idle')}>
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form className="grid min-h-[320px] grid-cols-1 gap-y-4" onSubmit={handleSubmit}>
      <input
        className={inputClasses}
        disabled={status === 'sending'}
        name="name"
        onChange={onChange}
        placeholder="Name"
        required
        type="text"
        value={data.name}
      />
      <input
        autoComplete="email"
        className={inputClasses}
        disabled={status === 'sending'}
        name="email"
        onChange={onChange}
        placeholder="Email"
        required
        type="email"
        value={data.email}
      />
      <textarea
        className={inputClasses}
        disabled={status === 'sending'}
        maxLength={250}
        name="message"
        onChange={onChange}
        placeholder="Message"
        required
        rows={6}
        value={data.message}
      />
      {status === 'error' && (
        <p className="text-sm text-red-400">Something went wrong. Please try again.</p>
      )}
      <button
        aria-label="Submit contact form"
        className="w-max rounded-full border-2 border-orange-600 bg-stone-900 px-4 py-2 text-sm font-medium text-white shadow-md outline-none hover:bg-stone-800 focus:ring-2 focus:ring-orange-600 focus:ring-offset-2 focus:ring-offset-stone-800 disabled:opacity-50"
        disabled={status === 'sending'}
        type="submit">
        {status === 'sending' ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  );
});

ContactForm.displayName = 'ContactForm';
export default ContactForm;
