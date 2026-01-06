export { default } from 'next-auth/middleware';
export const config = {
  matcher: [
    '/((?!api/auth|api/track|api/webhooks|auth|_next/static|_next/image|tracking.js|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.jpeg$|.*\\.svg$|.*\\.gif$|.*\\.ico$|r/|c/).*)',
    //            ^^^^^^^^^ ADICIONADO
  ],
};