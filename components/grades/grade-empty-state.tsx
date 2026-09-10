import { Layers } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/shared/states";

export function GradeEmptyState({
  filtered,
  action,
  title,
  description,
}: {
  filtered: boolean;
  action?: ReactNode;
  title?: string;
  description?: string;
}) {
  if (title) {
    return <EmptyState icon={Layers} title={title} description={description} action={action} />;
  }
  if (filtered) {
    return (
      <EmptyState
        icon={Layers}
        title="No grades match your filters."
        description="Try changing search or filters, or reset to see the full Grade Master."
        action={action}
      />
    );
  }

  return (
    <EmptyState
      icon={Layers}
      title="No grades found"
      description="Create your first grade to make it available across the marketplace."
      action={action}
    />
  );
}
