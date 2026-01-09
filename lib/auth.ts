import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { db } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db) as any,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password required');
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email }
        });

        if (!user || !user.password) {
          throw new Error('Invalid credentials');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error('Invalid credentials');
        }

        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          plan: user.plan,
        };
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/auth/login',
    signOut: '/auth/login',
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Se é um novo login, adicionar dados do usuário
      if (user) {
        token.id = user.id;
        token.plan = user.plan;
      }

      // ✅ Se trigger é 'update', buscar dados atualizados do banco
      if (trigger === 'update' || !token.trackingParamPrimary) {
        const dbUser = await db.user.findUnique({
          where: { id: Number(token.id) },
          select: {
            plan: true,
            trackingParamPrimary: true,
            trackingParamBackup: true
          }
        });

        if (dbUser) {
          token.plan = dbUser.plan;
          token.trackingParamPrimary = dbUser.trackingParamPrimary;
          token.trackingParamBackup = dbUser.trackingParamBackup;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.plan = token.plan as string;
        (session.user as any).trackingParamPrimary = token.trackingParamPrimary as string;
        (session.user as any).trackingParamBackup = token.trackingParamBackup as string;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET,
};
