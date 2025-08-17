"use client";
import { useState } from 'react';
import { getSupabaseClient } from '../../../lib/supabase/client';

export default function ResetPage() {
  const supabase = getSupabaseClient();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(null);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`
    });
    setLoading(false);
    if (error) setError(error.message);
    else setOk('Email enviado. Verifique sua caixa de entrada.');
  };

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold mb-4">Redefinir senha</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border rounded px-3 py-2" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {error && <div className="text-sm text-red-600">{error}</div>}
        {ok && <div className="text-sm text-green-700">{ok}</div>}
        <button disabled={loading} className="w-full bg-black text-white rounded px-3 py-2 disabled:opacity-50">{loading ? 'Enviando...' : 'Enviar link'}</button>
      </form>
    </div>
  );
}


