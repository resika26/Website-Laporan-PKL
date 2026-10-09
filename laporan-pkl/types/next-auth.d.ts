import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    peran?: string;
  }
  interface Session {
    user: { id: string; peran: string } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    peran?: string;
  }
}