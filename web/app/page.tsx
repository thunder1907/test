'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowRight, CheckCircle, Shield, Zap, X } from 'lucide-react';

export default function LandingPage() {
  const router = useRouter();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setShowAuthModal(true);
    setError(null);
    setSuccessMsg(null);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
          },
        });
        if (error) throw error;
        router.push('/dashboard');
      } else {
        const { error, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        // AUTO-SIGNUP HACK FOR PROTOTYPE:
        if (error && error.message.includes('Invalid login credentials')) {
          const { error: signUpError, data: signUpData } = await supabase.auth.signUp({
            email,
            password,
          });
          
          if (!signUpError && signUpData?.user) {
            await supabase.auth.signInWithPassword({ email, password });
            router.push('/dashboard');
            return;
          }
          throw error; 
        } else if (error) {
          throw error;
        }
        
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Navbar */}
      <header className="sticky top-0 z-40 w-full backdrop-blur flex-none border-b border-slate-200 bg-white/75">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900 tracking-tight">Clear Flow</span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => openAuth('login')}
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Log in
              </button>
              <button 
                onClick={() => openAuth('signup')}
                className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
              >
                Sign up
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main>
        <div className="relative pt-24 pb-32 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center">
            <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-8">
              Resolve Customer Complaints <br className="hidden md:block"/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">
                10x Faster with AI
              </span>
            </h1>
            <p className="mt-4 text-xl text-slate-600 max-w-3xl mx-auto mb-10">
              Clear Flow intelligently categorizes, prioritizes, and resolves customer issues in real-time. Detect fraud automatically and empower your support team.
            </p>
            <div className="flex justify-center gap-4">
              <button 
                onClick={() => openAuth('signup')}
                className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3.5 rounded-xl font-semibold text-lg hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-500/30"
              >
                Get Started for Free <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-12">
              <div className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-6">
                  <Zap className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">Instant Categorization</h3>
                <p className="text-slate-600">Automatically route tickets to the right department based on AI intent analysis.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-2xl bg-cyan-50 flex items-center justify-center mb-6">
                  <CheckCircle className="h-6 w-6 text-cyan-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">Smart Prioritization</h3>
                <p className="text-slate-600">Never miss a critical issue. Our weighted scoring system highlights what matters most.</p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="h-12 w-12 rounded-2xl bg-rose-50 flex items-center justify-center mb-6">
                  <Shield className="h-6 w-6 text-rose-600" />
                </div>
                <h3 className="text-xl font-bold mb-3">Fraud Detection</h3>
                <p className="text-slate-600">Identify spam, keyword manipulation, and fake complaints before they cost you money.</p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="p-8">
              <h2 className="text-2xl font-bold text-center mb-2">
                {authMode === 'login' ? 'Welcome back' : 'Create an account'}
              </h2>
              <p className="text-center text-slate-500 mb-8">
                {authMode === 'login' 
                  ? 'Enter your details to access your dashboard' 
                  : 'Sign up to start resolving complaints faster'}
              </p>

              <form onSubmit={handleAuth} className="space-y-4">
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
                    <input 
                      type="text" 
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
                      placeholder="John Doe"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email address</label>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-600 focus:border-transparent outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                    {error}
                  </div>
                )}
                
                {successMsg && (
                  <div className="p-3 bg-green-50 text-green-600 text-sm rounded-lg border border-green-100">
                    {successMsg}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-70 flex justify-center items-center"
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    authMode === 'login' ? 'Sign in' : 'Create account'
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-slate-600">
                {authMode === 'login' ? (
                  <>
                    Don't have an account?{' '}
                    <button onClick={() => openAuth('signup')} className="text-indigo-600 font-semibold hover:underline">
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button onClick={() => openAuth('login')} className="text-indigo-600 font-semibold hover:underline">
                      Log in
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
