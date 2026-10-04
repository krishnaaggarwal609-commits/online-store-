const SENSITIVE = /password|secret|token|authorization|cookie|card|cvv|otp/i;

function redact(value: unknown): unknown {
  if (value && typeof value === "object") {
    if (Array.isArray(value)) return value.map(redact);
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE.test(k) ? "[redacted]" : redact(v);
    }
    return out;
  }
  return value;
}

function line(level: string, message: string, meta?: unknown) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta: redact(meta) } : {}),
  };
  const serialized = JSON.stringify(entry);
  if (level === "error") console.error(serialized);
  else console.log(serialized);
}

export const logger = {
  info: (message: string, meta?: unknown) => line("info", message, meta),
  warn: (message: string, meta?: unknown) => line("warn", message, meta),
  error: (message: string, meta?: unknown) => line("error", message, meta),
  auth: (message: string, meta?: unknown) => line("info", `auth: ${message}`, meta),
  payment: (message: string, meta?: unknown) => line("info", `payment: ${message}`, meta),
  order: (message: string, meta?: unknown) => line("info", `order: ${message}`, meta),
  inventory: (message: string, meta?: unknown) => line("info", `inventory: ${message}`, meta),
  admin: (message: string, meta?: unknown) => line("info", `admin: ${message}`, meta),
};
