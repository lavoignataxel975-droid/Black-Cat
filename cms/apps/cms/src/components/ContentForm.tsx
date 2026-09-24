"use client";

import { startTransition, useActionState, useEffect, useState } from "react";
import { isFieldVisible, type ContentType, type Field } from "@/content-types";
import { saveContentAction, uploadImageAction, type FormState } from "@/app/actions";

interface Props {
  type: ContentType;
  tenantId: string;
  item?: { id: string; revision: number; data: Record<string, unknown> };
}

/** Formulaire généré à partir de la définition du type de contenu. */
export function ContentForm({ type, tenantId, item }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveContentAction, {});
  const [dirty, setDirty] = useState(false);
  const errors = state.errors ?? {};

  // Valeurs des champs dont dépend l'affichage d'autres champs (ex. la catégorie).
  const watchedNames = new Set(type.fields.flatMap((f) => (f.showIf ? [f.showIf.field] : [])));
  const [watched, setWatched] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(
      type.fields
        .filter((f) => watchedNames.has(f.name))
        .map((f) => [f.name, item ? item.data[f.name] : defaultValue(f)]),
    ),
  );

  // Prévient la perte d'une saisie non enregistrée en quittant la page.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return (
    <form
      className="card form-grid"
      onChange={(e) => {
        setDirty(true);
        const target = e.target as unknown as HTMLInputElement;
        if (watchedNames.has(target.name)) setWatched((w) => ({ ...w, [target.name]: target.value }));
      }}
      onSubmit={(e) => {
        // Soumission manuelle : avec `action={...}`, React vide le formulaire après l'envoi,
        // ce qui ferait perdre la saisie en cas d'erreur de validation.
        e.preventDefault();
        const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        setDirty(false);
        startTransition(() => action(fd));
      }}
      noValidate
    >
      {state.message && (
        <div className="alert alert-error" role="alert">
          {state.message}
          {Object.keys(errors).length > 0 && (
            <ul style={{ margin: "0.4rem 0 0", paddingLeft: "1.2rem" }}>
              {Object.entries(errors).map(([name, msg]) => (
                <li key={name}>
                  <a href={`#f-${name}`}>{msg}</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <input type="hidden" name="$type" value={type.key} />
      <input type="hidden" name="$id" value={item?.id ?? ""} />
      <input type="hidden" name="$revision" value={item?.revision ?? 0} />

      {type.fields.map((field) => {
        const visible = isFieldVisible(field, watched);
        // Un fieldset désactivé n'envoie pas ses champs : les critères d'une autre catégorie
        // ne sont pas enregistrés, mais restent en mémoire si l'on revient à cette catégorie.
        return (
          <fieldset key={field.name} className="field-group" hidden={!visible} disabled={!visible}>
            <FieldInput
              field={field}
              tenantId={tenantId}
              value={item ? item.data[field.name] : defaultValue(field)}
              error={errors[field.name]}
              onDirty={() => setDirty(true)}
            />
          </fieldset>
        );
      })}

      <div className="form-footer">
        <button className="btn" type="submit" name="$intent" value="draft" disabled={pending}>
          Enregistrer le brouillon
        </button>
        <button className="btn btn-primary" type="submit" name="$intent" value="publish" disabled={pending}>
          {pending ? "Enregistrement…" : "Publier sur le site"}
        </button>
      </div>
    </form>
  );
}

function defaultValue(field: Field): unknown {
  if (field.kind === "select" || field.kind === "boolean") return field.default;
  return undefined;
}

function FieldInput({
  field,
  tenantId,
  value,
  error,
  onDirty,
}: {
  field: Field;
  tenantId: string;
  value: unknown;
  error?: string;
  onDirty: () => void;
}) {
  const id = `f-${field.name}`;
  const describedBy = [field.help && `${id}-help`, error && `${id}-err`].filter(Boolean).join(" ") || undefined;
  const common = { id, name: field.name, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy };
  const str = value === undefined || value === null ? "" : String(value);

  let control: React.ReactNode;
  switch (field.kind) {
    case "text":
      control = <input {...common} type="text" defaultValue={str} maxLength={field.maxLength} placeholder={field.placeholder} />;
      break;
    case "url":
      control = <input {...common} type="url" defaultValue={str} placeholder="https://" inputMode="url" />;
      break;
    case "textarea":
      control = <textarea {...common} defaultValue={str} maxLength={field.maxLength} rows={5} />;
      break;
    case "select":
      control = (
        <select {...common} defaultValue={str}>
          {!field.required && <option value="">—</option>}
          {field.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
      break;
    case "price":
      control = (
        <input
          {...common}
          type="text"
          inputMode="decimal"
          defaultValue={typeof value === "number" ? value.toFixed(2).replace(".", ",") : str}
          placeholder="0,00"
          style={{ maxWidth: 180 }}
        />
      );
      break;
    case "integer":
      control = <input {...common} type="number" defaultValue={str} min={field.min} max={field.max} step={1} style={{ maxWidth: 180 }} />;
      break;
    case "boolean":
      return (
        <div className="field">
          <label className="checkbox">
            <input type="checkbox" name={field.name} defaultChecked={value === true} aria-describedby={describedBy} />
            {field.label}
          </label>
          {field.help && <p className="help" id={`${id}-help`}>{field.help}</p>}
        </div>
      );
    case "datetime":
      control = <DateTimeInput {...common} name={field.name} value={str} onDirty={onDirty} />;
      break;
    case "image":
      control = <ImageInput id={id} name={field.name} tenantId={tenantId} value={str} onDirty={onDirty} />;
      break;
  }

  return (
    <div className={`field${error ? " has-error" : ""}`}>
      <label htmlFor={id}>
        {field.label}
        {field.required && (
          <span className="req" aria-label="obligatoire">
            *
          </span>
        )}
      </label>
      {control}
      {field.help && (
        <p className="help" id={`${id}-help`}>
          {field.help}
        </p>
      )}
      {error && (
        <p className="error" id={`${id}-err`}>
          {error}
        </p>
      )}
    </div>
  );
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Lit une date et une heure écrites à la main, en français.
 * Accepte 24/09/2026, 24-09-2026, 24.09.2026, 24 09 26 — et 21:00, 21h00, 21h, 2100.
 * Renvoie `null` si la saisie ne désigne pas une date réelle (le 31 février est refusé).
 */
function lireDateHeure(jour: string, heure: string): Date | null {
  const j = jour.trim().match(/^(\d{1,2})\s*[/.\-\s]\s*(\d{1,2})\s*[/.\-\s]\s*(\d{2}|\d{4})$/);
  if (!j) return null;

  const nJour = Number(j[1]);
  const nMois = Number(j[2]) - 1;
  let nAnnee = Number(j[3]);
  if (nAnnee < 100) nAnnee += 2000;

  let h = 0;
  let min = 0;
  const t = heure.trim();
  if (t) {
    const m = t.match(/^(\d{1,2})\s*[:hH.]?\s*(\d{2})?$/) || t.match(/^(\d{2})(\d{2})$/);
    if (!m) return null;
    h = Number(m[1]);
    min = Number(m[2] ?? 0);
    if (h > 23 || min > 59) return null;
  }

  const d = new Date(nAnnee, nMois, nJour, h, min);
  // Le 31/02 glisserait en mars : on vérifie que la date n'a pas été réinterprétée.
  if (d.getFullYear() !== nAnnee || d.getMonth() !== nMois || d.getDate() !== nJour) return null;
  return d;
}

/**
 * Saisie en heure locale du navigateur, transmise au serveur en ISO 8601 (UTC).
 *
 * Deux champs de texte que l'on remplit au clavier, plutôt qu'un `datetime-local` : les
 * sélecteurs natifs découpent la valeur en segments et se vident tant qu'ils sont
 * incomplets, ce qui rendait l'heure impossible à modifier. Ici, ce qui est tapé reste tel
 * quel ; une ligne sous les champs redit la date comprise, pour lever tout doute.
 */
function DateTimeInput({
  id,
  name,
  value,
  onDirty,
  ...rest
}: { id: string; name: string; value: string; onDirty: () => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value">) {
  const [jour, setJour] = useState("");
  const [heure, setHeure] = useState("");

  // Renseigné après le montage, pour utiliser le fuseau horaire du navigateur.
  useEffect(() => {
    if (!value) return;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return;
    setJour(`${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`);
    setHeure(`${pad2(d.getHours())}:${pad2(d.getMinutes())}`);
  }, [value]);

  const saisi = jour.trim() !== "" || heure.trim() !== "";
  const date = lireDateHeure(jour, heure);

  return (
    <div className="datetime-field">
      <input
        {...rest}
        id={id}
        className="dt-jour"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="24/09/2026"
        aria-label="Date, au format jour/mois/année"
        value={jour}
        onChange={(e) => {
          setJour(e.target.value);
          onDirty();
        }}
      />
      <input
        className="dt-heure"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="21:00"
        aria-label="Heure"
        value={heure}
        onChange={(e) => {
          setHeure(e.target.value);
          onDirty();
        }}
      />

      {saisi && (
        <p className={`dt-apercu${date ? "" : " dt-ko"}`} aria-live="polite">
          {date
            ? new Intl.DateTimeFormat("fr-FR", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }).format(date)
            : "Date non comprise. Écrivez-la comme ceci : 24/09/2026 et 21:00."}
        </p>
      )}

      <input type="hidden" name={name} value={date ? date.toISOString() : ""} />
    </div>
  );
}

function ImageInput({ id, name, tenantId, value, onDirty }: { id: string; name: string; tenantId: string; value: string; onDirty: () => void }) {
  const [mediaId, setMediaId] = useState(value);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>();
  const [over, setOver] = useState(false);

  async function upload(file: File | undefined) {
    if (!file) return;
    setError(undefined);
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await uploadImageAction(fd).catch(() => ({ error: "Échec de l'envoi. Vérifiez votre connexion." }));
    setUploading(false);
    if ("error" in res) setError(res.error);
    else {
      setMediaId(res.id);
      onDirty();
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={mediaId} />
      {mediaId ? (
        <div className="image-preview">
          <img src={`/media/${tenantId}/${mediaId}-sm.webp`} alt="Aperçu de l'image" />
          <div className="actions">
            <label className="btn btn-small" htmlFor={id}>
              Remplacer
            </label>
            <button
              type="button"
              className="btn btn-small btn-danger"
              onClick={() => {
                setMediaId("");
                onDirty();
              }}
            >
              Retirer l'image
            </button>
          </div>
        </div>
      ) : null}
      <label
        className={`dropzone${over ? " is-over" : ""}`}
        htmlFor={id}
        hidden={Boolean(mediaId)}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void upload(e.dataTransfer.files[0]);
        }}
      >
        {uploading ? "Envoi en cours…" : "📷 Glissez une photo ici ou touchez pour en choisir une"}
        <span style={{ display: "block", fontSize: "0.85rem", color: "var(--muted)" }}>JPEG, PNG ou WebP · 10 Mo maximum</span>
      </label>
      <input
        id={id}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {uploading && mediaId && <p className="help">Envoi en cours…</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
