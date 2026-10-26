"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Share, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export function InstalarAppCard() {
  const [aparelho, setAparelho] = useState<"iphone" | "android">("iphone");
  const [dispensado, setDispensado] = useState(false);

  if (dispensado) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Smartphone className="size-4" />
          Instale como aplicativo no celular
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Adicione a Área do Cliente à tela inicial do seu celular — vira um ícone de app, abre
          rapidinho e você não precisa lembrar de nenhum link.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={aparelho === "iphone" ? "default" : "outline"}
            onClick={() => setAparelho("iphone")}
          >
            iPhone
          </Button>
          <Button
            type="button"
            size="sm"
            variant={aparelho === "android" ? "default" : "outline"}
            onClick={() => setAparelho("android")}
          >
            Android
          </Button>
        </div>

        {aparelho === "iphone" ? (
          <ol className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground")}>1</span>
              Toque no ícone de compartilhar <Share className="inline size-3.5" /> na barra do Safari.
            </li>
            <li className="flex items-center gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">2</span>
              Role e toque em <strong className="text-foreground">&quot;Adicionar à Tela de Início&quot;</strong>.
            </li>
            <li className="flex items-center gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">3</span>
              Toque em <strong className="text-foreground">&quot;Adicionar&quot;</strong> no canto superior.
            </li>
          </ol>
        ) : (
          <ol className="flex flex-col gap-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">1</span>
              Toque nos três pontinhos <MoreVertical className="inline size-3.5" /> no canto do
              navegador.
            </li>
            <li className="flex items-center gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">2</span>
              Toque em <strong className="text-foreground">&quot;Adicionar à tela inicial&quot;</strong> ou{" "}
              <strong className="text-foreground">&quot;Instalar app&quot;</strong>.
            </li>
            <li className="flex items-center gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">3</span>
              Confirme tocando em <strong className="text-foreground">&quot;Adicionar&quot;</strong> ou{" "}
              <strong className="text-foreground">&quot;Instalar&quot;</strong>.
            </li>
          </ol>
        )}

        <button
          type="button"
          onClick={() => setDispensado(true)}
          className="w-fit text-xs text-muted-foreground hover:text-foreground"
        >
          Já instalei / não quero ver isso agora
        </button>
      </CardContent>
    </Card>
  );
}
