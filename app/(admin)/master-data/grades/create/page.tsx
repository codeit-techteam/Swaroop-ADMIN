"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { GradeForm } from "@/components/grades/grade-form";
import { PageHeader } from "@/components/shared/page-header";
import { GradeServiceError } from "@/lib/api/grades";
import { GRADE_PERMISSIONS, hasGradePermission } from "@/lib/grade-permissions";
import { useAuthStore } from "@/store/auth-store";
import { useGradeStore } from "@/store/grade-store";
import type { GradeInput } from "@/types/grade";

export default function CreateGradePage() {
  const router = useRouter();
  const role = useAuthStore((s) => s.user?.role);
  const grades = useGradeStore((s) => s.grades);
  const fetchGrades = useGradeStore((s) => s.fetchGrades);
  const addGrade = useGradeStore((s) => s.addGrade);

  useEffect(() => {
    void fetchGrades();
  }, [fetchGrades]);

  if (!hasGradePermission(role, GRADE_PERMISSIONS.create)) {
    return <p className="text-sm text-muted-foreground">You do not have permission to create grades.</p>;
  }

  async function handleSave(values: GradeInput) {
    try {
      const created = await addGrade(values);
      toast.success("Grade created successfully.");
      router.push(`/master-data/grades/${created.id}`);
    } catch (error) {
      toast.error(error instanceof GradeServiceError ? error.message : "Unable to save grade.");
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Add Grade"
        description="Create a tradable grade once. Customer and Seller apps will consume this record."
        breadcrumbs={[
          { label: "Master Data", href: "/master-data/grades" },
          { label: "Grade Master", href: "/master-data/grades" },
          { label: "Add Grade" },
        ]}
        actions={
          <Link href="/master-data/grades" className="text-sm text-primary hover:underline">
            Back to Grade Master
          </Link>
        }
      />
      <GradeForm
        variant="page"
        mode="create"
        existingCodes={grades.map((item) => item.gradeCode)}
        onSave={handleSave}
      />
    </div>
  );
}
