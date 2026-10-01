import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BUDGET_LABELS,
  PROJECT_TYPE_LABELS,
  contactSchema,
} from "../src/lib/contact-schema";
import handler, {
  DEFAULT_FROM_EMAIL,
  MAX_BODY_BYTES,
  RATE_LIMIT_MAX,
  RATE_LIMIT_WINDOW_MS,
  clientAddress,
  handleContact,
  resetContactRateLimit,
  type ContactEnv,
  type ContactRequest,
  type HeaderMap,
} from "../api/contact";

const resendMock = vi.hoisted(() => {
  const send = vi.fn();
  const constructed: string[] = [];
  class Resend {
    emails = { send };
    constructor(apiKey: string) {
      constructed.push(apiKey);
    }
  }
  return { send, constructed, Resend };
});

vi.mock("resend", () => ({ Resend: resendMock.Resend }));

const env: ContactEnv = {
  RESEND_API_KEY: "re_test_key",
  CONTACT_TO_EMAIL: "owner@example.com",
  CONTACT_FROM_EMAIL: "leads@example.com",
};

const NOW = 1_700_000_000_000;

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "(512) 555-0148",
    projectType: "new_pool",
    budget: "125k_200k",
    message: "A quiet yard.",
    company_website: "",
    ...overrides,
  };
}

function request(overrides: Partial<ContactRequest> = {}): ContactRequest {
  return {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: validBody(),
    ip: "203.0.113.10",
    now: NOW,
    env,
    ...overrides,
  };
}

function mockRes() {
  let statusCode = 0;
  let payload = "";
  const headers: Record<string, string | number> = {};
  return {
    get statusCode() {
      return statusCode;
    },
    set statusCode(value: number) {
      statusCode = value;
    },
    setHeader(name: string, value: string | number) {
      headers[name.toLowerCase()] = value;
    },
    end(chunk?: string) {
      payload = chunk ?? "";
    },
    headers,
    json(): unknown {
      return JSON.parse(payload) as unknown;
    },
  };
}

