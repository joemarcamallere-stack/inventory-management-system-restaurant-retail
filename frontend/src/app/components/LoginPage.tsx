import { useState, useEffect } from 'react';
import { Eye, EyeOff, Mail, Lock, Tag, DollarSign, TrendingUp, ArrowLeft, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import logoImage from '../../imports/ims-logo.png';
import centerLogoImage from '../../imports/ims-logo-nobg.png';

interface LoginPageProps {
  onLogin: (email: string, password: string) => void;
}

const REMEMBERED_EMAIL_KEY = 'ims_remembered_email';

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [view, setView] = useState<'login' | 'forgot'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(REMEMBERED_EMAIL_KEY);
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (rememberMe) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
      await onLogin(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotLoading(true);
    await new Promise((r) => setTimeout(r, 1200));
    setForgotLoading(false);
    setForgotSent(true);
  };

  const resetForgot = () => {
    setView('login');
    setForgotEmail('');
    setForgotSent(false);
  };

  const panelStyle: React.CSSProperties = {
    backgroundImage: 'linear-gradient(135deg, #003534 0%, #005656 50%, #007A5E 100%)',
  };

  return (
    <div className="min-h-screen flex font-['Inter',sans-serif]">
      <style>{`
        @keyframes float  { 0%,100%{transform:translateY(0)}       50%{transform:translateY(-16px)} }
        @keyframes floatX { 0%,100%{transform:translateX(0)}       50%{transform:translateX(-10px)} }
        @keyframes floatD { 0%,100%{transform:translate(0,0)}      50%{transform:translate(-8px,-12px)} }
        @keyframes spin-slow  { to{transform:rotate(360deg)} }
        @keyframes spin-back  { to{transform:rotate(-360deg)} }
        @keyframes pulse-ring { 0%,100%{box-shadow:0 0 0 0 rgba(0,167,165,0.35)} 50%{box-shadow:0 0 0 12px rgba(0,167,165,0)} }
        @keyframes pulse-orb  { 0%,100%{opacity:0.25;transform:scale(1)}   50%{opacity:0.45;transform:scale(1.08)} }
        @keyframes fade-up    { from{opacity:0;transform:translateY(16px)}  to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fade-up 0.4s ease-out both; }
      `}</style>

      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex lg:w-[52%] flex-col justify-between p-12 relative overflow-hidden" style={panelStyle}>
        {/* background blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-16 left-16 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-24 right-8 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#00A7A5]/5 rounded-full blur-3xl" />
        </div>

        {/* logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-lg overflow-hidden"
            style={{ animation: 'pulse-ring 3s ease-in-out infinite' }}>
            <img src={logoImage} alt="IMS Logo" className="w-full h-full object-contain p-1" />
          </div>
          <div>
            <p className="text-white font-bold text-xl leading-tight tracking-tight">Bukolabs.io</p>
            <p className="text-white/70 text-xs">Inventory Management System</p>
          </div>
        </div>

        {/* ── Floating illustration ── */}
        <div className="relative z-10 flex justify-center items-center h-[280px]">

          {/* outer slow-spinning ring */}
          <div className="absolute w-[260px] h-[260px] rounded-full border border-white/10"
            style={{ animation: 'spin-slow 30s linear infinite' }}>
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#00A7A5]/70 rounded-full" />
            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#008967]/70 rounded-full" />
          </div>

          {/* inner counter-spinning ring */}
          <div className="absolute w-[200px] h-[200px] rounded-full border border-dashed border-white/15"
            style={{ animation: 'spin-back 20s linear infinite' }}>
            <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#007A5E]/80 rounded-full" />
            <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#00A7A5]/80 rounded-full" />
          </div>

          {/* bare logo — no background */}
          <img
            src={centerLogoImage}
            alt="IMS Logo"
            className="relative z-10 w-32 h-32 object-contain drop-shadow-2xl"
            style={{ animation: 'float 5s ease-in-out infinite', filter: 'drop-shadow(0 0 24px rgba(0,167,165,0.5))' }}
          />

          {/* floating icon orbs */}
          <div className="absolute top-[10px] right-[30px] w-11 h-11 bg-[#00A7A5]/40 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm border border-white/20"
            style={{ animation: 'float 3.2s ease-in-out infinite 0.3s' }}>
            <Tag className="w-5 h-5 text-white" />
          </div>

          <div className="absolute top-[40px] left-[20px] w-10 h-10 bg-[#008967]/40 rounded-full flex items-center justify-center shadow-md backdrop-blur-sm border border-white/20"
            style={{ animation: 'float 4s ease-in-out infinite 0.8s' }}>
            <TrendingUp className="w-4 h-4 text-white" />
          </div>

          <div className="absolute bottom-[20px] left-[40px] w-12 h-12 bg-[#005656]/50 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm border border-white/20"
            style={{ animation: 'floatD 3.8s ease-in-out infinite 0.5s' }}>
            <DollarSign className="w-5 h-5 text-white" />
          </div>

          <div className="absolute bottom-[30px] right-[20px] w-9 h-9 bg-[#007A5E]/40 rounded-full flex items-center justify-center shadow-md backdrop-blur-sm border border-white/20"
            style={{ animation: 'floatX 3.5s ease-in-out infinite 1.2s' }}>
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>

          <div className="absolute top-[120px] right-[8px] w-8 h-8 bg-[#009BA5]/35 rounded-full flex items-center justify-center border border-white/20"
            style={{ animation: 'float 4.5s ease-in-out infinite 1.8s' }}>
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>

          {/* small particle dots */}
          <div className="absolute top-[70px] right-[80px] w-2 h-2 bg-white/40 rounded-full" style={{ animation: 'pulse-orb 2.5s ease-in-out infinite 0.4s' }} />
          <div className="absolute bottom-[70px] right-[65px] w-1.5 h-1.5 bg-[#00A7A5]/60 rounded-full" style={{ animation: 'pulse-orb 3s ease-in-out infinite 1s' }} />
          <div className="absolute top-[160px] left-[55px] w-2 h-2 bg-white/30 rounded-full" style={{ animation: 'pulse-orb 2.8s ease-in-out infinite 0.7s' }} />
          <div className="absolute top-[30px] left-[90px] w-1.5 h-1.5 bg-[#008967]/50 rounded-full" style={{ animation: 'pulse-orb 3.2s ease-in-out infinite 1.5s' }} />
        </div>

        {/* tagline */}
        <div className="relative z-10">
          <h2 className="text-white text-3xl font-bold leading-snug mb-4">
            Manage Your Inventory<br />with Ease
          </h2>
          <p className="text-white/80 text-base leading-relaxed mb-8">
            Track items, manage stock levels, and streamline your operations in one place.
          </p>
          <div className="space-y-4">
            {[
              { icon: '📦', title: 'Stock Management', desc: 'Track items by category and location' },
              { icon: '🔔', title: 'Low Stock Alerts', desc: 'Get notified before you run out' },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-3">
                <span className="text-xl mt-0.5">{f.icon}</span>
                <div>
                  <p className="text-white font-semibold text-sm">{f.title}</p>
                  <p className="text-white/70 text-xs">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center bg-[#F8FAFB] px-6 py-10">
        <div className="w-full max-w-[420px]">

          {/* mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-full bg-white shadow-md overflow-hidden border border-[#00A7A5]/30">
              <img src={logoImage} alt="IMS Logo" className="w-full h-full object-contain p-1" />
            </div>
            <span className="font-bold text-[#003534] text-lg">Bukolabs.io</span>
          </div>

          {/* ── LOGIN VIEW ── */}
          {view === 'login' && (
            <div className="fade-up">
              <div className="mb-8">
                <h1 className="text-[28px] font-bold text-[#323B42] leading-tight">Welcome back</h1>
                <p className="text-[#6b7280] text-sm mt-1">Sign in to your account to continue</p>
              </div>

              {error && (
                <div className="mb-5 flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Email */}
                <div>
                  <label className="block text-[13px] font-medium text-[#323B42] mb-1.5">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#d1d5db] rounded-xl text-sm text-[#323B42] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#005656] focus:ring-2 focus:ring-[#005656]/15 transition-all"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-[13px] font-medium text-[#323B42] mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-11 py-2.5 bg-white border border-[#d1d5db] rounded-xl text-sm text-[#323B42] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#005656] focus:ring-2 focus:ring-[#005656]/15 transition-all"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9ca3af] hover:text-[#6b7280] transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember me + forgot */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer select-none group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="sr-only"
                      />
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${rememberMe ? 'bg-[#005656] border-[#005656]' : 'border-[#d1d5db] bg-white group-hover:border-[#005656]/50'}`}>
                        {rememberMe && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <span className="text-[13px] text-[#6b7280]">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => { setView('forgot'); setForgotEmail(email); }}
                    className="text-[13px] text-[#005656] hover:text-[#007A5E] font-medium transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-all duration-200 hover:opacity-90 hover:shadow-lg active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(90deg, #005656 0%, #007A5E 60%, #00A7A5 100%)' }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Signing in…
                    </>
                  ) : 'Sign In'}
                </button>
              </form>

              {/* Divider */}
              <div className="relative my-7">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#e5e7eb]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-[#F8FAFB] text-[12px] text-[#9ca3af]">Demo credentials</span>
                </div>
              </div>

              {/* Demo cards */}
              <div className="space-y-2.5">
                {[
                  { role: 'Admin', email: 'admin@retail.com', password: 'admin123', color: '#005656' },
                  { role: 'Restaurant Admin', email: 'admin@restaurant.com', password: 'admin123', color: '#007A5E' },
                ].map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    onClick={() => { setEmail(d.email); setPassword(d.password); setError(''); }}
                    className="w-full text-left rounded-xl border px-4 py-3 transition-all hover:shadow-sm active:scale-[0.99]"
                    style={{ borderColor: `${d.color}40`, background: `${d.color}08` }}
                  >
                    <p className="text-[12px] font-semibold mb-0.5" style={{ color: d.color }}>{d.role}</p>
                    <p className="text-[12px] text-[#6b7280]">{d.email} · <span className="font-mono">admin123</span></p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── FORGOT PASSWORD VIEW ── */}
          {view === 'forgot' && (
            <div className="fade-up">
              <button
                type="button"
                onClick={resetForgot}
                className="flex items-center gap-1.5 text-[13px] text-[#6b7280] hover:text-[#323B42] mb-6 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to sign in
              </button>

              {!forgotSent ? (
                <>
                  <div className="mb-8">
                    <h1 className="text-[28px] font-bold text-[#323B42] leading-tight">Reset password</h1>
                    <p className="text-[#6b7280] text-sm mt-1">
                      Enter your email and we'll send you a reset link.
                    </p>
                  </div>

                  <form onSubmit={handleForgotSubmit} className="space-y-5">
                    <div>
                      <label className="block text-[13px] font-medium text-[#323B42] mb-1.5">
                        Email address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9ca3af]" />
                        <input
                          type="email"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#d1d5db] rounded-xl text-sm text-[#323B42] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#005656] focus:ring-2 focus:ring-[#005656]/15 transition-all"
                          required
                          autoFocus
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 hover:shadow-lg active:scale-[0.98] disabled:opacity-60"
                      style={{ background: 'linear-gradient(90deg, #005656 0%, #007A5E 60%, #00A7A5 100%)' }}
                    >
                      {forgotLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                      ) : 'Send reset link'}
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-4 fade-up">
                  <div className="w-16 h-16 rounded-full bg-[#005656]/10 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="w-8 h-8 text-[#005656]" />
                  </div>
                  <h2 className="text-xl font-bold text-[#323B42] mb-2">Check your inbox</h2>
                  <p className="text-[#6b7280] text-sm leading-relaxed mb-6">
                    If <strong className="text-[#323B42]">{forgotEmail}</strong> is registered, you'll receive a password reset link shortly.
                  </p>
                  <button
                    type="button"
                    onClick={resetForgot}
                    className="text-sm text-[#005656] hover:text-[#007A5E] font-medium transition-colors"
                  >
                    Return to sign in
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
