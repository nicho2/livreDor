import handler from "vinext/server/fetch-handler";

// Supabase remains the sole product identity provider. Never grant organizer
// rights from Sites headers or replace the Supabase bearer session.
export default handler;
