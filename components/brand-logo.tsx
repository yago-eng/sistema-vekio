import Image from "next/image";
import { cn } from "@/lib/utils";

const LOGOS = {
  wordmark: {
    claro: "/brand/logo-wordmark-trim.png",
    escuro: "/brand/logo-wordmark-branco-trim.png",
    width: 1050,
    height: 309,
  },
  stacked: {
    claro: "/brand/logo-stacked-trim.png",
    escuro: "/brand/logo-stacked-branco.png",
    width: 953,
    height: 842,
  },
} as const;

// Mostra a logo escura no tema claro e a clara no tema escuro.
export function BrandLogo({
  variant = "wordmark",
  className,
  priority,
}: {
  variant?: keyof typeof LOGOS;
  className?: string;
  priority?: boolean;
}) {
  const l = LOGOS[variant];
  return (
    <>
      <Image
        src={l.claro}
        alt="Vekio Engenharia"
        width={l.width}
        height={l.height}
        priority={priority}
        className={cn(className, "dark:hidden")}
        style={{ objectFit: "contain" }}
      />
      <Image
        src={l.escuro}
        alt=""
        aria-hidden
        width={l.width}
        height={l.height}
        priority={priority}
        className={cn(className, "hidden dark:block")}
        style={{ objectFit: "contain" }}
      />
    </>
  );
}
