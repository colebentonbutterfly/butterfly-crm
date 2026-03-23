import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

export const config = {
  matcher: [
    // Protect everything except login, api/auth, static files, and _next
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|icon-192.svg|manifest.json|sw.js|uploads/).*)",
  ],
};
