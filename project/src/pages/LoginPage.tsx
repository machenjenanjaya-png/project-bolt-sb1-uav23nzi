import { useState } from 'react';
import { Store, Mail, Lock, ArrowRight, Loader2, Zap, ShieldCheck, TrendingUp, Smartphone } from 'lucide-react';
import { useAuth } from '../lib/auth';

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result =
      mode === 'signin' ? await signIn(email, password) : await signUp(email, password);

    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else if (mode === 'signup') {
      setError(null);
      setMode('signin');
      setEmail('');
      setPassword('');
      setError('Account created! Please sign in.');
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — Halbert-style sales copy */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl -ml-32 -mb-32" />

        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-500 flex items-center justify-center">
            <Store className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-bold text-lg leading-tight">ELECTRO-POS</p>
            <p className="text-xs text-slate-400 leading-tight">Electronic Point of Sale</p>
          </div>
        </div>

        <div className="relative space-y-7 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">
              The POS System That Actually Makes You Money
            </span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-bold leading-tight">
            If You're Still Using<br />
            <span className="text-emerald-400">Paper And A Calculator</span><br />
            To Run Your Store...
          </h1>

          <p className="text-slate-300 text-lg leading-relaxed">
            ...you're losing money every single day you keep doing it.
            <br /><br />
            Listen. Every minute a customer stands at your counter waiting
            for you to figure out their change is a minute they're
            deciding never to come back.
            <br /><br />
            <span className="text-white font-semibold">
              ELECTRO-POS turns that chaos into a 10-second transaction.
            </span>{' '}
            One click. Receipt printed. Stock updated. Customer out the door happy.
          </p>

          <div className="grid grid-cols-3 gap-5 pt-4 border-t border-slate-800">
            <div className="space-y-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              <p className="text-sm font-bold text-white">Bulletproof</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your data lives in the cloud. Lose your laptop? Your sales are safe.
              </p>
            </div>
            <div className="space-y-2">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              <p className="text-sm font-bold text-white">Know Your Numbers</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                See exactly what's selling, what's dead stock, and where your money is.
              </p>
            </div>
            <div className="space-y-2">
              <Smartphone className="w-6 h-6 text-emerald-400" />
              <p className="text-sm font-bold text-white">Works Anywhere</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Desktop at the counter. Tablet on the floor. Phone in your pocket.
              </p>
            </div>
          </div>

          <p className="text-slate-400 text-sm italic border-l-2 border-emerald-500 pl-4">
            "The best time to fix your checkout was the day you opened.
            The second best time is right now."
          </p>
        </div>

        <p className="relative text-xs text-slate-600">
          &copy; {new Date().getFullYear()} ELECTRO-POS. All rights reserved.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900">ELECTRO-POS</p>
              <p className="text-[10px] text-slate-500">Electronic Point of Sale</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {mode === 'signin' ? 'Welcome back' : 'Start selling today'}
          </h2>
          <p className="text-sm text-slate-500 mb-8">
            {mode === 'signin'
              ? 'Sign in to access your POS dashboard.'
              : 'Create your account. Takes 30 seconds.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@store.com"
                  className="w-full pl-11 pr-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 rounded-lg border border-slate-300 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {error && (
              <div
                className={`text-sm p-3 rounded-lg ${
                  error.includes('Account created')
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {mode === 'signin' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => {
                setMode(mode === 'signin' ? 'signup' : 'signin');
                setError(null);
              }}
              className="text-emerald-600 font-semibold hover:underline"
            >
              {mode === 'signin' ? 'Sign up' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
