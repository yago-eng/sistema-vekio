"use client";

import { useActionState, useEffect, useRef } from "react";
import { createLembreteAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function LembreteForm() {
  const [state, formAction, pending] = useActionState(createLembreteAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && !state.error) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="titulo">Título</Label>
        <Input id="titulo" name="titulo" placeholder="Ex: Ligar para fornecedor" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="conteudo">Anotação</Label>
        <Textarea id="conteudo" name="conteudo" rows={4} placeholder="Escreva o que quiser..." />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando..." : "Salvar nota"}
      </Button>
    </form>
  );
}
