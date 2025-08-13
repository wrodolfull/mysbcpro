export default function Page() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="border rounded p-4">Visão geral</div>
        <div className="border rounded p-4">Eventos recentes</div>
        <div className="border rounded p-4">Alertas</div>
      </div>
    </div>
  );
}

