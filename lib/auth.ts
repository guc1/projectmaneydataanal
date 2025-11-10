import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { eq } from 'drizzle-orm';
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
        userId: { label: 'User ID', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials?.userId) {
          return null;
        }

        const [user] = await db.select().from(users).where(eq(users.id, credentials.userId)).limit(1);
        if (!user) {
          return null;
        }

        return {
          id: user.id,
          name: user.name ?? 'Unnamed analyst',
          image: user.image ?? undefined,
          email: user.email ?? undefined
        };
      }
    })
  ],
  callbacks: {
    async session({ session, token }) {
      if (token?.id) {
        session.user = {
          id: token.id as string,
          name: (token.name as string | null | undefined) ?? 'Unnamed analyst',
          image: (token.picture as string | null | undefined) ?? undefined,
          email: (token.email as string | null | undefined) ?? undefined
        } as typeof session.user & { id: string };
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name ?? undefined;
        token.picture = user.image ?? undefined;
        token.email = user.email ?? undefined;
      } else if (token?.id) {
        const [existingUser] = await db
          .select({
            id: users.id,
            name: users.name,
            image: users.image,
            email: users.email
          })
          .from(users)
          .where(eq(users.id, token.id as string))
          .limit(1);

        if (existingUser) {
          token.name = existingUser.name ?? undefined;
          token.picture = existingUser.image ?? undefined;
          token.email = existingUser.email ?? undefined;
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
