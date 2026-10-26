import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import type { Role, User } from "./types";

export async function createSession(email: string, password: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "E-mail ou senha inválidos." };
  return {};
}

export async function destroySession() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("nome, role, senha_definida")
    .eq("id", authUser.id)
    .single();

  return {
    id: authUser.id,
    nome: profile?.nome ?? authUser.email ?? "",
    email: authUser.email ?? "",
    role: (profile?.role as Role) ?? "equipe",
    senhaDefinida: Boolean(profile?.senha_definida),
  };
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
