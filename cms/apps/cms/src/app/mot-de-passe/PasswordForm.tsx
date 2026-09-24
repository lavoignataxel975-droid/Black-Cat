"use client";

import { startTransition, useActionState } from "react";
import { changePasswordAction, type FormState } from "@/app/actions";

export function PasswordForm({ minLength, canCancel }: { minLength: number; canCancel: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(changePasswordAction, {});
  return (
    <form
      className="form-grid"
      onSubmit={(e) => {
        // Soumission manuelle : évite que React vide les champs (dont l'identifiant) après une erreur.
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      {state.message && (
        <div className="alert alert-error" role="alert">
          {state.message}
        </div>
      )}
      <div className="field">
        <label htmlFor="current">Mot de passe actuel</label>
        <input id="current" name="current" type="password" autoComplete="current-password" required />
      </div>
      <div className="field">
        <label htmlFor="next">Nouveau mot de passe</label>
        <input id="next" name="next" type="password" autoComplete="new-password" minLength={minLength} required />
        <p className="help">Au moins {minLength} caractères.</p>
      </div>
      <div className="field">
        <label htmlFor="confirm">Confirmer le nouveau mot de passe</label>
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </div>
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Enregistrement…" : "Enregistrer le mot de passe"}
      </button>
      {canCancel && (
        <a href="/" className="btn">
          Annuler
        </a>
      )}
    </form>
  );
}
