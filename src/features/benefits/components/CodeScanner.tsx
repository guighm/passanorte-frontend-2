"use client";

// CodeScanner (SPE-06 T009 — research D1): leitura contínua por câmera com
// @zxing/browser (sancionado pela emenda 2.1.0 da Constraint 1 — RF21):
// `BrowserMultiFormatReader` com hints restritos a QR Code + Code 128
// (formatos que o app do turista produz). O decode dispara a validação
// AUTOMATICAMENTE ao ler, sem botão (clarificação Q4 de 2ª sessão), com
// deduplicação de decodes consecutivos do MESMO código (a janela curta é
// detalhe de implementação — a barreira antes de conceder é a conferência
// + redigitação, FR-004). Os controles de câmera (start/stop) são
// comandados pela view (D6): pausada fora de `idle-scanning` e no
// pós-sucesso (FR-009 — clarify de 2ª sessão). Erro de permissão/câmera
// indisponível ⇒ degradação acionável com a entrada manual na MESMA tela
// (FR-011) — nunca tela em branco (Princípio V).

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

const DEDUPE_WINDOW_MS = 1000;

interface CodeScannerProps {
  /** Câmera ativa? (D6 — a view pausa fora de `idle-scanning`, FR-009). */
  active: boolean;
  /** Código decodificado (limpo) — a view dispara a validação automática (Q4). */
  onDecoded: (code: string) => void;
  /** Câmera indisponível/permissão negada/erro — degradação (FR-011). */
  onUnavailable: (reason: string) => void;
}

const HINTS = new Map<DecodeHintType, unknown>([
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE, BarcodeFormat.CODE_128]],
  [DecodeHintType.TRY_HARDER, true],
]);

export default function CodeScanner({ active, onDecoded, onUnavailable }: CodeScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const lastRef = useRef<{ text: string; at: number }>({ text: "", at: 0 });
  const [activeDecoder, setActiveDecoder] = useState(false);
  // Callbacks em ref — a câmera NÃO reinicia a cada render (o ciclo de
  // vida é controlado APENAS por `active`, D6).
  const onDecodedRef = useRef(onDecoded);
  const onUnavailableRef = useRef(onUnavailable);

  // Sincronização latest-ref: roda APÓS CADA render, nunca durante (regra
  // react-hooks/refs) — o decode sempre chama o callback da render atual.
  useEffect(() => {
    onDecodedRef.current = onDecoded;
    onUnavailableRef.current = onUnavailable;
  });

  useEffect(() => {
    // Ciclo de vida da câmera controlado APENAS por `active` (D6).
    if (!active) {
      controlsRef.current?.stop();
      controlsRef.current = null;
      lastRef.current = { text: "", at: 0 };
      return;
    }
    let cancelled = false;
    const start = async () => {
      try {
        const reader = (readerRef.current ??= new BrowserMultiFormatReader(HINTS));
        const video = videoRef.current;
        if (!video || cancelled) return;
        const controls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
          const text = result?.getText()?.trim() ?? "";
          if (!text) return;
          const now = Date.now();
          // Dedupe: decodes consecutivos do MESMO código dentro da janela
          // não redesparadam a validação (leitura redundante do mesmo QR).
          if (lastRef.current.text === text && now - lastRef.current.at < DEDUPE_WINDOW_MS) {
            return;
          }
          lastRef.current = { text, at: now };
          onDecodedRef.current(text);
        });
        if (cancelled) {
          controls.stop();
          return;
        }
        controlsRef.current = controls;
        setActiveDecoder(true);
      } catch (error) {
        if (cancelled) return;
        // FR-011: permissão negada/dispositivo ausente ⇒ degradação acionável —
        // a entrada manual continua disponível na mesma tela.
        const reason =
          error instanceof Error && /permission|NotAllowed/i.test(error.message)
            ? "Permissão de câmera recusada pelo navegador."
            : "Câmera indisponível neste terminal.";
        onUnavailableRef.current(reason);
      }
    };
    void start();
    return () => {
      cancelled = true;
      controlsRef.current?.stop();
      controlsRef.current = null;
      setActiveDecoder(false);
    };
  }, [active]);

  return (
    <div className="flex flex-col gap-2">
      <label className="text-caption text-foreground-muted" htmlFor="benefits-scanner">
        Leitor por câmera (QR code / código de barras)
      </label>
      <video
        id="benefits-scanner"
        ref={videoRef}
        // aria-label: o vídeo NÃO é conteúdo decorativo — é o leitor (FR-014).
        aria-label="Câmera de leitura do código de resgate — apresente o QR do app do turista"
        className="aspect-video w-full max-w-md rounded-lg border border-border bg-surface-muted"
        muted
        playsInline
      />
      <p aria-live="polite" className="text-caption text-foreground-muted">
        {active
          ? activeDecoder
            ? "Câmera ativa — a validação acontece automaticamente ao ler."
            : "Aguardando câmera…"
          : "Leitor em pausa."}
      </p>
    </div>
  );
}
