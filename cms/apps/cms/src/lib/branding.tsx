import type { CSSProperties } from "react";
import { getSchema, type ContentSchema } from "@/content-types";
import type { Tenant } from "@/db/schema";

export type Branding = NonNullable<ContentSchema["branding"]>;

export const brandingOf = (tenant: Tenant | null | undefined): Branding | undefined =>
  tenant ? getSchema(tenant.schemaKey).branding : undefined;

/** Variables CSS qui remplacent les couleurs neutres du CMS (voir globals.css). */
export function brandStyle(branding: Branding | undefined): CSSProperties | undefined {
  if (!branding) return undefined;
  return {
    "--primary": branding.primary,
    "--primary-hover": branding.primaryHover,
    "--primary-soft": branding.primarySoft,
    "--accent": branding.accent,
    "--bg": branding.background,
    "--text": branding.text,
    ...(branding.fontTitle ? { "--font-title": branding.fontTitle } : {}),
  } as CSSProperties;
}

/** Polices du client (feuille de style Google Fonts). */
export function BrandFonts({ branding }: { branding: Branding | undefined }) {
  if (!branding?.fontsHref) return null;
  return <link rel="stylesheet" href={branding.fontsHref} precedence="default" />;
}
