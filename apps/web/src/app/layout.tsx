import './globals.css';
import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-dvh bg-white text-zinc-900 antialiased">
        <div className="flex min-h-dvh">
          <aside className="w-64 bg-black text-white p-4 hidden md:block">
            <div className="text-xl font-semibold mb-6">Panel</div>
            <nav className="space-y-2 text-sm">
              <a href="/" className="block px-2 py-1 rounded hover:bg-zinc-800">Dashboard</a>
              <a href="/trunks" className="block px-2 py-1 rounded hover:bg-zinc-800">SIP Trunk Connector</a>
              <a href="/inbounds" className="block px-2 py-1 rounded hover:bg-zinc-800">Inbound Connector</a>
              <a href="/flows" className="block px-2 py-1 rounded hover:bg-zinc-800">Integration Flow</a>
              <a href="/integrations" className="block px-2 py-1 rounded hover:bg-zinc-800">Integrações</a>
              <a href="/workstation" className="block px-2 py-1 rounded hover:bg-zinc-800">Workstation</a>
              <a href="/csat" className="block px-2 py-1 rounded hover:bg-zinc-800">Pesquisa de Satisfação</a>
              <a href="/audio" className="block px-2 py-1 rounded hover:bg-zinc-800">Áudios & TTS</a>
              <a href="/settings" className="block px-2 py-1 rounded hover:bg-zinc-800">Config. do Tenant</a>
            </nav>
          </aside>
          <main className="flex-1 p-4 md:p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}

