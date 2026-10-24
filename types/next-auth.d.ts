import { DefaultSession } from "next-auth"

type AppUserRole = 'admin' | 'author' | 'learner'

declare module "next-auth" {
  interface Session {
    user: {
      role: AppUserRole
      id: string
      emailVerified: boolean
      tokenVersion: number
      sessionValid: boolean
    } & DefaultSession["user"]
  }

  interface User {
    role?: AppUserRole
    emailVerified?: boolean
    tokenVersion?: number
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: AppUserRole
    id: string
    emailVerified: boolean
    tokenVersion: number
    sessionValid: boolean
  }
}
