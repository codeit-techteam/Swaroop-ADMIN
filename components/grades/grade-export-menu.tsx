"use client";

import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface GradeExportMenuProps {
  onExportCsv: () => void;
  onExportExcel: () => void;
  disabled?: boolean;
}

export function GradeExportMenu({ onExportCsv, onExportExcel, disabled }: GradeExportMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size="sm" variant="outline" disabled={disabled}>
          <Download className="size-3.5" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onExportCsv}>Export CSV</DropdownMenuItem>
        <DropdownMenuItem onClick={onExportExcel}>Export Excel</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
