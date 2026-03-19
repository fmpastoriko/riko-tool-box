import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      return user.email === process.env.OWNER_EMAIL;
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        token.sub = profile.sub;
        token.role =
          profile.email === process.env.OWNER_EMAIL
            ? "owner"
            : "unauthenticated";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { sub?: string }).sub = token.sub as string;
        (session as unknown as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
