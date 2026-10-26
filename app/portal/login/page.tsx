import { BrandLogo } from "@/components/brand-logo";
import { PortalLoginForm } from "@/components/portal-login-form";

export default function PortalLoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <BrandLogo variant="stacked" priority className="h-20 w-auto" />
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-xl border p-6">
        <div>
          <h1 className="text-lg font-semibold">Área do Cliente</h1>
          <p className="text-sm text-muted-foreground">
            Informe o e-mail cadastrado e enviaremos um novo link de acesso.
          </p>
        </div>
        <PortalLoginForm />
      </div>
    </div>
  );
}
