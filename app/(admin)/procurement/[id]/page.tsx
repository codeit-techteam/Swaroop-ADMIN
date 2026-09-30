"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { ProcurementRecordPanel } from "@/components/procurement/procurement-record-panel";

export default function ProcurementDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        <Link href="/procurement" className="text-sky-700 hover:underline">Procurement Workbench</Link>
        <span> / Record</span>
      </p>
      <div className="rounded-md border bg-white p-5 shadow-soft">
        <ProcurementRecordPanel id={id} />
      </div>
    </div>
  );
}
