import type { DefaultSession } from "next-auth";
import type { RoleName, UserStatus } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: RoleName;
      fullName: string;
      status: UserStatus;
      pwdFp?: string;
      rememberMe?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: RoleName;
    fullName: string;
    status: UserStatus;
    pwdFp?: string;
    rememberMe?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: RoleName;
    fullName?: string;
    status?: UserStatus;
    pwdFp?: string;
    rememberMe?: boolean;
  }
}
