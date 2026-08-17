/** SQLite string literal. Newlines are allowed; only `'` must be doubled. */
export function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}
