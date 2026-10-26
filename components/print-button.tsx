"use client";

import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <Button type="button" className="gap-2 print:hidden" onClick={() => window.print()}>
      <Printer className="size-4" />
      Imprimir / Salvar PDF
    </Button>
  );
}
