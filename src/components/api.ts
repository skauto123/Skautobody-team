export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
  const text = await response.text();
  let body: { error?: unknown } = {};
  if (text) {
    try {
      body = JSON.parse(text) as { error?: unknown };
    } catch {
      throw new Error("The server sent an unexpected response.");
    }
  }
  if (response.status === 401 && typeof window !== "undefined") {
    window.location.href = "/login";
    throw new Error("Sign in required.");
  }
  if (!response.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Something went wrong.");
  }
  return body as T;
}
