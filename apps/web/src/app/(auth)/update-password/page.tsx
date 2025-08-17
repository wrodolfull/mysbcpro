"use client";
import { useEffect, useState } from 'react';
import { getSupabaseClient } from '../../../lib/supabase/client';

export default function UpdatePasswordPage() {
  const supabase = getSupabaseClient();
  const [password, setPassword] = useState('');
  const [ok, setOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If redirected from email, exchange hash for session
    supabase.auth.getSession();
  }, [supabase]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) setError(error.message);
    else setOk('Senha atualizada.');
  };

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold mb-4">Nova senha</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border rounded px-3 py-2" placeholder="Nova senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <div className="text-sm text-red-600">{error}</div>}
        {ok && <div className="text-sm text-green-700">{ok}</div>}
        <button className="w-full bg-black text-white rounded px-3 py-2">Atualizar</button>
      </form>
    </div>
  );
}


