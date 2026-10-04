"use client";

import type { AdminAiStatusDto } from "@eckamcreation/api-contracts";
import { adminData } from "@/lib/api/client";
import { useAsync } from "@/lib/use-async";
import { Card, ErrorState, Notice, PageHeader, Skeleton, StatusPill } from "@/components/ui";

export default function AdminAiPage() {
  const status = useAsync(() => adminData<AdminAiStatusDto>("/v1/admin/ai/status"));

  if (status.loading) return <Skeleton className="h-64" />;
  if (status.error) return <ErrorState message={status.error} onRetry={status.reload} />;
  if (!status.data) return null;

  return (
    <div>
      <PageHeader
        eyebrow="Assistant"
        title="AI operations"
        description="Safe operational status only. API keys, system prompts, and customer conversations are never loaded here."
      />
      {!status.data.configured ? (
        <div className="mb-6">
          <Notice
            title="AI provider not configured."
            body="The storefront assistant remains unavailable until a live provider is configured on the API."
          />
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <p className="text-[11px] tracking-[0.16em] text-ec-muted uppercase">Provider</p>
          <p className="mt-3 font-serif text-2xl">{status.data.provider ?? "—"}</p>
        </Card>
        <Card>
          <p className="text-[11px] tracking-[0.16em] text-ec-muted uppercase">Model</p>
          <p className="mt-3 font-serif text-2xl">{status.data.model ?? "—"}</p>
        </Card>
        <Card>
          <p className="text-[11px] tracking-[0.16em] text-ec-muted uppercase">Status</p>
          <div className="mt-3">
            <StatusPill value={status.data.featureStatus} />
          </div>
        </Card>
        <Card>
          <p className="text-[11px] tracking-[0.16em] text-ec-muted uppercase">Registered tools</p>
          <p className="mt-3 font-serif text-2xl">{status.data.toolCount}</p>
        </Card>
        <Card className="md:col-span-2">
          <p className="text-[11px] tracking-[0.16em] text-ec-muted uppercase">Rate limits</p>
          <p className="mt-3 text-sm text-ec-champagne">
            {status.data.rateLimit.conversationLimit} conversations and{" "}
            {status.data.rateLimit.messageLimit} messages per {status.data.rateLimit.windowMinutes}{" "}
            minutes.
          </p>
        </Card>
      </div>
    </div>
  );
}
