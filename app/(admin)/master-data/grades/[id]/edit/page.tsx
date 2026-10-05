"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { GradeForm } from "@/components/grades/grade-form";
import { GradeEmptyState } from "@/components/grades/grade-empty-state";
import { GradeSkeleton } from "@/components/grades/grade-skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { GradeServiceError } from "@/lib/api/grades";
import { GRADE_PERMISSIONS, hasGradePermission } from "@/lib/grade-permissions";
import { useAuthStore } from "@/store/auth-store";
import { useGradeStore } from "@/store/grade-store";
import type { GradeInput } from "@/types/grade";

export default function EditGradePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const detail = useGradeStore((s) => s.detail);
  const detailStatus = useGradeStore((s) => s.detailStatus);
  const loadGrade = useGradeStore((s) => s.loadGrade);
  const updateGrade = useGradeStore((s) => s.updateGrade);
  const [pendingCodeChange, setPendingCodeChange] = useState<GradeInput | null>(null);

  useEffect(() => {
    void loadGrade(params.id);
  }, [loadGrade, params.id]);

  const grade = detail?.id === params.id ? detail : null;

  if (!hasGradePermission(role, GRADE_PERMISSIONS.update)) {
    return <p className="text-sm text-muted-foreground">You do not have permission to edit grades.</p>;
  }

  if ((detailStatus === "loading" || detailStatus === "idle") && !grade) return <GradeSkeleton />;
  if (!grade) {
    return (
      <GradeEmptyState
        filtered
        title="Grade not found"
        description="This grade may have been removed or the identifier is incorrect."
        action={
          <Button type="button" variant="outline" asChild>
            <Link href="/master-data/grades">Back to Grade Master</Link>
          </Button>
        }
      />
    );
  }

  async function handleSave(values: GradeInput, options?: { confirmCodeChange?: boolean }) {
    if (!grade) return;
    if (options?.confirmCodeChange && !pendingCodeChange) {
      setPendingCodeChange(values);
      return;
    }
    try {
      await updateGrade(grade.id, values);
      toast.success("Grade updated successfully.");
      setPendingCodeChange(null);
      router.push(`/master-data/grades/${grade.id}`);
    } catch (error) {
      toast.error(error instanceof GradeServiceError ? error.message : "Unable to save grade.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={`Edit ${grade.gradeName}`}
        description={grade.gradeCode}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data/grades" },
          { label: "Grade Master", href: "/master-data/grades" },
          { label: grade.gradeCode, href: `/master-data/grades/${grade.id}` },
          { label: "Edit" },
        ]}
        actions={
          <Button type="button" variant="outline" asChild>
            <Link href={`/master-data/grades/${grade.id}`}>Cancel</Link>
          </Button>
        }
      />
      <GradeForm
        variant="page"
        mode="edit"
        grade={grade}
        onSave={handleSave}
      />
      <ConfirmDialog
        open={Boolean(pendingCodeChange)}
        onOpenChange={(open) => !open && setPendingCodeChange(null)}
        title="Change Grade Code?"
        description="External systems may already reference this code. Only continue if you intend to remap those references."
        confirmLabel="Change Code"
        destructive
        onConfirm={() => {
          if (!pendingCodeChange) return;
          void handleSave(pendingCodeChange, { confirmCodeChange: false });
        }}
      />
    </div>
  );
}
