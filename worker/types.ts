// The parts of the Workers runtime the Worker uses, typed here so the code needs no type package.

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
}

export interface RateLimit {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

export interface DurableObjectStub {
  fetch(request: Request | string, init?: RequestInit): Promise<Response>
}

export interface DurableObjectNamespace {
  idFromName(name: string): unknown
  get(id: unknown): DurableObjectStub
}

export interface Env {
  ASSETS: { fetch(request: Request | string): Promise<Response> }
  /** The minute window of spec 002 §2.6; absent where the plan has no rate limiting binding. */
  MCP_MINUTE?: RateLimit
  /** The day window: one DailyCount object per client address. */
  DAILY_COUNT: DurableObjectNamespace
  /** Requests a client address may send /mcp in a UTC day; a string, as wrangler's vars are. */
  MCP_DAY_LIMIT?: string
}

/** A JSON Schema of the subset the tools use. */
export interface Schema {
  type?: 'object' | 'array' | 'string' | 'number' | 'integer' | 'boolean' | 'null' | ('object' | 'array' | 'string' | 'number' | 'integer' | 'boolean' | 'null')[]
  description?: string
  properties?: Record<string, Schema>
  required?: string[]
  additionalProperties?: boolean | Schema
  items?: Schema
  enum?: unknown[]
  minimum?: number
  maximum?: number
  minItems?: number
  maxItems?: number
  uniqueItems?: boolean
  minLength?: number
  maxLength?: number
  $ref?: string
  $defs?: Record<string, unknown>
  [key: string]: unknown
}
