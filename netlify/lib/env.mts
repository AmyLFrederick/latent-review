// Fail-loud environment check (house rule: never run half-configured).
// Called at module load in every function, so a missing variable kills the
// cold start with an error naming exactly what is absent, instead of letting
// a request limp through on defaults.
export function requireEnv(...names: string[]): void {
  const missing = names.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variable(s): ${missing.join(', ')}`);
  }
}
