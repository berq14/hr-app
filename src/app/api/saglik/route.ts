import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** İzleme sistemleri için sağlık ucu — hassas bilgi döndürmez. */
export async function GET() {
  return NextResponse.json({ ok: true });
}
