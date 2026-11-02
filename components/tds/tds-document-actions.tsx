"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ReasonDialog } from "@/components/documents/reason-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { listGrades } from "@/lib/api/grades";
import {
  approveTdsDocument,
  mapTdsDocumentGrade,
  rejectTdsDocument,
  type TdsDocument,
} from "@/lib/api/tds";
import {
  DEFAULT_GRADE_SORT,
  EMPTY_GRADE_FILTERS,
  type Grade,
} from "@/types/grade";

const REJECT_PRESETS = [
  "File is unreadable or corrupt.",
  "Document does not match the listed grade / producer.",
  "Wrong document type (not a TDS).",
  "Duplicate of an already verified sheet.",
];

interface Props {
  document: TdsDocument;
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onReload: () => void;
  onPreview: () => void;
  onReplace?: () => void;
}

export function TdsDocumentActions({
  document: doc,
  busy,
  onBusy,
  onReload,
  onPreview,
  onReplace,
}: Props) {
  const [rejectOpen, setRejectOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const canPreview = Boolean(doc.hasFile);
  const canApprove =
    doc.verificationStatus !== "VERIFIED" &&
    Boolean(doc.hasFile) &&
    Boolean(doc.gradeId);
  const canReject = doc.verificationStatus !== "REJECTED";
  const canMap =
    doc.verificationStatus === "NEEDS_MAPPING" ||
    !doc.gradeId ||
    doc.verificationStatus === "PENDING_REVIEW";

  const run = async (fn: () => Promise<unknown>, success: string) => {
    onBusy(true);
    try {
      await fn();
      toast.success(success);
      onReload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
      throw error;
    } finally {
      onBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={busy || !canPreview}
        onClick={onPreview}
      >
        Preview
      </Button>
      {onReplace ? (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={onReplace}
        >
          Replace file
        </Button>
      ) : null}
      {canMap ? (
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => setMapOpen(true)}
        >
          Map grade
        </Button>
      ) : null}
      {canApprove ? (
        <Button
          size="sm"
          disabled={busy}
          onClick={() => setApproveOpen(true)}
        >
          Approve
        </Button>
      ) : null}
      {canReject ? (
        <Button
          size="sm"
          variant="destructive"
          disabled={busy}
          onClick={() => setRejectOpen(true)}
        >
          Reject
        </Button>
      ) : null}

      <ReasonDialog
        open={approveOpen}
        onOpenChange={setApproveOpen}
        title="Approve TDS"
        description="Mark this sheet as verified. Open customer TDS requests for the mapped grade will be fulfilled."
        confirmLabel="Approve"
        required={false}
        placeholder="Optional review notes"
        onSubmit={async (notes) => {
          await run(
            () => approveTdsDocument(doc.id, notes || undefined),
            "TDS approved",
          );
        }}
      />

      <ReasonDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject TDS"
        description="Reject this document. Provide a short reason for the audit trail."
        confirmLabel="Reject"
        destructive
        presets={REJECT_PRESETS}
        placeholder="Reason for rejection"
        onSubmit={async (reason) => {
          await run(() => rejectTdsDocument(doc.id, reason), "TDS rejected");
        }}
      />

      {mapOpen ? (
        <MapGradeDialog
          document={doc}
          busy={busy}
          onClose={() => setMapOpen(false)}
          onConfirm={async (gradeId, notes) => {
            await run(
              () => mapTdsDocumentGrade(doc.id, gradeId, notes || undefined),
              "Mapped to catalogue grade",
            );
            setMapOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function MapGradeDialog({
  document: doc,
  busy,
  onClose,
  onConfirm,
}: {
  document: TdsDocument;
  busy: boolean;
  onClose: () => void;
  onConfirm: (gradeId: string, notes: string) => Promise<void>;
}) {
  const [query, setQuery] = useState(doc.gradeCode || doc.documentTitle);
  const [results, setResults] = useState<Grade[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Grade | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const current = ++seq.current;
    const t = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      setSearching(true);
      setError(null);
      try {
        const { grades } = await listGrades(
          { ...EMPTY_GRADE_FILTERS, search: query.trim() },
          DEFAULT_GRADE_SORT,
          1,
          15,
        );
        if (current === seq.current) setResults(grades);
      } catch (e) {
        if (current === seq.current)
          setError(e instanceof Error ? e.message : "Search failed");
      } finally {
        if (current === seq.current) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && !saving && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Map TDS to a grade</DialogTitle>
          <DialogDescription>
            {doc.categoryCode} · {doc.gradeCode} · {doc.producerName}
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="Search catalogue grades"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {searching ? (
            <p className="text-sm text-muted-foreground">Searching…</p>
          ) : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {!searching &&
          !error &&
          query.trim().length >= 2 &&
          results.length === 0 ? (
            <p className="text-sm text-muted-foreground">No grades found.</p>
          ) : null}
          {results.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelected(g)}
              className={`w-full rounded border px-3 py-2 text-left text-sm ${
                selected?.id === g.id
                  ? "border-primary bg-primary/5"
                  : "hover:bg-slate-50"
              }`}
            >
              <span className="font-medium">{g.gradeName}</span>
              <span className="block text-xs text-muted-foreground">
                {g.gradeCode} · {g.categoryName} · {g.status}
              </span>
            </button>
          ))}
        </div>
        <Textarea
          rows={2}
          maxLength={2000}
          placeholder="Optional notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={busy || saving}
          >
            Cancel
          </Button>
          <Button
            disabled={busy || saving || !selected}
            onClick={() => {
              if (!selected) return;
              setSaving(true);
              void onConfirm(selected.id, notes.trim()).finally(() =>
                setSaving(false),
              );
            }}
          >
            Map grade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
