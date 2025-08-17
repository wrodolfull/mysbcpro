"use client";
import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../../../lib/supabase/client';

export default function SignInPage() {
  const supabase = getSupabaseClient();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email.trim(), 
        password: password 
      });
      
      setLoading(false);
      
      if (error) {
        setError(error.message);
        return;
      }
      
      if (data.user && data.session) {
        // Wait a bit for cookies to be set, then redirect
        setTimeout(() => {
          window.location.replace('/');
        }, 500);
      } else {
        setError('Login failed - no user data or session returned');
      }
    } catch (err) {
      setLoading(false);
      setError('An unexpected error occurred');
      console.error('Login error:', err);
    }
  };

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold mb-4">Entrar</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input 
          className="w-full border rounded px-3 py-2" 
          placeholder="Email" 
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />
        <input 
          className="w-full border rounded px-3 py-2" 
          placeholder="Senha" 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
        />
        {error && <div className="text-sm text-red-600">{error}</div>}
        <button 
          type="submit"
          disabled={loading} 
          className="w-full bg-black text-white rounded px-3 py-2 disabled:opacity-50"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
      <div className="mt-3 text-sm">
        <a href="/reset" className="underline">Esqueci minha senha</a>
      </div>
      <div className="mt-1 text-sm">
        <a href="/sign-up" className="underline">Criar conta</a>
      </div>
    </div>
  );
}


