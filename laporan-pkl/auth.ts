import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "");
        const password = String(credentials?.password ?? "");

        const user = await prisma.pengguna.findUnique({ where: { email } });
        if (!user || !user.aktif) return null;

        const cocok = await bcrypt.compare(password, user.kataSandi);
        if (!cocok) return null;

        return { id: user.id, name: user.nama, email: user.email, peran: user.peran };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.peran = user.peran;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.peran = token.peran as string;
      return session;
    },
  },
});