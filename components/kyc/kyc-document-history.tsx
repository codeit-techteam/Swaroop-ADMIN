"use client";

import { Download, Eye, History } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SourceBadge } from "@/components/shared/source-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { downloadAdminKycVersion } from "@/lib/api/ops";
import { formatDateTime } from "@/lib/format";
import type { AdminKycDocumentHistory, KycRecord } from "@/types";

const VERSION_STATUS: Record<string, string> = {
  UPLOADED: "Pending",
  UNDER_REVIEW: "Pending",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
  REPLACED: "Replaced",
  ARCHIVED: "Archived",
};

interface KycDocumentHistoryProps {
  record: Pick<KycRecord, "entityType" | "entityId">;
  history: AdminKycDocumentHistory[];
}

/** Every uploaded version per slot. Older files stay available to compliance after a re-upload. */
export function KycDocumentHistory({ record, history }: KycDocumentHistoryProps) {
  const [busy, setBusy] = useState<string | null>(null);
  const slots = history.filter((slot) => slot.versions.length > 1);
  if (!slots.length) return null;

  const open = async (documentId: string, disposition: "inline" | "attachment") => {
    setBusy(`${documentId}:${disposition}`);
    try {
      const data = await downloadAdminKycVersion(record, documentId, disposition);
      if (!data?.url) throw new Error("Download URL was not issued");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open this version");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section>
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
        <History className="size-4 text-slate-500" /> Document version history
      </h3>
      <div className="grid gap-2">
        {slots.map((slot) => (
          <div key={slot.slot} className="rounded-md border">
            <p className="border-b bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">{slot.name}</p>
            <ul className="divide-y">
              {slot.versions.map((version) => (
                <li key={version.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs">
                  <span className="font-medium text-slate-800">v{version.version}</span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {version.fileName} · {formatDateTime(version.uploadedAt)}
                    {version.rejectionReason ? ` · ${version.rejectionReason}` : ""}
                  </span>
                  {version.current ? <StatusBadge value="Current" /> : null}
                  <StatusBadge value={VERSION_STATUS[version.status] ?? version.status} />
                  {version.source ? <SourceBadge source={version.source} /> : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2"
                    disabled={busy !== null}
                    onClick={() => void open(version.id, "inline")}
                  >
                    <Eye className="size-3.5" /> View
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2"
                    disabled={busy !== null}
                    onClick={() => void open(version.id, "attachment")}
                  >
                    <Download className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
