"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

const CHAVE = "vekio-tema";

// Alterna entre tema claro e escuro; a escolha fica salva neste aparelho.
export function ThemeToggle() {
  const [escuro, setEscuro] = useState(false);

  useEffect(() => {
    setEscuro(document.documentElement.classList.contains("dark"));
  }, []);

  function alternar() {
    const novo = !escuro;
    document.documentElement.classList.toggle("dark", novo);
    try {
      localStorage.setItem(CHAVE, novo ? "dark" : "light");
    } catch {
      // sem armazenamento: vale só nesta sessão
    }
    setEscuro(novo);
  }

  return (
    <button
      type="button"
      onClick={alternar}
      aria-label={escuro ? "Ativar modo claro" : "Ativar modo noturno"}
      title={escuro ? "Modo claro" : "Modo noturno"}
      className="flex size-9 items-center justify-center rounded-full border bg-background text-foreground hover:bg-muted"
    >
      {escuro ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
