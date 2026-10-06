import { z } from "zod";

export function contactEmailConfiguration() {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.LIVREDOR_CONTACT_FROM;
  if (!key || !from || !z.email().safeParse(from).success) throw new Error("CONTACT_EMAIL_NOT_CONFIGURED");
  return { key, from };
}

// Plain text, no attachments, no HTML supplied by contributors, no client-chosen recipient.
export async function notifyOrganizers(input: {
  requestId: string; projectTitle: string; displayName: string; body: string;
  category?: "help" | "media" | "rights";
  replyTo: string; recipients: string[];
}, request: typeof fetch = fetch) {
  const { key, from } = contactEmailConfiguration();
  if (!input.recipients.length || input.recipients.length > 2 || !input.recipients.every(email => z.email().safeParse(email).success)
    || !z.email().safeParse(input.replyTo).success) throw new Error("CONTACT_EMAIL_RECIPIENT_INVALID");
  const response = await request("https://api.resend.com/emails/batch", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Idempotency-Key": `livredor-contact/${input.requestId}` },
    body: JSON.stringify(input.recipients.map(to => ({
      from, to: [to], reply_to: input.replyTo,
      subject: "LivreDor — nouveau message privé d’un contributeur",
      text: `Projet : ${input.projectTitle}\nDe : ${input.displayName}\nObjet : ${{ help: "Question sur la collecte", media: "Question ou retrait d’un média", rights: "Demande concernant les données" }[input.category ?? "help"]}\n\n${input.body}\n\nCe message est privé et ne fait pas partie de la restitution. Vous pouvez répondre au contributeur avec Répondre. Consultez aussi les messages dans Organisation. Les copies conservées dans votre messagerie nécessitent leur propre durée de conservation.`,
    }))),
    signal: AbortSignal.timeout(15000),
  });
  // Never propagate provider errors: they can contain recipient addresses.
  if (!response.ok) throw new Error("CONTACT_EMAIL_SEND_FAILED");
  const result = await response.json().catch(() => null);
  if (!Array.isArray(result?.data) || result.data.length !== input.recipients.length || result.data.some((email: { id?: string }) => !email.id)) throw new Error("CONTACT_EMAIL_SEND_FAILED");
}
