"use client";

import { useEffect, useState } from "react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Label } from "@/components/ui/label";
import { listCreditAssignees } from "@/lib/api/credit";
import { creditErrorMessage } from "@/lib/credit-format";
import type { CreditAssignee } from "@/types/credit";

export function CreditAssignDialog({
  open,
  onOpenChange,
  currentAssigneeId,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAssigneeId: string | null;
  onConfirm: (assigneeUserId: string) => void;
}) {
  const [assignees, setAssignees] = useState<CreditAssignee[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setSelected(currentAssigneeId ?? "");
    listCreditAssignees()
      .then((rows) => {
        if (!cancelled) setAssignees(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(creditErrorMessage(err, "Unable to load admins."));
      });
    return () => {
      cancelled = true;
    };
  }, [open, currentAssigneeId]);

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Assign application"
      description="Only active admins with credit access can be assigned. The change is recorded on the timeline."
      confirmLabel="Assign"
      extra={
        <div className="space-y-1.5 px-1">
          <Label htmlFor="credit-assignee">Assign to</Label>
          {error ? (
            <p className="text-sm text-red-700">{error}</p>
          ) : (
            <select
              id="credit-assignee"
              className="h-9 w-full rounded-md border bg-white px-2 text-sm"
              value={selected}
              disabled={!assignees}
              onChange={(event) => setSelected(event.target.value)}
            >
              <option value="" disabled>
                {assignees ? "Select an admin" : "Loading admins…"}
              </option>
              {(assignees ?? []).map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.name}
                </option>
              ))}
            </select>
          )}
        </div>
      }
      onConfirm={() => {
        if (!selected || selected === currentAssigneeId) return;
        onConfirm(selected);
      }}
    />
  );
}
