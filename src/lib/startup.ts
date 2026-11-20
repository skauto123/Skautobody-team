export function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    String((error as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")
  );
}

export function safeStartupMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (
    message.startsWith("Set OWNER_") ||
    message.startsWith("OWNER_") ||
    message.startsWith("SQLite cannot") ||
    message.startsWith("DATABASE_URL")
  ) {
    return message;
  }
  return "Could not open the database. Check the server logs and the database settings in the README.";
}
