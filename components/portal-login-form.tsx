"use client";

import { useActionState, useState } from "react";
import { loginAction, solicitarAcessoClienteAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";

function SolicitarLinkForm({ onVoltar }: { onVoltar: () => void }) {
  const [state, formAction, pending] = useActionState(solicitarAcessoClienteAction, undefined);

  if (state?.ok) {
    return (
      <div className="flex flex-col items-center gap-2 py-4 text-center">
        <Mail className="size-8 text-muted-foreground" />
        <p className="text-sm">
          Se esse e-mail tiver acesso liberado, você vai receber um link em instantes. Confira também
          a caixa de spam.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email-link">E-mail</Label>
        <Input id="email-link" name="email" type="email" required placeholder="seu@email.com" />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Enviando..." : "Enviar link de acesso"}
      </Button>
      <button
        type="button"
        onClick={onVoltar}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Voltar para o login com senha
      </button>
    </form>
  );
}

export function PortalLoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);
  const [modo, setModo] = useState<"senha" | "link">("senha");

  if (modo === "link") {
    return <SolicitarLinkForm onVoltar={() => setModo("senha")} />;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="seu@email.com" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" name="password" type="password" required autoComplete="current-password" />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? "Entrando..." : "Entrar"}
      </Button>
      <button
        type="button"
        onClick={() => setModo("link")}
        className="text-xs text-muted-foreground hover:text-foreground"
      >
        Esqueceu a senha ou nunca definiu uma? Peça um link de acesso por e-mail
      </button>
    </form>
  );
}
