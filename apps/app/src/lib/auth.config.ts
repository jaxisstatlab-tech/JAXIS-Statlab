import type { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";
import type { RoleName, UserStatus } from "@prisma/client";

const LEGACY_DEV_ID_MAP: Record<string, string> = {
  usr_dev_admin_001: "cmu99bmds0000lrow6sbc7luy",
  usr_dev_ceo_001: "cmt5plsb20001lrrk0w684oz0",
  usr_dev_finance_001: "cmu99bny80002lrowev9mf1f3",
  usr_dev_stat_001: "cmu99botv0003lrowauyj8dwi",
  usr_dev_qa_001: "cmu99bplv0004lrowkjy7iukg",
  usr_dev_client_001: "cmu99bqf70005lrowvdx8odq6",
  usr_dev_suspended_001: "cmu99br9u0006lrowo3liwjhd",
  // Map previous seed run legacy CUIDs if existing in active cookies
  cmt5plrh90000lrrkrk76bb0b: "cmu99bmds0000lrow6sbc7luy",
  cmt5plt6q0002lrrkr5jnsghs: "cmu99bny80002lrowev9mf1f3",
  cmt5plu1k0003lrrkl1kribvh: "cmu99botv0003lrowauyj8dwi",
  cmt5pluuu0004lrrk5qu5ul2t: "cmu99bplv0004lrowkjy7iukg",
  cmt5plvqe0005lrrkcoiysc7j: "cmu99bqf70005lrowvdx8odq6",
  cmt5plwpt0006lrrk1vi05x2g: "cmu99br9u0006lrowo3liwjhd",
};

// Enforce production URL in Vercel environments if not already specified
if (process.env.VERCEL) {
  if (!process.env.AUTH_URL) {
    process.env.AUTH_URL = "https://jaxis-statlab-app.vercel.app";
  }
  if (!process.env.NEXTAUTH_URL) {
    process.env.NEXTAUTH_URL = "https://jaxis-statlab-app.vercel.app";
  }
}

export const authConfig: NextAuthConfig = {
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dev_secret_key_minimum_32_characters_long_for_jaxis_statlab",
  debug: process.env.NODE_ENV !== "production",
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
        token.role = (user as any).role || token.role || "CLIENT";
        token.fullName = (user as any).fullName || user.name || "Research Client";
        token.status = (user as any).status || "ACTIVE";
        if ((user as any).pwdFp) {
          token.pwdFp = (user as any).pwdFp;
        }
        if (user.rememberMe !== undefined) {
          token.rememberMe = user.rememberMe;
          token.exp = Math.floor(Date.now() / 1000) + (user.rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60);
        }
      } else if (token.id && typeof token.id === "string" && LEGACY_DEV_ID_MAP[token.id]) {
        token.id = LEGACY_DEV_ID_MAP[token.id];
      }
      if (!token.role) {
        token.role = "CLIENT";
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
        if (token.pwdFp) {
          session.user.pwdFp = token.pwdFp as string;
        }
        if (token.rememberMe !== undefined) {
          session.user.rememberMe = token.rememberMe as boolean;
        }
      }
      return session;
    },
  },
};

const nextAuthEdgeInstance = NextAuth(authConfig);

export const auth = nextAuthEdgeInstance.auth;
