"use client";

import { BrandLogo } from "@/components/brand-logo";
import { useActionState } from "react";
import { loginAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-8">
        <BrandLogo priority className="h-24 w-auto" />
        <Card className="w-full">
          <CardHeader>
            <CardDescription>Entre com sua conta da equipe.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" required autoComplete="email" />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" name="password" type="password" required autoComplete="current-password" />
              </div>
              {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
              <Button type="submit" disabled={pending} className="mt-2">
                {pending ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
