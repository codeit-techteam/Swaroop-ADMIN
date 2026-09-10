"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Eye, EyeOff, Factory, Power, PowerOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { GradeBulkAction } from "@/types/grade";

interface GradeBulkActionsProps {
  count: number;
  onAction: (action: GradeBulkAction) => void;
  onClear: () => void;
  canStatus?: boolean;
  canVisibility?: boolean;
}

export function GradeBulkActions({
  count,
  onAction,
  onClear,
  canStatus = true,
  canVisibility = true,
}: GradeBulkActionsProps) {
  return (
    <AnimatePresence>
      {count > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2"
        >
          <p className="text-sm font-medium text-sky-900">{count} selected</p>
          <div className="flex flex-wrap items-center gap-2">
            {canStatus ? (
              <>
                <Button type="button" size="sm" onClick={() => onAction("ACTIVATE")}>
                  <Power className="size-3.5" />
                  Activate
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => onAction("DEACTIVATE")}>
                  <PowerOff className="size-3.5" />
                  Deactivate
                </Button>
              </>
            ) : null}
            {canVisibility ? (
              <>
                <Button type="button" size="sm" variant="outline" onClick={() => onAction("CUSTOMER_VISIBLE")}>
                  <Eye className="size-3.5" />
                  Customer Visible
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => onAction("CUSTOMER_HIDDEN")}>
                  <EyeOff className="size-3.5" />
                  Customer Hidden
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => onAction("SELLER_VISIBLE")}>
                  <Factory className="size-3.5" />
                  Seller Visible
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => onAction("SELLER_HIDDEN")}>
                  <EyeOff className="size-3.5" />
                  Seller Hidden
                </Button>
              </>
            ) : null}
            <Button type="button" size="sm" variant="ghost" onClick={onClear}>
              Clear
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
