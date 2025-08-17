import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-zinc-50">
      <div className="w-full max-w-md bg-white border rounded-md p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}


