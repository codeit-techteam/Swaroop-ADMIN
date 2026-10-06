"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { StatusBadge } from "@/components/shared/status-badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GradeServiceError, importGradeCsv, listGradeImports } from "@/lib/api/grades";
import { formatDateTime } from "@/lib/format";
import type { GradeImportBatch, GradeImportSummary } from "@/types/grade";

interface GradeImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: (summary: GradeImportSummary) => void;
}

type Step = "select" | "validating" | "validated" | "importing" | "done";

export function GradeImportDialog({ open, onOpenChange, onImported }: GradeImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("select");
  const [summary, setSummary] = useState<GradeImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<GradeImportBatch[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setStep("select");
    setSummary(null);
    setError(null);
  }

  async function loadHistory() {
    setHistoryError(null);
    try {
      setHistory(await listGradeImports(1, 10));
    } catch (err) {
      setHistoryError(err instanceof GradeServiceError ? err.message : "Unable to load import history.");
    }
  }

  useEffect(() => {
    if (open) void loadHistory();
  }, [open]);

  async function validate(selected: File) {
    setStep("validating");
    setError(null);
    setSummary(null);
    try {
      setSummary(await importGradeCsv(selected, true));
      setStep("validated");
    } catch (err) {
      setError(err instanceof GradeServiceError ? err.message : "Validation failed.");
      setStep("select");
    }
  }

  async function runImport() {
    if (!file) return;
    setStep("importing");
    setError(null);
    try {
      const result = await importGradeCsv(file, false);
      setSummary(result);
      setStep("done");
      toast.success(`Grade import completed: ${result.inserted} new, ${result.updated} updated.`);
      onImported(result);
      void loadHistory();
    } catch (err) {
      setError(err instanceof GradeServiceError ? err.message : "Grade import failed. No changes were saved.");
      setStep("validated");
      void loadHistory();
    }
  }

  const busy = step === "validating" || step === "importing";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Source.One Grade Master</DialogTitle>
          <DialogDescription>
            Upload the Source.One CSV (Category, Grade Group, Grade No., Manufacturer, Full Grade Name, In Today&apos;s
            Delhi Price List, Price Today, Producer Price, Producer Price Type). Existing grades are updated in place;
            Admin status and visibility are never overwritten, and grades missing from the file are not deactivated.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="import">
          <TabsList className="mb-3">
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
          <TabsContent value="import" className="space-y-3">
            <Input
              type="file"
              accept=".csv,text/csv"
              disabled={busy}
              onChange={(event) => {
                const selected = event.target.files?.[0] ?? null;
                setFile(selected);
                if (selected) void validate(selected);
              }}
            />
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            {step === "validating" ? <p className="text-sm text-muted-foreground">Validating file on the server…</p> : null}
            {step === "importing" ? (
              <p className="text-sm text-muted-foreground">Importing grades… this can take a minute for large files.</p>
            ) : null}
            {summary ? <ImportSummary summary={summary} /> : null}
            {!summary && step === "select" && !error ? (
              <p className="text-sm text-muted-foreground">
                The file is validated first (dry run). Nothing is saved until you confirm the import.
              </p>
            ) : null}
          </TabsContent>
          <TabsContent value="history">
            <ImportHistory history={history} error={historyError} onRetry={() => void loadHistory()} />
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            {step === "done" ? "Close" : "Cancel"}
          </Button>
          {step !== "done" ? (
            <Button
              type="button"
              disabled={step !== "validated" || !summary || summary.grades === 0}
              onClick={() => void runImport()}
            >
              {step === "importing" ? "Importing…" : "Import Grades"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ImportSummary({ summary }: { summary: GradeImportSummary }) {
  const duplicateTiles: Array<[string, number, string]> =
    summary.exactDuplicateRows !== undefined && summary.keyMergedRows !== undefined
      ? [
          ["Exact duplicates", summary.exactDuplicateRows, summary.exactDuplicateRows ? "bg-amber-50" : "bg-slate-50"],
          ["Same grade merged", summary.keyMergedRows, summary.keyMergedRows ? "bg-amber-50" : "bg-slate-50"],
        ]
      : [["Duplicates merged", summary.duplicateRows, summary.duplicateRows ? "bg-amber-50" : "bg-slate-50"]];
  const tiles: Array<[string, number, string]> = [
    ["Total rows", summary.totalRows, "bg-slate-50"],
    ["Valid rows", summary.validRows, "bg-emerald-50"],
    ["Invalid rows", summary.invalidRows, summary.invalidRows ? "bg-red-50" : "bg-slate-50"],
    ...duplicateTiles,
    [summary.dryRun ? "Will insert" : "Inserted", summary.inserted, "bg-sky-50"],
    [summary.dryRun ? "Already present" : "Updated", summary.dryRun ? summary.unchanged : summary.updated, "bg-sky-50"],
    ["Unchanged", summary.dryRun ? 0 : summary.unchanged, "bg-slate-50"],
    ["In DB, not in file", summary.notInFile, "bg-slate-50"],
  ];
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">
        {summary.dryRun ? "Validation result" : "Import completed"} · {summary.fileName} · {summary.grades} unique grades
      </p>
      <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        {tiles
          .filter(([label]) => !(summary.dryRun && label === "Unchanged"))
          .map(([label, value, tone]) => (
            <div key={label} className={`rounded border px-3 py-2 ${tone}`}>
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="text-lg font-semibold">{value}</p>
            </div>
          ))}
      </div>
      {summary.keyMergedRows ? (
        <p className="text-xs text-muted-foreground">
          Rows with the same Category, Grade Group, Grade No. and Manufacturer become one grade. The priced Delhi-list
          row is kept as written; every merged line number is listed in the import report.
        </p>
      ) : null}
      {!summary.dryRun ? (
        <p className="text-xs text-muted-foreground">
          {summary.categoriesCreated} categories and {summary.gradeGroupsCreated} grade groups created. The full validation
          report is stored with this import in the history.
        </p>
      ) : null}
    </div>
  );
}

function ImportHistory({
  history,
  error,
  onRetry,
}: {
  history: GradeImportBatch[] | null;
  error: string | null;
  onRetry: () => void;
}) {
  if (error) {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-red-600">{error}</p>
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          Retry
        </Button>
      </div>
    );
  }
  if (!history) return <p className="text-sm text-muted-foreground">Loading import history…</p>;
  if (history.length === 0) return <p className="text-sm text-muted-foreground">No grade imports yet.</p>;
  return (
    <div className="max-h-80 overflow-auto rounded border">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 hover:bg-slate-50">
            <TableHead>Started</TableHead>
            <TableHead>File</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Rows</TableHead>
            <TableHead className="text-right">Inserted</TableHead>
            <TableHead className="text-right">Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((batch) => (
            <TableRow key={batch.id}>
              <TableCell className="whitespace-nowrap text-xs">{formatDateTime(batch.startedAt)}</TableCell>
              <TableCell className="max-w-[200px] truncate text-xs" title={batch.errorMessage ?? batch.fileName}>
                {batch.fileName}
                {batch.errorMessage ? <p className="truncate text-red-600">{batch.errorMessage}</p> : null}
              </TableCell>
              <TableCell className="text-xs">{batch.trigger}</TableCell>
              <TableCell>
                <StatusBadge value={batch.status} />
              </TableCell>
              <TableCell className="text-right text-xs">{batch.totalRows}</TableCell>
              <TableCell className="text-right text-xs">{batch.insertedRows}</TableCell>
              <TableCell className="text-right text-xs">{batch.updatedRows}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
