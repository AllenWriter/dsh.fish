/**
 * A single integer resume position, for passes that page a stored list
 * rather than a remote search.
 */
export interface OffsetCursor {
  read(): Promise<number | undefined>
  write(offset: number): Promise<void>
}
