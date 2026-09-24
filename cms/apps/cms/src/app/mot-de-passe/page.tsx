import { redirect } from "next/navigation";
import { getActiveTenant, getCurrentUser, getLoginTenant } from "@/lib/session";
import { BrandFonts, brandingOf, brandStyle } from "@/lib/branding";
import { MIN_PASSWORD_LENGTH } from "@/server/auth";
import { PasswordForm } from "./PasswordForm";

export const metadata = { title: "Changer de mot de passe" };

export default async function PasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const branding = brandingOf((await getActiveTenant(user)) ?? (await getLoginTenant()));
  return (
    <div className="login-wrap brand-scope" style={brandStyle(branding)}>
      <BrandFonts branding={branding} />
      <div className="card login-card">
        {branding?.logo && <img src={branding.logo} alt="" className="login-logo" width={84} height={84} />}
        <h1>Changer de mot de passe</h1>
        <p className="sub">
          {user.mustChangePassword
            ? "Pour votre sécurité, choisissez votre propre mot de passe avant de continuer."
            : `Bonjour ${user.displayName}.`}
        </p>
        <PasswordForm minLength={MIN_PASSWORD_LENGTH} canCancel={!user.mustChangePassword} />
      </div>
    </div>
  );
}
