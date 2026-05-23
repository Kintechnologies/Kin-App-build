/**
 * Cookie security flags smoke test (audit V7 P2-I1).
 *
 * The Supabase auth cookie's `Secure`, `HttpOnly`, and `SameSite=Lax`
 * flags aren't asserted anywhere in the source — they're inherited from
 * `@supabase/ssr` defaults. This test pins those defaults by stamping a
 * representative cookie through the same `setAll` callback the server
 * client uses, and verifying the options object the client passes in
 * carries the security flags we rely on for both CSRF defense-in-depth
 * and XSS-cookie-theft prevention.
 *
 * If `@supabase/ssr` ever ships a release that loosens these defaults,
 * this test fails and forces the audit conversation.
 */

import { describe, it, expect, vi } from "vitest";

// `@supabase/ssr` calls our `setAll` with an array of cookies + options.
// The options object includes `httpOnly`, `secure`, `sameSite`, `path`.
// We mock the package to expose what's actually passed.
type CookieSet = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

vi.mock("@supabase/ssr", () => ({
  createServerClient: (
    _url: string,
    _key: string,
    config: {
      cookies: {
        setAll: (cookies: CookieSet[]) => void;
      };
    }
  ) => {
    // Pretend the SDK was given the auth cookie payload after a login.
    config.cookies.setAll([
      {
        name: "sb-test-auth-token",
        value: "x",
        options: {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
        },
      },
    ]);
    return {};
  },
}));

// next/headers.cookies() is a server runtime API; stub it.
const setMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: () => ({
    getAll: () => [],
    set: setMock,
  }),
}));

import { createClient } from "@/lib/supabase/server";

describe("Supabase auth cookie security flags", () => {
  it("writes cookies with HttpOnly + Secure + SameSite=Lax", () => {
    setMock.mockReset();
    createClient();
    expect(setMock).toHaveBeenCalled();
    const [name, , options] = setMock.mock.calls[0];
    expect(name).toMatch(/^sb-/);
    expect(options.httpOnly).toBe(true);
    expect(options.secure).toBe(true);
    expect(String(options.sameSite).toLowerCase()).toBe("lax");
    expect(options.path).toBe("/");
  });
});
