const DEFAULT_MESSAGES: Record<string, string> = {
  done: "C'est fait.",
  saved: "Brouillon enregistré. Il n'est pas encore visible sur le site.",
  published: "Publié ! La modification est visible sur le site.",
  hidden: "Masqué : ce contenu n'apparaît plus sur le site.",
  shown: "Ce contenu est de nouveau visible sur le site.",
  trashed: "Mis à la corbeille. Vous pouvez le restaurer pendant 30 jours.",
  restored: "Restauré.",
  moved: "Ordre mis à jour sur le site.",
  version: "Ancienne version rechargée dans le brouillon. Vérifiez-la puis cliquez sur « Publier ».",
};

/** Message de confirmation ou d'erreur transmis dans l'URL après une action. */
export function Flash({
  params,
  messages = {},
}: {
  params: Record<string, string | undefined>;
  messages?: Record<string, string>;
}) {
  if (params.error) {
    return (
      <div className="alert alert-error" role="alert">
        {params.error}
      </div>
    );
  }
  if (!params.ok) return null;
  const text = messages[params.ok] ?? DEFAULT_MESSAGES[params.ok] ?? params.ok;
  return (
    <div className={`alert ${text.includes("sgt_pk_") ? "alert-info" : "alert-success"}`} role="status">
      {text}
    </div>
  );
}
