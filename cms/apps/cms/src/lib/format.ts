import type { ContentType } from "@/content-types";
export { optionLabel } from "@/content-types";
import type { ItemStatus } from "@/server/content";

const TIME_ZONE = "Europe/Paris";

/** Prix numérique (« 12,50 € »), ou prix saisi en texte, affiché tel quel (« 7 € / 30 € »). */
export const formatPrice = (n: unknown) =>
  typeof n === "number"
    ? n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" })
    : typeof n === "string"
      ? n
      : "";

export const typeIcon = (type: ContentType) => type.icon ?? (type.schedule ? "📅" : "📄");

export const formatDateTime = (iso: unknown) =>
  typeof iso === "string"
    ? new Date(iso).toLocaleString("fr-FR", {
        timeZone: TIME_ZONE,
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

export const formatShortDate = (d: Date) =>
  d.toLocaleString("fr-FR", { timeZone: TIME_ZONE, dateStyle: "short", timeStyle: "short" });

export const STATUS_LABELS: Record<ItemStatus, { label: string; className: string }> = {
  published: { label: "En ligne", className: "badge badge-published" },
  changed: { label: "En ligne · modifications non publiées", className: "badge badge-changed" },
  hidden: { label: "Masqué", className: "badge" },
  draft: { label: "Brouillon", className: "badge" },
};

export const article = (type: ContentType) => (type.feminine ? "une" : "un");
