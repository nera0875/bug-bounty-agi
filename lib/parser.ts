export interface ParsedRequest {
  method: string
  endpoint: string
  params: Record<string, any>
  headers?: Record<string, string>
  body?: string
  tags: string[]
  signature: string
}

export function parseHarBurpRequest(rawText: string): ParsedRequest {
  const lines = rawText.split('\n')
  const firstLine = lines[0] || ''

  // Parse method and endpoint
  const [method, path] = firstLine.split(' ').filter(Boolean)

  // Extract host from headers
  let host = ''
  const headers: Record<string, string> = {}
  let bodyStart = -1

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]

    if (line === '') {
      bodyStart = i + 1
      break
    }

    const [key, ...valueParts] = line.split(':')
    if (key && valueParts.length) {
      const value = valueParts.join(':').trim()
      headers[key.toLowerCase()] = value

      if (key.toLowerCase() === 'host') {
        host = value
      }
    }
  }

  // Extract body if exists
  let body = ''
  if (bodyStart > 0 && bodyStart < lines.length) {
    body = lines.slice(bodyStart).join('\n').trim()
  }

  // Parse query params and body params
  const url = new URL(`http://${host}${path || '/'}`)
  const params: Record<string, any> = {}

  // Get query params
  url.searchParams.forEach((value, key) => {
    params[key] = value
  })

  // Parse body params if JSON or form-encoded
  if (body) {
    try {
      const jsonBody = JSON.parse(body)
      Object.assign(params, jsonBody)
    } catch {
      // Try form-encoded
      const formParams = new URLSearchParams(body)
      formParams.forEach((value, key) => {
        params[key] = value
      })
    }
  }

  // Auto-generate tags
  const tags = generateTags(path || '', params, headers)

  // Generate signature
  const signature = generateSignature(method || 'GET', path || '/', Object.keys(params))

  return {
    method: method || 'GET',
    endpoint: `${host}${path || '/'}`,
    params,
    headers,
    body,
    tags,
    signature
  }
}

function generateTags(path: string, params: Record<string, any>, headers: Record<string, string>): string[] {
  const tags: string[] = []

  // Check for common patterns
  if (path.includes('/api/')) tags.push('api')
  if (path.includes('/admin')) tags.push('admin')
  if (path.includes('/user') || path.includes('/profile')) tags.push('auth')
  if (path.includes('/pay') || path.includes('/checkout') || path.includes('/billing')) tags.push('payment')
  if (path.includes('/search')) tags.push('search')
  if (path.includes('/upload') || path.includes('/file')) tags.push('file')

  // Check params
  if (params.email || params.username || params.password) tags.push('auth')
  if (params.card || params.payment || params.amount) tags.push('payment')
  if (params.admin || params.role) tags.push('admin')
  if (params.query || params.q || params.search) tags.push('search')

  // Check headers
  if (headers.authorization || headers['x-api-key']) tags.push('api')

  return [...new Set(tags)]
}

function generateSignature(method: string, path: string, paramKeys: string[]): string {
  // Create a unique signature for similar requests
  const pathParts = path.split('/').filter(Boolean)
  const genericPath = pathParts.map(part => {
    // Replace IDs and numbers with placeholders
    if (/^\d+$/.test(part) || /^[a-f0-9-]{36}$/i.test(part)) {
      return '{id}'
    }
    return part
  }).join('/')

  const sortedParams = paramKeys.sort().join(',')
  return `${method}:/${genericPath}:[${sortedParams}]`
}