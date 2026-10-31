"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./auth";
import { podeUsarFavoritas } from "./recursos";
import { setObraFavorita } from "./store";

export async function alternarObraFavoritaAction(obraId: string, favorita: boolean): Promise<{ error?: string }> {
  const user = await getCurrentUser();
  if (!user || !podeUsarFavoritas(user)) return { error: "Sem permissão." };
  try {
    await setObraFavorita(user.id, obraId, favorita);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível atualizar as favoritas." };
  }
  revalidatePath("/", "layout");
  return {};
}
