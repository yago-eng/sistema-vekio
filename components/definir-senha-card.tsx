"use client";

import { useActionState, useState } from "react";
import { definirSenhaClienteAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KeyRound } from "lucide-react";

export function DefinirSenhaCard() {
  const [state, formAction, pending] = useActionState(definirSenhaClienteAction, undefined);
  const [dispensado, setDispensado] = useState(false);

  if (state?.ok || dispensado) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="size-4" />
          Defina uma senha pra entrar mais fácil
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Hoje você só entra clicando no link do e-mail, que funciona uma única vez. Com uma senha,
          você acessa direto sempre que quiser — é só usar seu e-mail e essa senha.
        </p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="senha">Nova senha</Label>
            <Input id="senha" name="senha" type="password" required minLength={6} placeholder="Mínimo 6 caracteres" />
          </div>
          <div className="flex flex-1 flex-col gap-2">
            <Label htmlFor="confirmarSenha">Confirmar senha</Label>
            <Input id="confirmarSenha" name="confirmarSenha" type="password" required minLength={6} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar senha"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setDispensado(true)}>
              Depois
            </Button>
          </div>
        </form>
        {state?.error && <p className="mt-2 text-sm text-destructive">{state.error}</p>}
      </CardContent>
    </Card>
  );
}
