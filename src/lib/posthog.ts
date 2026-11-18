// The site's PostHog project: the token, the EU host and the one hostname that sends events.
// The pages (src/lib/analytics.ts) and the Worker (worker/analytics.ts) import these, and nothing
// else, so the Worker's bundle carries no posthog-js.

export const POSTHOG_TOKEN = 'phc_uUCsuu3u789nj9y6wBqTqDhffPrnbJwn9P75ezSyK4pf'
export const POSTHOG_HOST = 'https://eu.i.posthog.com'
export const ANALYTICS_HOSTNAME = 'screens.guide'
