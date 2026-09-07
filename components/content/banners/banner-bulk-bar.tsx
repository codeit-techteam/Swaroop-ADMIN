"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, Trash2, Download, ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BannerPriority } from "@/types/banner";

interface BannerBulkBarProps {
  count: number;
  onActivate: () => void;
  onPause: () => void;
  onDelete: () => void;
  onExport: () => void;
  onChangePriority: (priority: BannerPriority) => void;
  onClear: () => void;
}

export function BannerBulkBar({
  count,
  onActivate,
  onPause,
  onDelete,
  onExport,
  onChangePriority,
  onClear,
}: BannerBulkBarProps) {
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
            <Button type="button" size="sm" onClick={onActivate}>
              <Play className="size-3.5" />
              Activate
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onPause}>
              <Pause className="size-3.5" />
              Pause
            </Button>
            <Select onValueChange={(value) => onChangePriority(Number(value) as BannerPriority)}>
              <SelectTrigger className="h-8 w-[150px] bg-white">
                <ArrowUpDown className="size-3.5" />
                <SelectValue placeholder="Change Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">P1 - Highest</SelectItem>
                <SelectItem value="2">P2</SelectItem>
                <SelectItem value="3">P3</SelectItem>
                <SelectItem value="4">P4</SelectItem>
                <SelectItem value="5">P5 - Lowest</SelectItem>
              </SelectContent>
            </Select>
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
