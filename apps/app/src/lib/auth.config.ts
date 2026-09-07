import type { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";
import type { RoleName, UserStatus } from "@prisma/client";

const LEGACY_DEV_ID_MAP: Record<string, string> = {
  usr_dev_admin_001: "cmt5plrh90000lrrkrk76bb0b",
  usr_dev_ceo_001: "cmt5plsb20001lrrk0w684oz0",
  usr_dev_finance_001: "cmt5plt6q0002lrrkr5jnsghs",
  usr_dev_stat_001: "cmt5plu1k0003lrrkl1kribvh",
  usr_dev_qa_001: "cmt5pluuu0004lrrk5qu5ul2t",
  usr_dev_client_001: "cmt5plvqe0005lrrkcoiysc7j",
  usr_dev_suspended_001: "cmt5plwpt0006lrrk1vi05x2g",
};

export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = LEGACY_DEV_ID_MAP[user.id] || user.id;
        if (user.email) {
          token.email = user.email;
        }
        token.role = user.role;
        token.fullName = user.fullName;
        token.status = user.status;
      } else if (token.id && typeof token.id === "string" && LEGACY_DEV_ID_MAP[token.id]) {
        token.id = LEGACY_DEV_ID_MAP[token.id];
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        const rawId = token.id as string;
        session.user.id = LEGACY_DEV_ID_MAP[rawId] || rawId;
        if (token.email) {
          session.user.email = token.email as string;
        }
        session.user.role = token.role as RoleName;
        session.user.fullName = token.fullName as string;
        session.user.status = token.status as UserStatus;
      }
      return session;
    },
  },
};

const nextAuthEdgeInstance = NextAuth(authConfig);

export const auth = nextAuthEdgeInstance.auth;
