import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "./lib/auth-constants";

/**
 * Hafif kenar koruması: oturum çerezi olmayan istekleri girişe yönlendirir.
 * Asıl oturum + 2FA doğrulaması sunucu tarafında (requireUser) yapılır;
 * burası yalnızca ilk bariyerdir.
 */

// Kimlik doğrulaması GEREKTİRMEYEN yollar
const PUBLIC_PATHS = [
  "/giris",
  "/basvuru", // QR ile açılan aday başvuru formu
  "/api/giris",
  "/api/basvuru",
  "/api/ingest", // telesekreter robotu (kendi API anahtarı doğrulaması var)
  "/api/ivr/webhook", // telefoni sağlayıcısı geri bildirimi (API anahtarlı)
  "/api/saglik",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (isPublic) return NextResponse.next();

  const hasSession = request.cookies.has(SESSION_COOKIE);
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/giris";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // statik dosyalar ve Next iç yolları hariç her şey
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
