"use client";

import { useEffect, useRef, useState } from "react";

// Ditado por voz transcrito no próprio aparelho (Chrome, Edge, Safari); só o texto sai dele.
// O navegador encerra o reconhecimento sozinho a cada pausa na fala, o que cortava pedidos longos.
// Aqui ele é religado enquanto a pessoa não tocar em parar, então dá para pensar e falar em partes.
type Reconhecimento = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type ConstrutorReconhecimento = new () => Reconhecimento;

function construtor(): ConstrutorReconhecimento | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as {
    SpeechRecognition?: ConstrutorReconhecimento;
    webkitSpeechRecognition?: ConstrutorReconhecimento;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function useVoz(textoAtual: () => string, aoMudar: (texto: string) => void) {
  const [temVoz, setTemVoz] = useState(false);
  const [ouvindo, setOuvindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const recRef = useRef<Reconhecimento | null>(null);
  const querRef = useRef(false); // true enquanto a pessoa quer continuar ditando
  const textoRef = useRef(textoAtual);
  const mudarRef = useRef(aoMudar);

  useEffect(() => {
    textoRef.current = textoAtual;
    mudarRef.current = aoMudar;
  });

  useEffect(() => {
    setTemVoz(Boolean(construtor()));
    return () => {
      querRef.current = false;
      recRef.current?.stop();
    };
  }, []);

  function iniciarSessao() {
    const Construtor = construtor();
    if (!Construtor) return;
    const base = textoRef.current().trim();
    const prefixo = base ? `${base} ` : "";
    const rec = new Construtor();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onresult = (e) => {
      const falado = Array.from(e.results)
        .map((r) => r[0]?.transcript ?? "")
        .join(" ")
        .trim();
      mudarRef.current(prefixo + falado);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setErro("Permita o uso do microfone no navegador para falar.");
        querRef.current = false;
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        setErro("Não consegui ouvir. Tente de novo ou digite.");
        querRef.current = false;
      }
    };
    rec.onend = () => {
      if (!querRef.current) {
        setOuvindo(false);
        return;
      }
      // Pausa na fala: continua ouvindo, acrescentando ao que já foi ditado.
      try {
        iniciarSessao();
      } catch {
        querRef.current = false;
        setOuvindo(false);
      }
    };
    recRef.current = rec;
    rec.start();
  }

  function parar() {
    querRef.current = false;
    recRef.current?.stop();
  }

  function alternar() {
    if (querRef.current) {
      parar();
      return;
    }
    if (!construtor()) return;
    setErro(null);
    querRef.current = true;
    setOuvindo(true);
    try {
      iniciarSessao();
    } catch {
      querRef.current = false;
      setOuvindo(false);
    }
  }

  return { temVoz, ouvindo, erro, alternar, parar };
}
