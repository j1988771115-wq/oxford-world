// Auth middleware disabled — re-enable when auth provider is configured
import { NextResponse } from "next/server";

export default function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
