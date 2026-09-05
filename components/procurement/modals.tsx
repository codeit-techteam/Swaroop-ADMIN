"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import { formatInrExact } from "@/lib/format";
import { gstBreakdown } from "@/lib/procurement";
import { cn } from "@/lib/utils";
import { useDataStore } from "@/store/data-store";
import { useProcurementStore } from "@/store/procurement-store";
import type { Procurement } from "@/types";

function useModalItem() {
  const modal = useProcurementStore((s) => s.modal);
  const procurements = useProcurementStore((s) => s.procurements);
  const id = "id" in modal ? modal.id : null;
  return procurements.find((item) => item.id === id) ?? null;
}

export function ProcurementModals() {
  const modal = useProcurementStore((s) => s.modal);
  const closeModal = useProcurementStore((s) => s.closeModal);
  const item = useModalItem();

  return (
    <>
      <ApproveModal open={modal.type === "approve"} item={item} onClose={closeModal} />
      <RejectModal open={modal.type === "reject"} item={item} onClose={closeModal} />
      <SendBackModal open={modal.type === "send-back"} item={item} onClose={closeModal} />
      <CounterOfferModal open={modal.type === "counter"} item={item} onClose={closeModal} />
      <CreatePoModal open={modal.type === "create-po"} item={item} onClose={closeModal} />
      <DispatchModal open={modal.type === "dispatch"} item={item} onClose={closeModal} />
      <NewProcurementModal open={modal.type === "new-procurement"} onClose={closeModal} />
    </>
  );
}

function ApproveModal({ open, item, onClose }: { open: boolean; item: Procurement | null; onClose: () => void }) {
  const approveProcurement = useProcurementStore((s) => s.approveProcurement);
  if (!item) return null;
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Procurement Request?</DialogTitle>
          <DialogDescription>This updates the record status, KPIs, timeline and activity log.</DialogDescription>
        </DialogHeader>
        <dl className="rounded-md border bg-slate-50 px-3 py-2 text-sm">
          <Row label="Procurement ID" value={item.id} />
          <Row label="Commodity" value={item.commodity} />
          <Row label="Supplier" value={item.supplier} />
          <Row label="Estimated Cost" value={formatInrExact(item.estimatedCost)} />
          <Row label="Current Status" value={item.status} />
        </dl>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              approveProcurement(item.id);
              toast.success(`${item.id} approved`);
            }}
          >
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const reasonSchema = z.object({
  reason: z.string().min(8, "Please provide at least 8 characters"),
});

