"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Download, Send, Trash2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";

interface PushBulkBarProps {
  count: number;
  onSend: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onExport: () => void;
  onClear: () => void;
}

export function PushBulkBar({ count, onSend, onCancel, onDelete, onExport, onClear }: PushBulkBarProps) {
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
            <Button type="button" size="sm" onClick={onSend}>
              <Send className="size-3.5" />
              Send now
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onCancel}>
              <XCircle className="size-3.5" />
              Cancel scheduled
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onExport}>
              <Download className="size-3.5" />
              Export
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={onDelete}>
              <Trash2 className="size-3.5" />
              Delete
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={onClear}>
              Clear
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
