import { redirect } from "next/navigation";
import { getCurrentUser, getLoginTenant } from "@/lib/session";
import { BrandFonts, brandingOf, brandStyle } from "@/lib/branding";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Connexion" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  const tenant = await getLoginTenant();
  const branding = brandingOf(tenant);
  return (
    <div className="login-wrap brand-scope" style={brandStyle(branding)}>
      <BrandFonts branding={branding} />
      <div className="card login-card">
        {branding?.logo && <img src={branding.logo} alt={tenant?.name ?? ""} className="login-logo" width={84} height={84} />}
        <h1>{tenant ? tenant.name : "Mon espace"}</h1>
        <p className="sub">{tenant ? "Mon espace · " : ""}Connectez-vous pour gérer le contenu de votre site.</p>
        <LoginForm />
      </div>
    </div>
  );
}
