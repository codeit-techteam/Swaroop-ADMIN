import { StatusBadge } from "@/components/shared/status-badge";
import { STATUS_LABELS } from "@/lib/grade-utils";
import type { GradeStatus } from "@/types/grade";

export function GradeStatusBadge({ status }: { status: GradeStatus }) {
  return <StatusBadge value={STATUS_LABELS[status]} />;
}
