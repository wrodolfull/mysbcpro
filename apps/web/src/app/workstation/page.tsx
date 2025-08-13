import { PageHeader } from '@mysbc/ui';

export default function WorkstationPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Workstation" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <div className="border rounded p-4">Card do cliente</div>
          <div className="border rounded p-4">Histórico</div>
        </div>
        <div className="space-y-4">
          <div className="border rounded p-4">Ações rápidas</div>
          <div className="border rounded p-4">Fila/Espera (placeholder)</div>
        </div>
      </div>
    </div>
  );
}

