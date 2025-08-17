"use client";
import { useState } from 'react';
import { getSupabaseClient } from '../../../lib/supabase/client';

export default function SignUpPage() {
  const supabase = getSupabaseClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setOk(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { org_name: orgName }
      }
    });
    setLoading(false);
    if (error) setError(error.message);
    else {
      setOk('Verifique seu email para confirmar o cadastro.');
      if (data.user) window.location.href = '/';
    }
  };

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold mb-4">Criar conta</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <input className="w-full border rounded px-3 py-2" placeholder="Nome da organização" value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
        <input className="w-full border rounded px-3 py-2" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full border rounded px-3 py-2" placeholder="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <div className="text-sm text-red-600">{error}</div>}
        {ok && <div className="text-sm text-green-700">{ok}</div>}
        <button disabled={loading} className="w-full bg-black text-white rounded px-3 py-2 disabled:opacity-50">{loading ? 'Criando...' : 'Criar conta'}</button>
      </form>
      <div className="mt-3 text-sm">
        <a href="/sign-in" className="underline">Já tenho conta</a>
      </div>
    </div>
  );
}


