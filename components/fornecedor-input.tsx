import * as React from "react";
import { Input } from "@/components/ui/input";
import { FORNECEDORES_SUGERIDOS } from "@/lib/types";

// Campo de texto livre com sugestões (autocompletar nativo via <datalist>).
export function FornecedorInput({ id, ...props }: React.ComponentProps<typeof Input>) {
  const listId = `${id ?? "fornecedor"}-sugestoes`;
  return (
    <>
      <Input id={id} list={listId} autoComplete="off" {...props} />
      <datalist id={listId}>
        {FORNECEDORES_SUGERIDOS.map((nome) => (
          <option key={nome} value={nome} />
        ))}
      </datalist>
    </>
  );
}
