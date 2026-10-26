"use client";

import { useActionState, useRef, useEffect } from "react";
import { convidarClienteAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { UserPlus } from "lucide-react";
import { ABAS_CLIENTE } from "@/lib/types";

export function ConvidarClienteForm({ obraId }: { obraId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const action = convidarClienteAction.bind(null, obraId);
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="nomeCliente">Nome do cliente</Label>
        <Input id="nomeCliente" name="nome" required placeholder="Ex: Elizandra" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="emailCliente">E-mail</Label>
        <Input id="emailCliente" name="email" type="email" required placeholder="cliente@email.com" />
      </div>
      <div className="flex flex-col gap-2">
        <Label>Abas visíveis para esse cliente</Label>
        <div className="flex flex-col gap-1.5">
          {ABAS_CLIENTE.map((aba) => (
            <div key={aba.id} className="flex items-center gap-2">
              <Checkbox id={`aba-${aba.id}`} name="abas" value={aba.id} defaultChecked />
              <Label htmlFor={`aba-${aba.id}`} className="font-normal">
                {aba.label}
              </Label>
            </div>
          ))}
        </div>
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.ok && (
        <p className="text-sm text-emerald-700 dark:text-emerald-500">
          Convite enviado! O cliente vai receber um link de acesso por e-mail.
        </p>
      )}
      <Button type="submit" disabled={pending} className="gap-2">
        <UserPlus className="size-4" />
        {pending ? "Convidando..." : "Convidar cliente"}
      </Button>
    </form>
  );
}
