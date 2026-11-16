"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./auth";
import { desconectar } from "./google-agenda";

export async function desconectarGoogleAgendaAction(): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sessão expirada." };
  try {
    await desconectar(user.id);
  } catch {
    return { error: "Não consegui desconectar agora. Tente de novo." };
  }
  revalidatePath("/tarefas");
  return {};
}
