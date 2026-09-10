"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";

import { GradeDetailsContent } from "@/components/grades/grade-details-drawer";
import { GradeEmptyState } from "@/components/grades/grade-empty-state";
import { GradeSkeleton } from "@/components/grades/grade-skeleton";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { usageCount } from "@/lib/grade-utils";
import { useGradeStore } from "@/store/grade-store";

export default function GradeDetailPage() {
  const params = useParams<{ id: string }>();
  const grades = useGradeStore((s) => s.grades);
  const auditEvents = useGradeStore((s) => s.auditEvents);
  const loadStatus = useGradeStore((s) => s.loadStatus);
  const fetchGrades = useGradeStore((s) => s.fetchGrades);

  useEffect(() => {
    void fetchGrades();
  }, [fetchGrades]);

  const grade = grades.find((item) => item.id === params.id || item.gradeCode === params.id);

  if (loadStatus === "loading" && !grade) return <GradeSkeleton />;
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

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={grade.gradeName}
        description={grade.gradeCode}
        breadcrumbs={[
          { label: "Master Data", href: "/master-data/grades" },
          { label: "Grade Master", href: "/master-data/grades" },
          { label: grade.gradeCode },
        ]}
        actions={
          <>
            <Button type="button" variant="outline" asChild>
              <Link href="/master-data/grades">Back</Link>
            </Button>
            <Button type="button" asChild>
              <Link href={`/master-data/grades/${grade.id}/edit`}>Edit</Link>
            </Button>
          </>
        }
      />
      <div className="rounded-md border bg-white p-5 shadow-soft">
        <GradeDetailsContent
          grade={grade}
          used={usageCount(grade.usage)}
          auditEvents={auditEvents.filter((event) => event.gradeId === grade.id || event.gradeCode === grade.gradeCode)}
        />
      </div>
    </div>
  );
}
