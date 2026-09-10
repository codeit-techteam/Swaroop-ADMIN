"use client";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { usageCount } from "@/lib/grade-utils";
import type { Grade } from "@/types/grade";

interface GradeDeleteDialogProps {
  grade: Grade | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function GradeDeleteDialog({ grade, open, onOpenChange, onConfirm }: GradeDeleteDialogProps) {
  const used = grade ? usageCount(grade.usage) : 0;
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={used > 0 ? "Cannot delete grade" : "Delete unused grade?"}
      description={
        used > 0
          ? "This grade is referenced by existing transactions and cannot be deleted. Deactivate it instead to stop new marketplace use."
          : "This grade has no transactional usage and can be removed from Grade Master."
      }
      confirmLabel={used > 0 ? "Close" : "Delete"}
      destructive={used === 0}
      onConfirm={() => {
        if (used === 0) onConfirm();
      }}
    />
  );
}
