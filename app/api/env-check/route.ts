import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    all_env_vars: {
      api_base: process.env.NEXT_PUBLIC_API_BASE_URL,
      nextauth_url: process.env.NEXTAUTH_URL,
      node_env: process.env.NODE_ENV,
    },
  })
}
