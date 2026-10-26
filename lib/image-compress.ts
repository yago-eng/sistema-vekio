"use client";

// Fotos tiradas na hora (via captura da câmera) costumam já vir bem menores
// do que uma foto original da galeria do celular — um HEIC/JPEG de alta
// resolução da galeria pode passar de 10-20MB. Em conexão de obra (fraca),
// isso trava o envio direto pro Storage sem nunca dar erro visível (o
// upload simplesmente nunca termina). Redimensionar/recomprimir no
// navegador antes de enviar resolve isso e, de brinde, converte HEIC pra
// JPEG (formato universal).
export async function comprimirImagemSeNecessario(
  file: File,
  maxDimensao = 1920,
  qualidade = 0.82
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return file;

  try {
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Não foi possível ler a imagem"));
        el.src = objectUrl;
      });

      const escala = Math.min(1, maxDimensao / Math.max(img.naturalWidth, img.naturalHeight));
      // Já é pequena o suficiente — não vale a pena reprocessar.
      if (escala >= 1 && file.size < 3 * 1024 * 1024) return file;

      const largura = Math.round(img.naturalWidth * escala);
      const altura = Math.round(img.naturalHeight * escala);
      const canvas = document.createElement("canvas");
      canvas.width = largura;
      canvas.height = altura;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(img, 0, 0, largura, altura);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", qualidade)
      );
      if (!blob) return file;

      const novoNome = file.name.replace(/\.[^.]+$/, "") + ".jpg";
      return new File([blob], novoNome, { type: "image/jpeg" });
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    // Se algo der errado ao comprimir, envia o arquivo original em vez de
    // bloquear o envio inteiro.
    return file;
  }
}
