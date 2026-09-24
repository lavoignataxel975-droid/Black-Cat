"use client";

import { startTransition, useActionState } from "react";
import { loginAction, type FormState } from "@/app/actions";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, {});
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
        <label htmlFor="username">Identifiant</label>
        <input id="username" name="username" type="text" autoComplete="username" autoCapitalize="none" required autoFocus />
      </div>
      <div className="field">
        <label htmlFor="password">Mot de passe</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "Connexion…" : "Se connecter"}
      </button>
      <p className="help" style={{ color: "var(--muted)", fontSize: "0.9rem", margin: 0, textAlign: "center" }}>
        Mot de passe oublié ? Contactez votre agence, qui le réinitialisera.
      </p>
    </form>
  );
}
