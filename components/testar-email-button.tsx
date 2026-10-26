"use client";

import { useTransition, useState } from "react";
import { testarEmailAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export function TestarEmailButton() {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-3">
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const res = await testarEmailAction();
            setMsg(res.ok ? "E-mail de teste enviado!" : res.error ?? "Falha.");
          })
        }
      >
        <Mail className="size-4" />
        {pending ? "Enviando..." : "Testar e-mail"}
      </Button>
      {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
    </div>
  );
}
