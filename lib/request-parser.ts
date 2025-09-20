// Request Parser - Extraction intelligente des données critiques
import crypto from 'crypto';

// Types
export interface ParsedRequest {
  // Core (30% du volume)
  hash: string;
  method: string;
  endpoint: string;
  domain: string;

  // Critical Data (20%)
  params: Record<string, any>;
  body: Record<string, any>;
  headers: Record<string, string>;

  // Attack Vectors (30%)
  patterns: string[];
  category: RequestCategory;
  attackVectors: string[];

  // Metadata (20%)
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

export enum RequestCategory {
  AUTH = 'auth',
  PAYMENT = 'payment',
  API = 'api',
  PROFILE = 'profile',
  WORKFLOW = 'workflow',
  REFUND = 'refund',
  ADMIN = 'admin',
  SEARCH = 'search',
  UNKNOWN = 'unknown'
}

// Patterns de détection
const CATEGORY_PATTERNS = {
  [RequestCategory.AUTH]: /login|auth|signin|signup|oauth|sso|password|token|session|jwt/i,
  [RequestCategory.PAYMENT]: /payment|checkout|cart|order|price|amount|billing|invoice|subscription/i,
  [RequestCategory.REFUND]: /refund|cancel|return|chargeback|dispute|reversal/i,
  [RequestCategory.API]: /api|rest|graphql|rpc|webhook|callback/i,
  [RequestCategory.PROFILE]: /user|profile|account|settings|preferences|dashboard/i,
  [RequestCategory.WORKFLOW]: /step|process|flow|wizard|onboarding|validation/i,
  [RequestCategory.ADMIN]: /admin|manage|moderate|control|config|system/i,
  [RequestCategory.SEARCH]: /search|query|filter|find|lookup|autocomplete/i,
};

// Attack vectors par catégorie
const ATTACK_VECTORS_MAP: Record<RequestCategory, string[]> = {
  [RequestCategory.AUTH]: [
    'multi-provider-bypass',
    'token-manipulation',
    'session-hijacking',
    'oauth-redirect',
    'password-reset-bypass',
    'jwt-algorithm-confusion',
    'race-condition-login'
  ],
  [RequestCategory.PAYMENT]: [
    'price-manipulation',
    'negative-amounts',
    'currency-confusion',
    'double-spending',
    'coupon-stacking',
    'race-condition-checkout',
    'payment-method-bypass'
  ],
  [RequestCategory.REFUND]: [
    'negative-refund',
    'double-refund',
    'refund-without-purchase',
    'partial-refund-abuse',
    'timing-attack'
  ],
  [RequestCategory.API]: [
    'rate-limit-bypass',
    'graphql-introspection',
    'batch-query-abuse',
    'parameter-pollution',
    'method-override'
  ],
  [RequestCategory.PROFILE]: [
    'privilege-escalation',
    'data-exposure',
    'account-takeover',
    'profile-pollution'
  ],
  [RequestCategory.WORKFLOW]: [
    'step-bypass',
    'state-manipulation',
    'workflow-reversal',
    'validation-skip'
  ],
  [RequestCategory.ADMIN]: [
    'admin-panel-access',
    'config-exposure',
    'privilege-escalation',
    'command-injection'
  ],
  [RequestCategory.SEARCH]: [
    'sql-injection',
    'nosql-injection',
    'ldap-injection',
    'search-pollution'
  ],
  [RequestCategory.UNKNOWN]: [
    'general-manipulation'
  ]
};

export class RequestParser {
  // Parse une requête complète
  parse(rawRequest: string): ParsedRequest {
    const hash = this.generateHash(rawRequest);
    const lines = rawRequest.split('\n');
    const firstLine = lines[0] || '';

    // Extract method et endpoint
    const [method, fullPath] = firstLine.split(' ');
    const urlParts = this.parseUrl(fullPath);

    // Extract headers
    const headers = this.extractHeaders(lines);
    const domain = headers['host'] || headers['Host'] || '';

    // Extract body
    const bodyStartIndex = lines.findIndex(line => line === '') + 1;
    const bodyText = lines.slice(bodyStartIndex).join('\n');
    const body = this.parseBody(bodyText);

    // Detect category
    const category = this.detectCategory(fullPath, bodyText);

    // Extract critical data based on category
    const criticalData = this.extractCriticalData(category, {
      url: fullPath,
      headers,
      body,
      params: urlParts.params
    });

    // Detect patterns
    const patterns = this.detectPatterns(category, criticalData);

    // Get attack vectors
    const attackVectors = this.getAttackVectors(category, patterns);

    // Calculate compression
    const originalSize = rawRequest.length;
    const compressed = JSON.stringify(criticalData);
    const compressedSize = compressed.length;

    return {
      hash,
      method,
      endpoint: urlParts.path,
      domain,
      params: urlParts.params,
      body: criticalData.body || {},
      headers: this.extractCriticalHeaders(headers),
      patterns,
      category,
      attackVectors,
      originalSize,
      compressedSize,
      compressionRatio: 1 - (compressedSize / originalSize)
    };
  }

  // Génère un hash unique pour la requête
  private generateHash(request: string): string {
    return crypto.createHash('sha256').update(request).digest('hex');
  }

  // Parse l'URL et extrait les paramètres
  private parseUrl(fullPath: string): { path: string; params: Record<string, string> } {
    if (!fullPath) return { path: '/', params: {} };

    const [path, queryString] = fullPath.split('?');
    const params: Record<string, string> = {};

    if (queryString) {
      queryString.split('&').forEach(param => {
        const [key, value] = param.split('=');
        if (key) params[key] = decodeURIComponent(value || '');
      });
    }

    return { path, params };
  }

