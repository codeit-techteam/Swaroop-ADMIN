"use client";

import { useState } from "react";

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
import { buildImportPreview, IMPORT_ISSUE_LABELS, parseCsv } from "@/lib/grade-utils";
import type { Grade, GradeImportPreview, GradeInput } from "@/types/grade";

interface GradeImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  grades: Grade[];
  onImport: (inputs: GradeInput[]) => Promise<void>;
}

export function GradeImportDialog({ open, onOpenChange, grades, onImport }: GradeImportDialogProps) {
  const [preview, setPreview] = useState<GradeImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  function reset() {
    setPreview(null);
    setError(null);
    setImporting(false);
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    try {
      const records = parseCsv(text);
      if (records.length === 0) {
        setError("The CSV file is empty.");
        setPreview(null);
        return;
      }
      setError(null);
      setPreview(buildImportPreview(records, grades));
    } catch {
      setError("Import failed.");
      setPreview(null);
    }
  }

  const validInputs = preview?.rows.map((row) => row.parsed).filter((item): item is GradeInput => Boolean(item)) ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import Grades</DialogTitle>
          <DialogDescription>
            CSV columns: gradeCode, gradeName, category, description, applications, status, customerVisible,
            sellerVisible, sortOrder
          </DialogDescription>
        </DialogHeader>
        <Input
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => void handleFile(event.target.files?.[0])}
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {preview ? (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded border bg-emerald-50 px-3 py-2">
                Valid rows <span className="font-semibold">{preview.validCount}</span>
              </div>
              <div className="rounded border bg-red-50 px-3 py-2">
                Invalid rows <span className="font-semibold">{preview.invalidCount}</span>
              </div>
              <div className="rounded border bg-amber-50 px-3 py-2">
                Duplicate rows <span className="font-semibold">{preview.duplicateCount}</span>
              </div>
            </div>
            <div className="max-h-72 overflow-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead>Row</TableHead>
                    <TableHead>Grade Code</TableHead>
                    <TableHead>Grade Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Validation</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((row) => (
                    <TableRow key={row.rowNumber}>
                      <TableCell>{row.rowNumber}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.parsed?.gradeCode || row.raw.gradeCode || row.raw.grade_code || "—"}
                      </TableCell>
                      <TableCell>{row.parsed?.gradeName || row.raw.gradeName || row.raw.grade_name || "—"}</TableCell>
                      <TableCell>{row.raw.category || "—"}</TableCell>
                      <TableCell className="text-xs text-red-700">
                        {row.issues.length ? row.issues.map((issue) => IMPORT_ISSUE_LABELS[issue]).join("; ") : "OK"}
                      </TableCell>
                      <TableCell>{row.action === "CREATE" ? "Import" : "Skip"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Example: HDPE_FILM,HD Film,HDPE,High-density polyethylene film grade,&quot;Packaging,Film&quot;,ACTIVE,true,true,1
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={validInputs.length === 0 || importing}
            onClick={() => {
              setImporting(true);
              void onImport(validInputs)
                .catch(() => setError("Import failed."))
                .finally(() => setImporting(false));
            }}
          >
            {importing ? "Importing..." : "Import Valid Rows"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
