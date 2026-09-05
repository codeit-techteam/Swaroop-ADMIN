"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface DetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  contentClassName?: string;
}

export function DetailDrawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  contentClassName,
}: DetailDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn("flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg", contentClassName)}>
        <SheetHeader className="border-b px-5 py-4 text-left">
          <SheetTitle className="text-base">{title}</SheetTitle>
          {description ? <SheetDescription>{description}</SheetDescription> : null}
        </SheetHeader>
        <div className="flex-1 px-5 py-4">{children}</div>
        {footer ? <div className="border-t px-5 py-3">{footer}</div> : null}
      </SheetContent>
    </Sheet>
  );
}

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2 border-b border-slate-100 py-2 text-sm last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="col-span-2 font-medium text-slate-800">{value}</dd>
    </div>
  );
}

export function DrawerFooterLink({
  onClick,
  label = "Open full details",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <Button type="button" variant="outline" className="w-full" onClick={onClick}>
      {label}
    </Button>
  );
}
