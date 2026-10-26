// Upload/remoção de arquivos pela Files API da Anthropic — usado para anexar
// documentos grandes (PDFs escaneados etc.) em vez de embutir em base64 na
// mensagem, o que esbarra no limite de 32MB do corpo da requisição.

const FILES_ENDPOINT = "https://api.anthropic.com/v1/files";
const FILES_BETA_HEADER = "files-api-2025-04-14";

export async function uploadArquivoAnthropic(
  apiKey: string,
  buffer: Buffer,
  mediaType: string,
  filename: string
): Promise<string> {
  const form = new FormData();
  const bytes = Uint8Array.from(buffer);
  form.append("file", new Blob([bytes], { type: mediaType }), filename);
  const res = await fetch(FILES_ENDPOINT, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": FILES_BETA_HEADER,
    },
    body: form,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Falha ao enviar arquivo para a IA (${res.status}): ${txt.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.id as string;
}

export async function deletarArquivoAnthropic(apiKey: string, fileId: string): Promise<void> {
  await fetch(`${FILES_ENDPOINT}/${fileId}`, {
    method: "DELETE",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": FILES_BETA_HEADER,
    },
  }).catch(() => {});
}

export { FILES_BETA_HEADER };
