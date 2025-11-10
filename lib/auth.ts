import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
import { compare } from 'bcryptjs';
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

import { db } from '@/lib/db/client';
import { users } from '@/lib/db/schema';
import { env } from './env';

export const authOptions = {
  adapter: DrizzleAdapter(db),
  session: {
    strategy: 'jwt' as const
  },
  providers: [
    CredentialsProvider({
      name: 'Workspace account',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        const username = credentials?.username?.toLowerCase().trim();
        const password = credentials?.password;

        if (!username || !password) {
          return null;
        }

        const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
        if (!user) {
          return null;
        }

        const passwordMatches = await compare(password, user.passwordHash);
        if (!passwordMatches) {
          return null;
        }

        return {
          id: user.id,
          name: user.name ?? user.username,
          image: user.image ?? undefined,
          email: user.email ?? undefined,
          username: user.username
        };
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (!token?.id) {
        return session;
      }

      const [existingUser] = await db
        .select({
          id: users.id,
          name: users.name,
          image: users.image,
          email: users.email,
          username: users.username
        })
        .from(users)
        .where(eq(users.id, token.id as string))
        .limit(1);

      if (!existingUser) {
        session.user = undefined;
        return session;
      }

      session.user = {
        ...(session.user ?? {}),
        id: existingUser.id,
        name: existingUser.name ?? 'Unnamed analyst',
        image: existingUser.image ?? undefined,
        email: existingUser.email ?? undefined,
        username: existingUser.username
      };

      return session;
    },
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
        if ('username' in user && typeof user.username === 'string') {
          token.username = user.username;
        }
      }

      return token;
    }
  },
  trustHost: true,
  secret: env.NEXTAUTH_SECRET
} satisfies Parameters<typeof NextAuth>[0];

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut
} = NextAuth(authOptions);
