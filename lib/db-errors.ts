// Recognising errors from PostgreSQL, so a lib function can turn a refusal from the
// database into the same answer a rule in domain/ would give.

// Whether the error is a unique index refusing a row, here the index named constraint.
// node-postgres reports it as code 23505 with the index's name. Drizzle wraps the error,
// so the original is in cause.
export function violates(error: unknown, constraint: string): boolean {
  for (let e: unknown = error; e instanceof Error; e = e.cause) {
    const pgError = e as Error & { code?: string; constraint?: string };
    if (pgError.code === "23505" && pgError.constraint === constraint) return true;
  }
  return false;
}
