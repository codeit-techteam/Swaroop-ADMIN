"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getCategories, listGrades } from "@/lib/api/grades";
import {
  GRADE_REQUEST_STATUS_LABELS,
  GRADE_REQUEST_TRANSITIONS,
  DIRECT_STATUSES,
  REASON_REQUIRED,
  addGradeRequestNote,
  assignGradeRequest,
  createGradeFromRequest,
  mapGradeRequestToGrade,
  requestGradeRequestInfo,
  updateGradeRequestStatus,
  type GradeRequest,
  type GradeRequestDetail,
  type GradeRequestStatus,
} from "@/lib/api/grade-requests";
import { DEFAULT_GRADE_SORT, EMPTY_GRADE_FILTERS, type Grade, type GradeCategory } from "@/types/grade";

type Mode = "status" | "info" | "note" | "map" | "create" | null;

interface Props {
  request: GradeRequest;
  /** Called with the refreshed record after any successful action. */
  onChanged: (updated: GradeRequestDetail | null) => void;
  onReload: () => void;
}

/** Workflow actions for one request. Every action is validated and audited server-side. */
export function GradeRequestActions({ request, onChanged, onReload }: Props) {
  const [mode, setMode] = useState<Mode>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<GradeRequestStatus | "">("");
  const [message, setMessage] = useState("");

  const open = request.isOpen;
  const nextStatuses = GRADE_REQUEST_TRANSITIONS[request.status].filter((s) => DIRECT_STATUSES.includes(s));
  const canMap = open && request.status !== "INFO_REQUIRED" && !request.resolvedGrade;
  const canRequestInfo = GRADE_REQUEST_TRANSITIONS[request.status].includes("INFO_REQUIRED");

  const close = () => {
    setMode(null);
    setMessage("");
    setStatus("");
  };

  const run = async <T,>(fn: () => Promise<T>, success: string, after?: (r: T) => void) => {
    setBusy(true);
    try {
      const result = await fn();
      toast.success(success);
      after?.(result);
      close();
      onReload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const needsReason = status !== "" && REASON_REQUIRED.includes(status);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {open && !request.assignedAdmin ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void run(() => assignGradeRequest(request.id), "Assigned to you", onChanged)}
          >
            Assign to me
          </Button>
        ) : null}
        {canRequestInfo ? (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setMode("info")}>
            Request information
          </Button>
        ) : null}
        {canMap ? (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setMode("map")}>
            Map to existing grade
          </Button>
        ) : null}
        {canMap ? (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => setMode("create")}>
            Create new grade
          </Button>
        ) : null}
        {nextStatuses.length > 0 ? (
          <Button size="sm" disabled={busy} onClick={() => setMode("status")}>
            Update status
          </Button>
        ) : null}
        <Button size="sm" variant="outline" disabled={busy} onClick={() => setMode("note")}>
          Add internal note
        </Button>
      </div>

      {/* Status ------------------------------------------------------------ */}
      <Dialog open={mode === "status"} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update status</DialogTitle>
            <DialogDescription>
              Currently {GRADE_REQUEST_STATUS_LABELS[request.status]}. The customer is notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {nextStatuses.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  type="button"
                  variant={status === s ? "default" : "outline"}
                  onClick={() => setStatus(s)}
                >
                  {GRADE_REQUEST_STATUS_LABELS[s]}
                </Button>
              ))}
            </div>
            {status ? (
              <div className="space-y-1.5">
                <Label htmlFor="gr-status-msg">
                  Message to customer{needsReason ? " (required)" : " (optional)"}
                </Label>
                <Textarea
                  id="gr-status-msg"
                  rows={3}
                  maxLength={2000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button
              disabled={busy || !status || (needsReason && message.trim().length < 3)}
              onClick={() =>
                status &&
                void run(
                  () => updateGradeRequestStatus(request.id, status, message.trim() || undefined),
                  `Status set to ${GRADE_REQUEST_STATUS_LABELS[status]}`,
                  onChanged,
                )
              }
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Request info ------------------------------------------------------- */}
      <Dialog open={mode === "info"} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request additional information</DialogTitle>
            <DialogDescription>This message is shown to the customer in the app and by notification.</DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            maxLength={2000}
            placeholder="e.g. Please share the MFI, density and the TDS for the grade."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button
              disabled={busy || message.trim().length < 5}
              onClick={() =>
                void run(
                  () => requestGradeRequestInfo(request.id, message.trim()),
                  "Information requested",
                  onChanged,
                )
              }
            >
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Internal note ------------------------------------------------------ */}
      <Dialog open={mode === "note"} onOpenChange={(o) => !o && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Internal note</DialogTitle>
            <DialogDescription>Visible to admins only — never shown to the customer.</DialogDescription>
          </DialogHeader>
          <Textarea
            rows={4}
            maxLength={4000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={close} disabled={busy}>
              Cancel
            </Button>
            <Button
              disabled={busy || !message.trim()}
              onClick={() =>
                void run(() => addGradeRequestNote(request.id, message.trim()), "Note saved", onChanged)
              }
            >
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {mode === "map" ? (
        <MapGradeDialog
          request={request}
          busy={busy}
          onClose={close}
          onConfirm={(gradeId, msg) =>
            void run(
              () => mapGradeRequestToGrade(request.id, { gradeId, message: msg || undefined }),
              "Mapped to catalogue grade",
              onChanged,
            )
          }
        />
      ) : null}

      {mode === "create" ? (
        <CreateGradeDialog
          request={request}
          busy={busy}
          onClose={close}
          onConfirm={(input) =>
            void run(
              () => createGradeFromRequest(request.id, input),
              "Grade created (unpublished) — publish it from Grade Master",
              (r) => onChanged(r.request),
            )
          }
        />
      ) : null}
    </div>
  );
}

function MapGradeDialog({
  request,
  busy,
  onClose,
  onConfirm,
}: {
  request: GradeRequest;
  busy: boolean;
  onClose: () => void;
  onConfirm: (gradeId: string, message: string) => void;
}) {
  const [query, setQuery] = useState(request.gradeName);
  const [results, setResults] = useState<Grade[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Grade | null>(null);
  const [message, setMessage] = useState("");
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
        if (current === seq.current) setError(e instanceof Error ? e.message : "Search failed");
      } finally {
        if (current === seq.current) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Map to an existing grade</DialogTitle>
          <DialogDescription>
            Requested: {request.gradeName}
            {request.manufacturer ? ` · ${request.manufacturer}` : ""}
          </DialogDescription>
        </DialogHeader>
        <Input placeholder="Search catalogue grades" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="max-h-56 space-y-1 overflow-y-auto">
          {searching ? <p className="text-sm text-muted-foreground">Searching…</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {!searching && !error && query.trim().length >= 2 && results.length === 0 ? (
            <p className="text-sm text-muted-foreground">No grades found. You can create a new grade instead.</p>
          ) : null}
          {results.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelected(g)}
              className={`w-full rounded border px-3 py-2 text-left text-sm ${
                selected?.id === g.id ? "border-primary bg-primary/5" : "hover:bg-slate-50"
              }`}
            >
              <span className="font-medium">{g.gradeName}</span>
              <span className="block text-xs text-muted-foreground">
                {g.gradeCode} · {g.categoryName} · {g.status}
                {g.customerVisible ? "" : " · hidden from customers"}
              </span>
            </button>
          ))}
        </div>
        <Textarea
          rows={2}
          maxLength={2000}
          placeholder="Optional message to the customer"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button disabled={busy || !selected} onClick={() => selected && onConfirm(selected.id, message.trim())}>
            Map grade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreateGradeDialog({
  request,
  busy,
  onClose,
  onConfirm,
}: {
  request: GradeRequest;
  busy: boolean;
  onClose: () => void;
  onConfirm: (input: {
    code: string;
    name: string;
    categoryId: string;
    manufacturer?: string;
    gradeGroup?: string;
    gradeNo?: string;
    description?: string;
    message?: string;
  }) => void;
}) {
  const [categories, setCategories] = useState<GradeCategory[]>([]);
  const [categoryId, setCategoryId] = useState(request.category?.id ?? "");
  const [code, setCode] = useState(request.gradeName.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, ""));
  const [name, setName] = useState(request.gradeName);
  const [manufacturer, setManufacturer] = useState(request.manufacturer ?? "");
  const [gradeNo, setGradeNo] = useState("");
  const [description, setDescription] = useState(request.application ?? "");
  const [message, setMessage] = useState("");

  useEffect(() => {
    void getCategories()
      .then(setCategories)
      .catch(() => toast.error("Unable to load categories"));
  }, []);

  const valid = code.trim().length >= 2 && name.trim().length > 0 && categoryId;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create catalogue grade</DialogTitle>
          <DialogDescription>
            The grade is created unpublished (inactive, hidden from customers and sellers). Publish it from Grade
            Master after verification.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="space-y-1.5">
            <Label>Category</Label>
            <select
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Select a category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {request.materialCategory ? (
              <p className="text-xs text-muted-foreground">Customer asked for: {request.materialCategory}</p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Grade code</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} maxLength={64} />
            </div>
            <div className="space-y-1.5">
              <Label>Grade no.</Label>
              <Input value={gradeNo} onChange={(e) => setGradeNo(e.target.value)} maxLength={64} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Grade name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label>Manufacturer</Label>
            <Input value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} maxLength={120} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
          </div>
          <div className="space-y-1.5">
            <Label>Message to customer (optional)</Label>
            <Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            disabled={busy || !valid}
            onClick={() =>
              onConfirm({
                code: code.trim(),
                name: name.trim(),
                categoryId,
                manufacturer: manufacturer.trim() || undefined,
                gradeGroup: request.gradeGroup ?? undefined,
                gradeNo: gradeNo.trim() || undefined,
                description: description.trim() || undefined,
                message: message.trim() || undefined,
              })
            }
          >
            Create unpublished grade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
