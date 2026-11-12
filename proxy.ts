import { NextRequest, NextResponse } from "next/server";
import { auth } from "./server/auth";


export async function proxy(request: NextRequest) {
    const session = await auth.api.getSession({ headers: request.headers })

    if (!session) {
        return NextResponse.redirect(new URL("/login", request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"]
}