  // Extrait les headers
  private extractHeaders(lines: string[]): Record<string, string> {
    const headers: Record<string, string> = {};

    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '') break; // Fin des headers

      const colonIndex = lines[i].indexOf(':');
      if (colonIndex > -1) {
        const key = lines[i].substring(0, colonIndex).trim();
        const value = lines[i].substring(colonIndex + 1).trim();
        headers[key] = value;
      }
    }

    return headers;
  }

  // Parse le body (JSON, form-data, etc)
  private parseBody(bodyText: string): any {
    if (!bodyText) return {};

    try {
      // Essaye JSON
      return JSON.parse(bodyText);
    } catch {
      // Essaye form-data
      const formData: Record<string, string> = {};
      bodyText.split('&').forEach(param => {
        const [key, value] = param.split('=');
        if (key) formData[key] = decodeURIComponent(value || '');
      });

      return Object.keys(formData).length > 0 ? formData : { raw: bodyText };
    }
  }

  // Détecte la catégorie de la requête
  private detectCategory(url: string, body: string): RequestCategory {
    const fullText = `${url} ${body}`;

    for (const [category, pattern] of Object.entries(CATEGORY_PATTERNS)) {
      if (pattern.test(fullText)) {
        return category as RequestCategory;
      }
    }

    return RequestCategory.UNKNOWN;
  }

  // Extrait les données critiques selon la catégorie
  private extractCriticalData(
    category: RequestCategory,
    data: any
  ): Record<string, any> {
    const critical: Record<string, any> = {};

    switch (category) {
      case RequestCategory.AUTH:
        critical.email = data.body?.email || data.body?.username || data.params?.email;
        critical.providers = data.body?.providers || data.body?.callbacks?.map((c: any) => c.provider);
        critical.token = data.body?.authId || data.body?.token || data.headers?.Authorization;
        critical.service = data.params?.service || data.params?.client_id;
        break;

      case RequestCategory.PAYMENT:
        critical.amount = data.body?.amount || data.body?.price || data.params?.amount;
        critical.currency = data.body?.currency || data.params?.currency || 'EUR';
        critical.method = data.body?.payment_method || data.params?.method;
        critical.items = data.body?.items || data.body?.cart;
        break;

      case RequestCategory.REFUND:
        critical.amount = data.body?.amount || data.params?.amount;
        critical.orderId = data.body?.order_id || data.params?.order;
        critical.reason = data.body?.reason;
        break;

      case RequestCategory.API:
        critical.endpoint = data.url;
        critical.query = data.body?.query || data.params?.query;
        critical.variables = data.body?.variables;
        break;

      default:
        // Extrait les champs les plus communs
        critical.id = data.body?.id || data.params?.id;
        critical.action = data.body?.action || data.params?.action;
        critical.data = data.body?.data || data.params?.data;
    }

    critical.body = data.body;
    return critical;
  }

  // Détecte les patterns spécifiques
  private detectPatterns(category: RequestCategory, data: any): string[] {
    const patterns: string[] = [];

    // Patterns génériques
    if (data.amount && (data.amount < 0 || data.amount === '0' || data.amount === '-1')) {
      patterns.push('negative-value');
    }

    if (data.providers && Array.isArray(data.providers) && data.providers.length > 1) {
      patterns.push('multi-provider');
    }

    if (data.token && data.token.startsWith('eyJ')) {
      patterns.push('jwt-token');
    }

    // Patterns par catégorie
    switch (category) {
      case RequestCategory.AUTH:
        if (data.providers?.includes('Google') && data.providers?.includes('Apple')) {
          patterns.push('oauth-mixing');
        }
        if (data.service?.includes('Login') && data.service?.includes('Register')) {
          patterns.push('dual-flow');
        }
        break;

      case RequestCategory.PAYMENT:
        if (data.amount === 0 || data.amount === '0.00') {
          patterns.push('zero-amount');
        }
        if (data.items?.some((i: any) => i.quantity < 0)) {
          patterns.push('negative-quantity');
        }
        break;

      case RequestCategory.WORKFLOW:
        if (data.body?.step && data.body?.skip) {
          patterns.push('step-bypass-attempt');
        }
        break;
    }

    return patterns;
  }

  // Extrait headers critiques uniquement
  private extractCriticalHeaders(headers: Record<string, string>): Record<string, string> {
    const critical: Record<string, string> = {};
    const importantHeaders = [
      'Authorization',
      'Cookie',
      'X-CSRF-Token',
      'X-API-Key',
      'Content-Type',
      'Origin',
      'Referer'
    ];

    for (const key of importantHeaders) {
      if (headers[key]) {
        critical[key] = headers[key].substring(0, 100); // Limite la taille
      }
    }

    return critical;
  }

  // Obtient les vecteurs d'attaque possibles
  private getAttackVectors(category: RequestCategory, patterns: string[]): string[] {
    const vectors = [...(ATTACK_VECTORS_MAP[category] || [])];

    // Ajoute vecteurs spécifiques aux patterns
    if (patterns.includes('negative-value')) {
      vectors.push('negative-value-exploitation');
    }
    if (patterns.includes('multi-provider')) {
      vectors.push('provider-confusion-attack');
    }
    if (patterns.includes('jwt-token')) {
      vectors.push('jwt-manipulation');
    }

    return [...new Set(vectors)]; // Retire doublons
  }

  // Compresse pour contexte Claude
  compressForContext(parsed: ParsedRequest): string {
    return `${parsed.method} ${parsed.endpoint}
Domain: ${parsed.domain}
Category: ${parsed.category}
Patterns: ${parsed.patterns.join(', ')}
Critical: ${JSON.stringify(parsed.body).substring(0, 200)}
Vectors: ${parsed.attackVectors.slice(0, 3).join(', ')}`;
  }
}