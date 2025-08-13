import type { ReactNode } from 'react';

export function Sidebar({ children }: { children?: ReactNode }) {
  return (
    <aside className="w-64 bg-black text-white p-4 hidden md:block">
      {children}
    </aside>
  );
}