describe("handleContact", () => {
  beforeEach(() => {
    resetContactRateLimit();
    resendMock.send.mockReset();
    resendMock.send.mockResolvedValue({ data: { id: "email_123" }, error: null, headers: null });
    resendMock.constructed.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sends one email for a valid submission", async () => {
    const body = validBody({
      name: "Ada\n<b>Lovelace</b>",
      message: `Tom & "Jerry" <script>alert('x')</script>`,
    });
    const res = await handleContact(request({ body }));

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(resendMock.constructed).toEqual(["re_test_key"]);
    expect(resendMock.send).toHaveBeenCalledTimes(1);

    const sent = resendMock.send.mock.calls[0][0] as {
      from: string;
      to: string;
      replyTo: string;
      subject: string;
      html: string;
      text: string;
    };
    expect(sent.from).toBe("leads@example.com");
    expect(sent.to).toBe("owner@example.com");
    expect(sent.replyTo).toBe("ada@example.com");
    expect(sent.subject).toBe("New design consult request: Ada <b>Lovelace</b>");
    expect(sent.html).toContain("Tom &amp; &quot;Jerry&quot; &lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
    expect(sent.html).toContain("Ada &lt;b&gt;Lovelace&lt;/b&gt;");
    expect(sent.html).not.toContain("<script");
    expect(sent.html).not.toContain("<b>");
    expect(sent.text).toContain(`Tom & "Jerry" <script>alert('x')</script>`);
    expect(sent.text).toContain(PROJECT_TYPE_LABELS.new_pool);
    expect(sent.text).toContain(BUDGET_LABELS["125k_200k"]);
    expect(sent.text).not.toContain("new_pool");
    expect(sent.text).not.toContain("125k_200k");
  });

  it("uses the Resend sandbox sender when CONTACT_FROM_EMAIL is unset", async () => {
    const res = await handleContact(request({ env: { ...env, CONTACT_FROM_EMAIL: "  " } }));
    expect(res.status).toBe(200);
    expect(resendMock.send.mock.calls[0][0].from).toBe(DEFAULT_FROM_EMAIL);
  });

  it("returns schema field errors and does not send", async () => {
    const body = validBody({ email: "not-an-email", name: "A" });
    const parsed = contactSchema.safeParse(body);
    expect(parsed.success).toBe(false);
    if (parsed.success) return;

    const res = await handleContact(request({ body }));
    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
    if (res.body.ok) return;
    expect(res.body.error.code).toBe("validation");
    expect(res.body.error.message).toBe("Please check the highlighted fields.");
    expect(res.body.error.fields?.email).toBe("Please enter a valid email address.");
    expect(res.body.error.fields?.name).toBe("Please enter your name.");
    const emailIssue = parsed.error.issues.find((issue) => issue.path[0] === "email");
    expect(res.body.error.fields?.email).toBe(emailIssue?.message);
    expect(resendMock.send).not.toHaveBeenCalled();
  });

  it("drops a filled honeypot without emailing, even when other fields are invalid", async () => {
    const res = await handleContact(
      request({
        body: validBody({ company_website: "https://spam.example", email: "not-an-email" }),
        env: { RESEND_API_KEY: "", CONTACT_TO_EMAIL: "" },
      }),
    );
    expect(res).toEqual({ status: 200, body: { ok: true } });
    expect(resendMock.send).not.toHaveBeenCalled();

    for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
      const dropped = await handleContact(request({ body: validBody({ company_website: "bot" }) }));
      expect(dropped.status).toBe(200);
    }
    const real = await handleContact(request());
    expect(real.status).toBe(200);
    expect(resendMock.send).toHaveBeenCalledTimes(1);
  });

  it("rate limits the sixth lead from the same IP inside the window", async () => {
    for (let i = 0; i < RATE_LIMIT_MAX; i += 1) {
      const res = await handleContact(request());
      expect(res.status).toBe(200);
    }
    const blocked = await handleContact(request({ now: NOW + 1000 }));
    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({
      ok: false,
      error: {
        code: "rate_limited",
        message: "Too many requests. Please try again in a few minutes.",
      },
    });
    expect(blocked.headers?.["Retry-After"]).toBe(String(Math.ceil((RATE_LIMIT_WINDOW_MS - 1000) / 1000)));
    expect(resendMock.send).toHaveBeenCalledTimes(RATE_LIMIT_MAX);

    const otherIp = await handleContact(request({ ip: "203.0.113.11", now: NOW + 1000 }));
    expect(otherIp.status).toBe(200);

    const afterWindow = await handleContact(request({ now: NOW + RATE_LIMIT_WINDOW_MS + 1 }));
    expect(afterWindow.status).toBe(200);
    expect(resendMock.send).toHaveBeenCalledTimes(RATE_LIMIT_MAX + 2);
  });

  it("does not count validation errors toward the rate limit", async () => {
    for (let i = 0; i < RATE_LIMIT_MAX + 1; i += 1) {
      const res = await handleContact(request({ body: validBody({ email: "nope" }) }));
      expect(res.status).toBe(400);
    }
    const res = await handleContact(request());
    expect(res.status).toBe(200);
    expect(resendMock.send).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["RESEND_API_KEY", { RESEND_API_KEY: "  ", CONTACT_TO_EMAIL: "owner@example.com" }],
    ["CONTACT_TO_EMAIL", { RESEND_API_KEY: "re_test_key", CONTACT_TO_EMAIL: "" }],
  ] as const)("returns 503 not_configured when %s is missing", async (name, badEnv) => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handleContact(request({ env: badEnv }));
    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      ok: false,
      error: {
        code: "not_configured",
        message: "The contact form is temporarily unavailable. Please try again later.",
      },
    });
    expect(resendMock.send).not.toHaveBeenCalled();
    expect(resendMock.constructed).toEqual([]);
    const logged = spy.mock.calls.flat().join(" ");
    expect(logged).toContain(name);
    expect(logged).not.toContain("owner@example.com");
    expect(logged).not.toContain("re_test_key");
  });

  it("returns 502 when Resend rejects the email, without leaking the upstream message", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    resendMock.send.mockResolvedValue({
      data: null,
      error: { message: "domain is not verified: secret-detail", name: "validation_error", statusCode: 403 },
      headers: null,
    });
    const res = await handleContact(request());
    expect(res.status).toBe(502);
    expect(res.body).toEqual({
      ok: false,
      error: {
        code: "email_failed",
        message: "Something went wrong on our side. Please try again in a moment.",
      },
    });
    expect(JSON.stringify(res.body)).not.toContain("secret-detail");
    const logged = spy.mock.calls[0]?.[1] as Error & { cause?: unknown };
    expect(logged).toBeInstanceOf(Error);
    expect(JSON.stringify(logged.cause)).toContain("secret-detail");
    expect(resendMock.send).toHaveBeenCalledTimes(1);
  });

  it("returns 502 when the mailer throws", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    resendMock.send.mockRejectedValue(new Error("socket hang up: secret-detail"));
    const res = await handleContact(request());
    expect(res.status).toBe(502);
    expect(res.body).toEqual({
      ok: false,
      error: {
        code: "email_failed",
        message: "Something went wrong on our side. Please try again in a moment.",
      },
    });
    expect(JSON.stringify(res.body)).not.toContain("secret-detail");
    expect(spy).toHaveBeenCalled();
  });

  it("accepts a body at the 16 KB limit", async () => {
    const res = await handleContact(request({ bodyBytes: MAX_BODY_BYTES }));
    expect(res.status).toBe(200);
    expect(resendMock.send).toHaveBeenCalledTimes(1);
  });

  it("rejects non-POST, non-JSON, empty JSON, and oversized bodies", async () => {
    const method = await handleContact(request({ method: "GET" }));
    expect(method.status).toBe(405);
    expect(method.headers).toEqual({ Allow: "POST" });
    expect(method.body).toMatchObject({ ok: false, error: { code: "method_not_allowed" } });

    const type = await handleContact(request({ headers: { "content-type": "text/plain" } }));
    expect(type.status).toBe(415);
    expect(type.body).toMatchObject({ ok: false, error: { code: "unsupported_media_type" } });

    const missingType = await handleContact(request({ headers: {} }));
    expect(missingType.status).toBe(415);

    const empty = await handleContact(request({ body: "" }));
    expect(empty.status).toBe(400);
    expect(empty.body).toMatchObject({ ok: false, error: { code: "invalid_json" } });

    const broken = await handleContact(request({ body: "{" }));
    expect(broken.status).toBe(400);
    expect(broken.body).toMatchObject({ ok: false, error: { code: "invalid_json" } });

    const declared = await handleContact(request({ bodyBytes: MAX_BODY_BYTES + 1 }));
    expect(declared.status).toBe(400);
    expect(declared.body).toMatchObject({ ok: false, error: { code: "payload_too_large" } });

    const raw = await handleContact(request({ body: "x".repeat(MAX_BODY_BYTES + 1), bodyBytes: undefined }));
    expect(raw.status).toBe(400);
    expect(raw.body).toMatchObject({ ok: false, error: { code: "payload_too_large" } });

    expect(resendMock.send).not.toHaveBeenCalled();
  });
});

