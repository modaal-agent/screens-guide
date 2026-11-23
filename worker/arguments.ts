// Checks a tool's arguments against its input schema. The Workers runtime forbids generating code,
// which schema compilers such as Ajv do, so this walks the subset of JSON Schema the inputs use:
// type, properties, required, additionalProperties, items, enum, minimum, maximum, min/max items,
// uniqueItems and min/max length.

import type { Schema } from './types.ts'

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`

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
  if (typeof value === 'number' && schema.maximum !== undefined && value > schema.maximum) {
    problems.push(`${path} must be at most ${schema.maximum}`)
  }
  if (typeof value === 'number' && !Number.isFinite(value)) problems.push(`${path} must be a finite number`)
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) problems.push(`${path} must have at least ${count(schema.minLength, 'character')}`)
    if (schema.maxLength !== undefined && value.length > schema.maxLength) problems.push(`${path} must have at most ${count(schema.maxLength, 'character')}`)
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) problems.push(`${path} must have at least ${count(schema.minItems, 'item')}`)
    if (schema.maxItems !== undefined && value.length > schema.maxItems) problems.push(`${path} must have at most ${count(schema.maxItems, 'item')}`)
    if (schema.uniqueItems) {
      const seen = new Set<string>()
      const repeated = new Set<string>()
      for (const item of value) {
        const key = JSON.stringify(item)
        if (seen.has(key)) repeated.add(key)
        seen.add(key)
      }
      if (repeated.size) problems.push(`${path} must not repeat an item: ${[...repeated].join(', ')} appears more than once`)
    }
    if (schema.items) value.forEach((item, i) => problems.push(...checkArguments(schema.items!, item, `${path}[${i}]`)))
  }
  if (typeOf(value) === 'object') {
    const obj = value as Record<string, unknown>
    for (const key of schema.required ?? []) if (!(key in obj)) problems.push(`${path}.${key} is required`)
    const known = Object.keys(schema.properties ?? {}).join(', ')
    for (const [key, v] of Object.entries(obj)) {
      const sub = schema.properties?.[key]
      if (sub) problems.push(...checkArguments(sub, v, `${path}.${key}`))
      else if (schema.additionalProperties === false) {
        problems.push(path === 'arguments'
          ? `${path}.${key} is not an argument of this tool; its arguments are ${known}`
          : `${path}.${key} is not a key of ${path}; its keys are ${known}`)
      }
    }
  }
  return problems
}
