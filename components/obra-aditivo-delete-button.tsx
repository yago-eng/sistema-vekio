"use client";

import { useTransition } from "react";
import { deleteObraAditivoAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export function ObraAditivoDeleteButton({ id, obraId }: { id: string; obraId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => startTransition(() => deleteObraAditivoAction(id, obraId))}
    >
      <Trash2 className="size-3.5 text-destructive" />
    </Button>
  );
}
