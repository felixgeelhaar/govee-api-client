/** Optional cancellation for a control command, including queue and retry waits. */
export interface CommandOptions {
  signal?: AbortSignal;
}
