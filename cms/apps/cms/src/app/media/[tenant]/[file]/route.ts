import { readMediaFile } from "@/server/media";

/** Images publiques, servies depuis le dossier de stockage du client. */
export async function GET(_: Request, { params }: { params: Promise<{ tenant: string; file: string }> }) {
  const { tenant, file } = await params;
  const data = await readMediaFile(tenant, file);
  if (!data) return new Response("Image introuvable", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      // Le nom d'un fichier ne change jamais de contenu : cache long.
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
