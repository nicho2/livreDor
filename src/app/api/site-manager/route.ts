import { NextResponse } from "next/server";
import { apiError, requestUser } from "@/lib/api-server";
import { isSiteManager } from "@/lib/site-manager";

export async function GET(request: Request) {
  try {
    const user = (await requestUser(request))!;
    return NextResponse.json({ manager: isSiteManager(user, process.env.LIVREDOR_SITE_MANAGERS) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
