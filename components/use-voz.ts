"use client";

import { useEffect, useRef, useState } from "react";

// Ditado por voz transcrito no próprio aparelho (Chrome, Edge, Safari); só o texto sai dele.
// O navegador encerra o reconhecimento sozinho a cada pausa na fala. Aqui ele é religado enquanto
// a pessoa não tocar em parar, então dá para pensar e falar em partes.
type Reconhecimento = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort?: () => void;
  onstart?: (() => void) | null;
  onaudiostart?: (() => void) | null;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type ConstrutorReconhecimento = new () => Reconhecimento;

const ESPERA_PARA_RELIGAR_MS = 250;
const TENTATIVAS_DE_RELIGAR = 3;
const SESSOES_SEM_FALA_PARA_DESISTIR = 3;
const ESPERA_PELO_FIM_MS = 800; // depois de "parar", quanto esperar o navegador avisar que acabou
const ESPERA_PELO_INICIO_MS = 2500; // ao religar, quanto esperar o microfone realmente abrir

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
  const ativaRef = useRef(false); // true enquanto uma sessão do navegador ainda está aberta
  const ultimoRef = useRef<string | null>(null); // último texto ditado (a tela pode demorar a refletir)
  const semFalaRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vigiaRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fimTimerRef.current) clearTimeout(fimTimerRef.current);
      if (vigiaRef.current) clearTimeout(vigiaRef.current);
      recRef.current?.stop();
    };
  }, []);

  function desistir(mensagem: string | null) {
    querRef.current = false;
    if (mensagem) setErro(mensagem);
    setOuvindo(false);
  }

  // Solta a sessão anterior sem esperar o navegador avisar que ela acabou. No iPhone esse aviso
  // às vezes nunca chega, e o microfone parecia "ocupado" até fechar o app.
  function descartarSessao() {
    const rec = recRef.current;
    if (rec) {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      rec.onstart = null;
      rec.onaudiostart = null;
      try {
        if (rec.abort) rec.abort();
        else rec.stop();
      } catch {}
    }
    recRef.current = null;
    ativaRef.current = false;
  }

  function iniciarSessao(aoReligar = false) {
    const Construtor = construtor();
    if (!Construtor) return;
    // Ao religar depois de uma pausa, parte do que já foi ditado (e não do que a tela mostra,
    // que pode estar um instante atrasada).
    const base = (ultimoRef.current ?? textoRef.current()).trim();
    const prefixo = base ? `${base} ` : "";
    let ouviuFala = false;
    let abriu = false;

    const rec = new Construtor();
    rec.lang = "pt-BR";
    rec.interimResults = true;
    rec.continuous = false;
    rec.onstart = () => {
      abriu = true;
    };
    rec.onaudiostart = () => {
      abriu = true;
    };
    rec.onresult = (e) => {
      abriu = true;
      const falado = Array.from(e.results)
        .map((r) => r[0]?.transcript ?? "")
        .join(" ")
        .trim();
      if (falado) {
        ouviuFala = true;
        semFalaRef.current = 0;
      }
      const texto = prefixo + falado;
      ultimoRef.current = texto;
      mudarRef.current(texto);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        desistir("Permita o uso do microfone no navegador para falar.");
      } else if (e.error === "audio-capture") {
        desistir("Não encontrei o microfone neste aparelho.");
      } else if (e.error === "network") {
        desistir("O serviço de voz do navegador ficou sem conexão. Tente de novo.");
      } else if (e.error !== "no-speech" && e.error !== "aborted") {
        desistir("Não consegui ouvir. Tente de novo ou digite.");
      }
    };
    rec.onend = () => {
      if (recRef.current !== rec) return; // sessão já descartada
      ativaRef.current = false;
      if (!querRef.current) {
        setOuvindo(false);
        return;
      }
      if (!ouviuFala) {
        semFalaRef.current += 1;
        if (semFalaRef.current >= SESSOES_SEM_FALA_PARA_DESISTIR) {
          desistir("Não ouvi nada. Toque no microfone e fale perto do aparelho.");
          return;
        }
      }
      religar(0);
    };
    recRef.current = rec;
    rec.start();
    ativaRef.current = true;

    // Religar sem um toque da pessoa pode ser bloqueado (iPhone): em vez de ficar "ouvindo"
    // sem ouvir nada, avisa para tocar no microfone de novo.
    if (aoReligar) {
      if (vigiaRef.current) clearTimeout(vigiaRef.current);
      vigiaRef.current = setTimeout(() => {
        if (!abriu && recRef.current === rec && querRef.current) {
          descartarSessao();
          desistir("O navegador parou de ouvir. Toque no microfone para continuar.");
        }
      }, ESPERA_PELO_INICIO_MS);
    }
  }

  // Pausa na fala: o navegador encerrou a sessão, então abre outra, com uma pequena espera
  // (religar no mesmo instante falha em alguns navegadores) e algumas tentativas.
  function religar(tentativa: number) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (!querRef.current) {
        setOuvindo(false);
        return;
      }
      try {
        iniciarSessao(true);
      } catch {
        if (tentativa + 1 < TENTATIVAS_DE_RELIGAR) religar(tentativa + 1);
        else desistir("O microfone não respondeu. Toque nele para tentar de novo.");
      }
    }, ESPERA_PARA_RELIGAR_MS);
  }

  function parar() {
    querRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (vigiaRef.current) clearTimeout(vigiaRef.current);
    const rec = recRef.current;
    rec?.stop();
    setOuvindo(false);
    // Se o navegador não avisar que terminou, solta a sessão para o próximo uso funcionar.
    if (rec) {
      if (fimTimerRef.current) clearTimeout(fimTimerRef.current);
      fimTimerRef.current = setTimeout(() => {
        if (recRef.current === rec) descartarSessao();
      }, ESPERA_PELO_FIM_MS);
    }
  }

  function alternar() {
    if (querRef.current) {
      parar();
      return;
    }
    if (!construtor()) return;
    setErro(null);
    querRef.current = true;
    semFalaRef.current = 0;
    ultimoRef.current = null;
    setOuvindo(true);
    // Se a sessão anterior ainda não avisou que acabou, solta ela e começa uma nova.
    if (fimTimerRef.current) clearTimeout(fimTimerRef.current);
    if (ativaRef.current) descartarSessao();
    try {
      iniciarSessao();
    } catch {
      desistir("O microfone não respondeu. Toque nele para tentar de novo.");
    }
  }

  return { temVoz, ouvindo, erro, alternar, parar };
}
