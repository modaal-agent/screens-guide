// Checks a tool's arguments against its input schema. The Workers runtime forbids generating code,
// which schema compilers such as Ajv do, so this walks the subset of JSON Schema the inputs use:
// type, properties, required, additionalProperties, items, enum, minimum, min/max items and length.

import type { Schema } from './types.ts'

function typeOf(v: unknown): string {
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'array'
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number'
  return typeof v
}

function typeMatches(want: string, v: unknown): boolean {
  const t = typeOf(v)
  return t === want || (want === 'number' && t === 'integer')
}

/** The problems with `value`, each naming its path; empty when it matches. */
export function checkArguments(schema: Schema, value: unknown, path = 'arguments'): string[] {
  const problems: string[] = []
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type]
    if (!types.some((t) => typeMatches(t, value))) {
      return [`${path} must be ${types.join(' or ')}, not ${typeOf(value)}`]
    }
  }
  if (schema.enum && !schema.enum.includes(value)) {
    problems.push(`${path} must be one of ${schema.enum.map((e) => JSON.stringify(e)).join(', ')}`)
  }
  if (typeof value === 'number' && schema.minimum !== undefined && value < schema.minimum) {
    problems.push(`${path} must be at least ${schema.minimum}`)
  }
  if (typeof value === 'number' && !Number.isFinite(value)) problems.push(`${path} must be a finite number`)
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) problems.push(`${path} must have at least ${schema.minLength} characters`)
    if (schema.maxLength !== undefined && value.length > schema.maxLength) problems.push(`${path} must have at most ${schema.maxLength} characters`)
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) problems.push(`${path} must have at least ${schema.minItems} items`)
    if (schema.maxItems !== undefined && value.length > schema.maxItems) problems.push(`${path} must have at most ${schema.maxItems} items`)
    if (schema.items) value.forEach((item, i) => problems.push(...checkArguments(schema.items!, item, `${path}[${i}]`)))
  }
  if (typeOf(value) === 'object') {
    const obj = value as Record<string, unknown>
    for (const key of schema.required ?? []) if (!(key in obj)) problems.push(`${path}.${key} is required`)
    for (const [key, v] of Object.entries(obj)) {
      const sub = schema.properties?.[key]
      if (sub) problems.push(...checkArguments(sub, v, `${path}.${key}`))
      else if (schema.additionalProperties === false) problems.push(`${path}.${key} is not an argument of this tool`)
    }
  }
  return problems
}
