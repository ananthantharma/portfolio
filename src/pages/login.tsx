import Head from 'next/head';
import {useRouter} from 'next/router';
import {signIn, useSession} from 'next-auth/react';
import {useEffect, useState} from 'react';

export default function Login() {
  const {data: session} = useSession();
  const router = useRouter();
  const [mode, setMode] = useState<'google' | 'credentials'>('google');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) router.push('/dashboard');
  }, [session, router]);

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await signIn('credentials', {
        redirect: false,
        email: email.trim(),
        password,
      });
      if (!result?.ok || result?.error) {
        setError('Invalid email or password. Please check your credentials and try again.');
      } else {
        // Force a full page navigation so the new JWT session cookie is
        // picked up cleanly by the dashboard.
        window.location.href = '/dashboard';
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white px-4">
      <Head>
        <title>Login</title>
      </Head>

      <div className="w-full max-w-md rounded-2xl bg-gray-800 p-8 shadow-2xl border border-gray-700">
        <h1 className="mb-2 text-center text-3xl font-bold text-orange-500">Welcome Back</h1>
        <p className="mb-8 text-center text-gray-400 text-sm">Sign in to access the dashboard.</p>

        {/* Tab switcher */}
        <div className="flex rounded-xl bg-gray-900 p-1 mb-6">
          <button
            onClick={() => { setMode('google'); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === 'google' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'
            }`}>
            Google
          </button>
          <button
            onClick={() => { setMode('credentials'); setError(''); }}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
              mode === 'credentials' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'
            }`}>
            Email & Password
          </button>
        </div>

        {mode === 'google' ? (
          <button
            className="flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 font-semibold text-gray-900 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            onClick={() => signIn('google')}>
            <img alt="Google" className="mr-2 h-5 w-5" src="https://www.svgrepo.com/show/475656/google-color.svg" />
            Sign in with Google
          </button>
        ) : (
          <form onSubmit={handleCredentialsSignIn} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Email / Username</label>
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
              />
            </div>
            {error && (
              <p className="text-sm text-red-400 bg-red-900/30 border border-red-800/50 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-orange-500 px-4 py-3 font-semibold text-white transition hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