function RejectModal({ open, item, onClose }: { open: boolean; item: Procurement | null; onClose: () => void }) {
  const rejectProcurement = useProcurementStore((s) => s.rejectProcurement);
  const form = useForm<z.infer<typeof reasonSchema>>({
    resolver: zodResolver(reasonSchema),
    defaultValues: { reason: "" },
  });
  if (!item) return null;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          form.reset();
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject {item.id}</DialogTitle>
          <DialogDescription>A rejection reason is required.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={form.handleSubmit((values) => {
            rejectProcurement(item.id, values.reason);
            toast.success(`${item.id} rejected`);
          })}
        >
          <Field label="Rejection reason" error={form.formState.errors.reason?.message}>
            <Textarea {...form.register("reason")} rows={4} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="destructive">
              Reject
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SendBackModal({ open, item, onClose }: { open: boolean; item: Procurement | null; onClose: () => void }) {
  const sendBackProcurement = useProcurementStore((s) => s.sendBackProcurement);
  const form = useForm<z.infer<typeof reasonSchema>>({
    resolver: zodResolver(reasonSchema),
    defaultValues: { reason: "" },
  });
  if (!item) return null;
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          form.reset();
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send back {item.id}</DialogTitle>
          <DialogDescription>Comments are required before returning this request to review.</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={form.handleSubmit((values) => {
            sendBackProcurement(item.id, values.reason);
            toast.success(`${item.id} sent back to review`);
          })}
        >
          <Field label="Comments" error={form.formState.errors.reason?.message}>
            <Textarea {...form.register("reason")} rows={4} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Send Back</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const counterSchema = z.object({
  counterPrice: z.coerce.number().positive("Enter a valid counter price"),
  remarks: z.string().min(4, "Remarks are required"),
});

function CounterOfferModal({ open, item, onClose }: { open: boolean; item: Procurement | null; onClose: () => void }) {
  const submitCounterOffer = useProcurementStore((s) => s.submitCounterOffer);
  const form = useForm<z.infer<typeof counterSchema>>({
    resolver: zodResolver(counterSchema),
    defaultValues: {
      counterPrice: item?.negotiation?.adminTargetPrice ?? item?.negotiatedPrice ?? 0,
      remarks: "",
    },
  });
  if (!item) return null;
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Counter Offer · {item.id}</DialogTitle>
          <DialogDescription>
            Latest supplier price {formatInrExact(item.negotiation?.latestPrice ?? 0)} / {item.unit}
          </DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={form.handleSubmit((values) => {
            submitCounterOffer(item.id, values);
            toast.success(`Counter offer submitted for ${item.commodity}`);
          })}
        >
          <Field label="Counter Price" error={form.formState.errors.counterPrice?.message}>
            <Input type="number" step="0.01" {...form.register("counterPrice")} />
          </Field>
          <Field label="Remarks" error={form.formState.errors.remarks?.message}>
            <Textarea {...form.register("remarks")} rows={3} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Submit Counter</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const poSchema = z.object({
  poNumber: z.string().min(3),
  sellerName: z.string().min(2),
  customerName: z.string().min(2),
  commodity: z.string().min(2),
  grade: z.string().min(2),
  quantity: z.coerce.number().positive(),
  price: z.coerce.number().positive(),
  deliveryLocation: z.string().min(2),
  paymentTerms: z.string().min(2),
  expectedDelivery: z.string().min(4),
  remarks: z.string().optional(),
});

function CreatePoModal({ open, item, onClose }: { open: boolean; item: Procurement | null; onClose: () => void }) {
  const createPurchaseOrder = useProcurementStore((s) => s.createPurchaseOrder);
  const form = useForm<z.infer<typeof poSchema>>({
    resolver: zodResolver(poSchema),
    values: item
      ? {
          poNumber: item.poNumber ?? item.id,
          sellerName: item.sellerName ?? item.supplier,
          customerName: item.customerName,
          commodity: item.commodity,
          grade: item.grade,
          quantity: item.quantity,
          price: item.negotiatedPrice ?? Math.round(item.estimatedCost / Math.max(item.quantity, 1)),
          deliveryLocation: item.deliveryLocation,
          paymentTerms: item.paymentTerms,
          expectedDelivery: item.requiredDeliveryDate.slice(0, 10),
          remarks: item.remarks ?? "",
        }
      : undefined,
  });
  const quantity = form.watch("quantity") ?? 0;
  const price = form.watch("price") ?? 0;
  const totals = gstBreakdown(Number(quantity) * Number(price));
  if (!item) return null;
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create PO</DialogTitle>
          <DialogDescription>GST is calculated at 18% on the subtotal.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={form.handleSubmit((values) => {
            createPurchaseOrder(item.id, values);
            toast.success(`PO ${values.poNumber} created`);
          })}
        >
          <Field label="PO Number" error={form.formState.errors.poNumber?.message}>
            <Input {...form.register("poNumber")} />
          </Field>
          <Field label="Supplier" error={form.formState.errors.sellerName?.message}>
            <Input {...form.register("sellerName")} />
          </Field>
          <Field label="Customer" error={form.formState.errors.customerName?.message}>
            <Input {...form.register("customerName")} />
          </Field>
          <Field label="Commodity" error={form.formState.errors.commodity?.message}>
            <Input {...form.register("commodity")} />
          </Field>
          <Field label="Grade" error={form.formState.errors.grade?.message}>
            <Input {...form.register("grade")} />
          </Field>
          <Field label="Quantity" error={form.formState.errors.quantity?.message}>
            <Input type="number" step="0.01" {...form.register("quantity")} />
          </Field>
          <Field label="Price / MT" error={form.formState.errors.price?.message}>
            <Input type="number" step="0.01" {...form.register("price")} />
          </Field>
          <Field label="Delivery Location" error={form.formState.errors.deliveryLocation?.message}>
            <Input {...form.register("deliveryLocation")} />
          </Field>
          <Field label="Payment Terms" error={form.formState.errors.paymentTerms?.message}>
            <Input {...form.register("paymentTerms")} />
          </Field>
          <Field label="Expected Delivery" error={form.formState.errors.expectedDelivery?.message}>
            <Input type="date" {...form.register("expectedDelivery")} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Remarks">
              <Textarea {...form.register("remarks")} rows={2} />
            </Field>
          </div>
          <div className="sm:col-span-2 grid grid-cols-3 gap-2 rounded-md border bg-slate-50 p-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Subtotal</p>
              <p className="font-semibold">{formatInrExact(totals.subtotal)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">GST (18%)</p>
              <p className="font-semibold">{formatInrExact(totals.gst)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total PO Value</p>
              <p className="font-semibold">{formatInrExact(totals.total)}</p>
            </div>
          </div>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create PO</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const dispatchSchema = z.object({
  vehicle: z.string().min(3),
  driver: z.string().min(2),
  loadingLocation: z.string().min(2),
  destination: z.string().min(2),
  dispatchDate: z.string().min(4),
  expectedArrival: z.string().min(4),
});

function DispatchModal({ open, item, onClose }: { open: boolean; item: Procurement | null; onClose: () => void }) {
  const createDispatch = useProcurementStore((s) => s.createDispatch);
  const form = useForm<z.infer<typeof dispatchSchema>>({
    resolver: zodResolver(dispatchSchema),
    values: item
      ? {
          vehicle: item.dispatch?.vehicle ?? "",
          driver: item.dispatch?.driver ?? "",
          loadingLocation: item.dispatch?.loadingLocation ?? "",
          destination: item.dispatch?.destination ?? item.deliveryLocation,
          dispatchDate: new Date().toISOString().slice(0, 10),
          expectedArrival: item.requiredDeliveryDate.slice(0, 10),
        }
      : undefined,
  });
  if (!item) return null;
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Dispatch</DialogTitle>
          <DialogDescription>Hands this procurement to Logistics / shipment tracking.</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={form.handleSubmit((values) => {
            createDispatch(item.id, values);
            toast.success(`Dispatch created for ${item.id}`);
          })}
        >
          <Field label="Vehicle" error={form.formState.errors.vehicle?.message}>
            <Input {...form.register("vehicle")} placeholder="MH-04-BX-2211" />
          </Field>
          <Field label="Driver" error={form.formState.errors.driver?.message}>
            <Input {...form.register("driver")} />
          </Field>
          <Field label="Loading Location" error={form.formState.errors.loadingLocation?.message}>
            <Input {...form.register("loadingLocation")} />
          </Field>
          <Field label="Destination" error={form.formState.errors.destination?.message}>
            <Input {...form.register("destination")} />
          </Field>
          <Field label="Dispatch Date" error={form.formState.errors.dispatchDate?.message}>
            <Input type="date" {...form.register("dispatchDate")} />
          </Field>
          <Field label="Expected Arrival" error={form.formState.errors.expectedArrival?.message}>
            <Input type="date" {...form.register("expectedArrival")} />
          </Field>
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save Dispatch</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const newSchema = z.object({
  customerId: z.string().min(1, "Select a valid customer"),
  commodity: z.string().min(1, "Select a valid commodity"),
  grade: z.string().min(1),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  requiredDeliveryDate: z
    .string()
    .min(1, "Delivery date is required")
    .refine((value) => !Number.isNaN(Date.parse(value)), "Enter a valid date"),
  deliveryLocation: z.string().min(2),
  preferredSupplier: z.string().optional(),
  paymentTerms: z.string().min(2),
  remarks: z.string().optional(),
});

function NewProcurementModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createProcurement = useProcurementStore((s) => s.createProcurement);
  const allCustomers = useDataStore((s) => s.customers);
  const products = useDataStore((s) => s.products);
  const allSellers = useDataStore((s) => s.sellers);
  const customers = allCustomers.filter((item) => item.status === "Active");
  const sellers = allSellers.filter((item) => item.status === "Active");
  const form = useForm<z.infer<typeof newSchema>>({
    resolver: zodResolver(newSchema),
    defaultValues: {
      customerId: "",
      commodity: "",
      grade: "",
      quantity: 1,
      requiredDeliveryDate: "",
      deliveryLocation: "",
      preferredSupplier: "",
      paymentTerms: "Post Invoice",
      remarks: "",
    },
  });

  const selectedCustomer = customers.find((item) => item.id === form.watch("customerId"));
  const selectedProduct = products.find((item) => item.grade === form.watch("grade"));

  const submit = (mode: "draft" | "submit") =>
    form.handleSubmit((values) => {
      const customer = customers.find((item) => item.id === values.customerId);
      const product = products.find((item) => item.grade === values.grade);
      if (!customer) {
        form.setError("customerId", { message: "Select a valid customer" });
        return;
      }
      if (!product && !values.commodity) {
        form.setError("commodity", { message: "Select a valid commodity" });
        return;
      }
      const seller = sellers.find((item) => item.company === values.preferredSupplier);
      const created = createProcurement(
        {
          customerId: customer.id,
          customerName: customer.company,
          commodity: product?.grade ?? values.commodity,
          grade: values.grade,
          quantity: values.quantity,
          requiredDeliveryDate: values.requiredDeliveryDate,
          deliveryLocation: values.deliveryLocation,
          preferredSupplier: values.preferredSupplier || undefined,
          preferredSellerId: seller?.id,
          paymentTerms: values.paymentTerms,
          remarks: values.remarks,
          estimatedCost: values.quantity * 8000,
        },
        mode,
      );
      toast.success(mode === "draft" ? `${created.id} saved as draft` : `${created.id} submitted`);
      form.reset();
    })();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          form.reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>New Procurement</DialogTitle>
          <DialogDescription>Creates an Admin control-tower record for a Customer request.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Customer" error={form.formState.errors.customerId?.message}>
            <select className={selectClass} {...form.register("customerId")}>
              <option value="">Select customer</option>
              {customers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.company}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Commodity" error={form.formState.errors.commodity?.message}>
            <select
              className={selectClass}
              {...form.register("commodity")}
              onChange={(event) => {
                form.setValue("commodity", event.target.value);
                const match = products.find((item) => item.commodity === event.target.value || item.grade === event.target.value);
                if (match) form.setValue("grade", match.grade);
              }}
            >
              <option value="">Select commodity</option>
              {[...new Set(products.map((item) => item.grade))].map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Grade" error={form.formState.errors.grade?.message}>
            <Input {...form.register("grade")} />
          </Field>
          <Field label="Quantity (MT)" error={form.formState.errors.quantity?.message}>
            <Input type="number" step="0.01" {...form.register("quantity")} />
          </Field>
          <Field label="Required Delivery Date" error={form.formState.errors.requiredDeliveryDate?.message}>
            <Input type="date" {...form.register("requiredDeliveryDate")} />
          </Field>
          <Field label="Delivery Location" error={form.formState.errors.deliveryLocation?.message}>
            <Input
              {...form.register("deliveryLocation")}
              placeholder={selectedCustomer?.addresses[0] ?? "Location"}
            />
          </Field>
          <Field label="Preferred Supplier">
            <select className={selectClass} {...form.register("preferredSupplier")}>
              <option value="">None</option>
              {sellers.map((item) => (
                <option key={item.id} value={item.company}>
                  {item.company}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Payment Terms" error={form.formState.errors.paymentTerms?.message}>
            <select className={selectClass} {...form.register("paymentTerms")}>
              <option>Post Invoice</option>
              <option>Advance</option>
              <option>Credit 15</option>
              <option>Credit 30</option>
              <option>LC</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Remarks">
              <Textarea {...form.register("remarks")} rows={2} />
            </Field>
          </div>
        </div>
        {selectedProduct ? (
          <p className="text-xs text-muted-foreground">
            Catalog: {selectedProduct.commodity} · {selectedProduct.manufacturer} · {selectedProduct.location}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => submit("draft")}>
            Save Draft
          </Button>
          <Button type="button" onClick={() => submit("submit")}>
            Submit Procurement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 py-1.5 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

const selectClass = cn(
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
);

