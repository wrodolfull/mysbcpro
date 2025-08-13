import { PageHeader } from '@mysbc/ui';

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Configurações do Tenant" />
      <div className="border rounded p-4">Domain, webhook_base, admin_email, bloqueio (placeholder)</div>
    </div>
  );
}

