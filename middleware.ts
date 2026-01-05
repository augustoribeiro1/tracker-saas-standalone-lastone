export { default } from 'next-auth/middleware';
export const config = {
  matcher: [
    '/((?!api/auth|api/track|auth|_next/static|_next/image|favicon.ico|r/|c/).*)',
    //            ^^^^^^^^^ ADICIONADO
  ],
};