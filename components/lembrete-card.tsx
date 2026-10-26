"use client";

import { useState, useTransition } from "react";
import { deleteLembreteAction, updateLembreteAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Trash2, Check, X } from "lucide-react";
import type { Lembrete } from "@/lib/types";

export function LembreteCard({ lembrete }: { lembrete: Lembrete }) {
  const [editing, setEditing] = useState(false);
  const [titulo, setTitulo] = useState(lembrete.titulo);
  const [conteudo, setConteudo] = useState(lembrete.conteudo);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6">
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" />
          <Textarea
            value={conteudo}
            onChange={(e) => setConteudo(e.target.value)}
            rows={4}
            placeholder="Anotação"
          />
          <div className="flex justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                setTitulo(lembrete.titulo);
                setConteudo(lembrete.conteudo);
                setEditing(false);
              }}
            >
              <X className="size-4" />
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(() => {
                  updateLembreteAction(lembrete.id, titulo, conteudo);
                  setEditing(false);
                })
              }
            >
              <Check className="size-4" />
              Salvar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 pt-6">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium">{lembrete.titulo || "Sem título"}</h3>
          <div className="flex shrink-0 gap-1">
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
              <Pencil className="size-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={pending}
              onClick={() => startTransition(() => deleteLembreteAction(lembrete.id))}
            >
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          </div>
        </div>
        {lembrete.conteudo && (
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{lembrete.conteudo}</p>
        )}
      </CardContent>
    </Card>
  );
}
