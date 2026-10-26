import { redirect } from "next/navigation";

// Custos Fixos agora é uma subcategoria do Financeiro Global.
export default function CustosFixosRedirect() {
  redirect("/financeiro");
}