describe("clientAddress", () => {
  it("prefers the platform IP over client-supplied forwarding headers", () => {
    expect(
      clientAddress(
        { "x-forwarded-for": "1.1.1.1", "x-vercel-forwarded-for": "203.0.113.8, 10.0.0.1" },
        "10.0.0.1",
      ),
    ).toBe("203.0.113.8");
    expect(clientAddress({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "1.1.1.1" })).toBe("203.0.113.7");
    expect(clientAddress({ "x-forwarded-for": ["203.0.113.6, 10.0.0.2"] })).toBe("203.0.113.6");
    expect(clientAddress({}, "10.0.0.4")).toBe("10.0.0.4");
    expect(clientAddress({})).toBe("unknown");
  });
});

describe("vercel handler", () => {
  const previous = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    CONTACT_TO_EMAIL: process.env.CONTACT_TO_EMAIL,
    CONTACT_FROM_EMAIL: process.env.CONTACT_FROM_EMAIL,
  };

  beforeEach(() => {
    resetContactRateLimit();
    resendMock.send.mockReset();
    resendMock.send.mockResolvedValue({ data: { id: "email_123" }, error: null, headers: null });
    process.env.RESEND_API_KEY = env.RESEND_API_KEY;
    process.env.CONTACT_TO_EMAIL = env.CONTACT_TO_EMAIL;
    process.env.CONTACT_FROM_EMAIL = env.CONTACT_FROM_EMAIL;
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    vi.restoreAllMocks();
  });

  it("writes JSON for a parsed POST body and for a raw stream", async () => {
    const parsed = mockRes();
    const parsedReq = Object.assign(Readable.from([]), {
      method: "POST",
      headers: { "content-type": "application/json" } as HeaderMap,
      body: validBody(),
      socket: { remoteAddress: "203.0.113.21" },
    });
    await handler(parsedReq, parsed);
    expect(parsed.statusCode).toBe(200);
    expect(parsed.headers["content-type"]).toBe("application/json; charset=utf-8");
    expect(parsed.json()).toEqual({ ok: true });

    const streamed = mockRes();
    const streamedReq = Object.assign(Readable.from([Buffer.from(JSON.stringify(validBody()))]), {
      method: "POST",
      headers: { "content-type": "application/json" } as HeaderMap,
      socket: { remoteAddress: "203.0.113.22" },
    });
    await handler(streamedReq, streamed);
    expect(streamed.statusCode).toBe(200);
    expect(streamed.json()).toEqual({ ok: true });
    expect(resendMock.send).toHaveBeenCalledTimes(2);
  });

  it("returns 405 for GET", async () => {
    const res = mockRes();
    const req = Object.assign(Readable.from([]), {
      method: "GET",
      headers: {} as HeaderMap,
      socket: { remoteAddress: "203.0.113.23" },
    });
    await handler(req, res);
    expect(res.statusCode).toBe(405);
    expect(res.headers.allow).toBe("POST");
    expect(res.json()).toMatchObject({ ok: false, error: { code: "method_not_allowed" } });
    expect(resendMock.send).not.toHaveBeenCalled();
  });

  it("rejects an oversized raw stream", async () => {
    const res = mockRes();
    const req = Object.assign(Readable.from([Buffer.from("x".repeat(MAX_BODY_BYTES + 1))]), {
      method: "POST",
      headers: { "content-type": "application/json" } as HeaderMap,
      socket: { remoteAddress: "203.0.113.24" },
    });
    await handler(req, res);
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ ok: false, error: { code: "payload_too_large" } });
    expect(resendMock.send).not.toHaveBeenCalled();
  });
});
