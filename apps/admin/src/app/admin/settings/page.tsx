"use client";

import type { AdminSettingsDto } from "@eckamcreation/api-contracts";
import { adminData } from "@/lib/api/client";
import { environmentLabel } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import { Card, ErrorState, PageHeader, Skeleton, StatusPill } from "@/components/ui";

export default function AdminSettingsPage() {
  const settings = useAsync(() => adminData<AdminSettingsDto>("/v1/admin/settings"));

  if (settings.loading) return <Skeleton className="h-64" />;
  if (settings.error) return <ErrorState message={settings.error} onRetry={settings.reload} />;
  if (!settings.data) return null;

  const rows = [
    { label: "Store identity", value: settings.data.storeName },
    { label: "Environment", value: environmentLabel(settings.data.environment) },
    { label: "Default currency", value: settings.data.defaultCurrencyCode },
    { label: "Default locale", value: settings.data.defaultLocale },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Operations"
        title="Settings"
        description="Read-only values already supported by the backend. Unsupported controls are not shown."
      />
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((row) => (
          <Card key={row.label}>
            <p className="text-[11px] tracking-[0.16em] text-ec-muted uppercase">{row.label}</p>
            <p className="mt-3 font-serif text-2xl text-ec-ivory">{row.value}</p>
          </Card>
        ))}
        <Card>
          <p className="text-[11px] tracking-[0.16em] text-ec-muted uppercase">Payment provider</p>
          <div className="mt-3">
            <StatusPill
              value={settings.data.paymentProviderConfigured ? "CONFIGURED" : "NOT CONFIGURED"}
            />
          </div>
        </Card>
        <Card>
          <p className="text-[11px] tracking-[0.16em] text-ec-muted uppercase">AI provider</p>
          <div className="mt-3">
            <StatusPill value={settings.data.aiProviderConfigured ? "CONFIGURED" : "NOT CONFIGURED"} />
          </div>
        </Card>
      </div>
    </div>
  );
}
