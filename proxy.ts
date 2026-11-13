import { NextRequest, NextResponse } from "next/server";
import { auth } from "./server/auth";

export async function proxy(request: NextRequest) {
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session || (session.user as { active?: boolean }).active === false) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    if (
        request.nextUrl.pathname.startsWith("/admin") &&
        (session.user as { role?: string }).role !== "admin"
    ) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!login|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
    ],
};
