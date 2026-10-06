import test from "node:test";
import assert from "node:assert/strict";
import { notifyOrganizers } from "../src/lib/organizer-email.ts";

test("notification privée : destinataires séparés, réponse contributeur et idempotence", async () => {
  process.env.RESEND_API_KEY = "test-resend-not-a-real-secret";
  process.env.LIVREDOR_CONTACT_FROM = "contact@example.test";
  const input = { requestId: "ca000000-0000-4000-8000-000000000001", projectTitle: "TEST", displayName: "Alex", body: "<script>texte sans HTML</script>", replyTo: "author@example.test", recipients: ["one@example.test", "two@example.test"] };
  const captured = [];
  const transport = async (url, init) => {
    captured.push({ url, init });
    return Response.json({ data: [{ id: "one" }, { id: "two" }] });
  };
  await notifyOrganizers(input, transport);
  await notifyOrganizers(input, transport);
  const payload = JSON.parse(captured[0].init.body);
  assert.equal(captured[0].url, "https://api.resend.com/emails/batch");
  assert.equal(captured[0].init.headers["Idempotency-Key"], captured[1].init.headers["Idempotency-Key"]);
  assert.deepEqual(payload.map(email => email.to), [["one@example.test"], ["two@example.test"]]);
  assert.equal(payload[0].reply_to, input.replyTo);
  assert.equal(payload[0].html, undefined);
  assert.equal(payload[0].attachments, undefined);
  await assert.rejects(notifyOrganizers(input, async () => Response.json({ message: "private recipient one@example.test" }, { status: 500 })), { message: "CONTACT_EMAIL_SEND_FAILED" });
  await assert.rejects(notifyOrganizers(input, async () => Response.json({ data: [{ id: "one" }] })), { message: "CONTACT_EMAIL_SEND_FAILED" });
  delete process.env.RESEND_API_KEY;
  await assert.rejects(notifyOrganizers(input, transport), { message: "CONTACT_EMAIL_NOT_CONFIGURED" });
  delete process.env.LIVREDOR_CONTACT_FROM;
});
