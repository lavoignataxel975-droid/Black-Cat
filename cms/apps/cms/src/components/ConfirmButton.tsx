"use client";

/** Bouton de soumission qui demande une confirmation avant une action destructrice. */
export function ConfirmButton({ label, message }: { label: string; message: string }) {
  return (
    <button
      className="btn btn-danger"
      style={{ width: "100%" }}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {label}
    </button>
  );
}
