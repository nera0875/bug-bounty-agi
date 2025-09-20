// AI Cache System - Économie de tokens avec cache multi-niveaux
import { createClient } from '@supabase/supabase-js';
import { ParsedRequest } from './request-parser';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface CacheResult {
  hit: 'L1' | 'L2' | 'L3' | 'miss';
  response?: string;
  enrichedContext?: string;
  cost: number | 'minimal' | 'reduced' | 'full';
  confidence?: number;
}

export class AICache {
  private projectId: string;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  // Vérifie le cache multi-niveaux
  async checkCache(request: ParsedRequest): Promise<CacheResult> {
    // Niveau 1: Cache exact (hash match)
    const l1Result = await this.checkL1Cache(request.hash);
    if (l1Result) {
      await this.incrementHitCount('L1', request.hash);
      return {
        hit: 'L1',
        response: l1Result.cached_analysis,
        cost: 0,
        confidence: 1.0
      };
    }

    // Niveau 2: Similarité haute (>95%)
    const l2Result = await this.checkL2Cache(request);
    if (l2Result && l2Result.similarity > 0.95) {
      await this.incrementHitCount('L2', l2Result.hash);
      return {
        hit: 'L2',
        response: l2Result.cached_analysis,
        cost: 'minimal',
        confidence: l2Result.similarity
      };
    }

    // Niveau 3: Contexte enrichi (>85%)
    const l3Result = await this.checkL3Cache(request);
    if (l3Result && l3Result.patterns.length > 0) {
      return {
        hit: 'L3',
        enrichedContext: l3Result.context,
        cost: 'reduced',
        confidence: 0.85
      };
    }

    return {
      hit: 'miss',
      cost: 'full'
    };
  }

  // Cache L1: Exact match par hash
  private async checkL1Cache(hash: string): Promise<any | null> {
    const { data, error } = await supabase
      .from('similarity_cache')
      .select('cached_analysis, hit_count')
      .eq('project_id', this.projectId)
      .eq('request_hash', hash)
      .eq('cache_level', 1)
      .single();

    if (error || !data) return null;
    return data;
  }

  // Cache L2: Similarité haute
  private async checkL2Cache(request: ParsedRequest): Promise<any | null> {
    // Recherche requêtes similaires via embedding
    const embedding = await this.getOrCreateEmbedding(request);

    const { data, error } = await supabase
      .rpc('match_cached_requests', {
        project_id: this.projectId,
        query_embedding: embedding,
        similarity_threshold: 0.95,
        match_count: 1
      });

    if (error || !data || data.length === 0) return null;

    return {
      hash: data[0].request_hash,
      cached_analysis: data[0].cached_analysis,
      similarity: data[0].similarity
    };
  }

  // Cache L3: Contexte enrichi avec patterns similaires
  private async checkL3Cache(request: ParsedRequest): Promise<any | null> {
    // Cherche patterns similaires
    const { data: patterns, error } = await supabase
      .from('request_patterns')
      .select('*')
      .eq('project_id', this.projectId)
      .eq('pattern_type', request.category)
      .in('pattern_name', request.patterns)
      .limit(10);

    if (error || !patterns || patterns.length === 0) return null;

    // Construit contexte enrichi
    const context = this.buildEnrichedContext(patterns, request);

    return {
      patterns,
      context
    };
  }

  // Stocke résultat dans le cache
  async storeInCache(
    request: ParsedRequest,
    analysis: string,
    embedding?: number[]
  ): Promise<void> {
    // Stocke en L1 (exact)
    await this.storeL1Cache(request, analysis, embedding);

    // Met à jour patterns
    await this.updatePatterns(request);

    // Met à jour statistiques projet
    await this.updateProjectStats(request);
  }

  // Stocke en cache L1
  private async storeL1Cache(
    request: ParsedRequest,
    analysis: string,
    embedding?: number[]
  ): Promise<void> {
    const { error } = await supabase
      .from('similarity_cache')
      .upsert({
        project_id: this.projectId,
        request_hash: request.hash,
        request_summary: `${request.method} ${request.endpoint}`,
        embedding: embedding || null,
        cached_analysis: analysis,
        cache_level: 1,
        hit_count: 0,
        tokens_saved: Math.floor(request.originalSize * 0.001), // Estimation
        created_at: new Date().toISOString()
      }, {
        onConflict: 'project_id,request_hash'
      });

    if (error) {
      console.error('Error storing L1 cache:', error);
    }
  }

  // Met à jour les patterns détectés
  private async updatePatterns(request: ParsedRequest): Promise<void> {
    for (const pattern of request.patterns) {
      const { error } = await supabase
        .from('request_patterns')
        .upsert({
          project_id: this.projectId,
          pattern_type: request.category,
          pattern_name: pattern,
          pattern_value: {
            endpoint: request.endpoint,
            method: request.method,
            data: request.body
          },
          critical_data: request.body,
          attack_vectors: request.attackVectors,
          times_seen: 1,
          last_seen: new Date().toISOString()
        }, {
          onConflict: 'project_id,pattern_type,pattern_name',
          ignoreDuplicates: false
        });

      if (!error) {
        // Incrémente le compteur si pattern existe déjà
        await supabase.rpc('increment_pattern_count', {
          p_project_id: this.projectId,
          p_pattern_type: request.category,
          p_pattern_name: pattern
        });
      }
    }
  }

  // Met à jour stats projet
  private async updateProjectStats(request: ParsedRequest): Promise<void> {
    const tokensSaved = Math.floor((request.originalSize - request.compressedSize) * 0.001);

    const { error } = await supabase
      .from('projects')
      .update({
        total_requests_analyzed: supabase.sql`total_requests_analyzed + 1`,
        tokens_saved: supabase.sql`tokens_saved + ${tokensSaved}`,
        last_analysis: new Date().toISOString()
      })
      .eq('id', this.projectId);

    if (error) {
      console.error('Error updating project stats:', error);
    }
  }

  // Incrémente compteur de hits
  private async incrementHitCount(level: string, hash: string): Promise<void> {
    const { error } = await supabase
      .from('similarity_cache')
      .update({
        hit_count: supabase.sql`hit_count + 1`,
        tokens_saved: supabase.sql`tokens_saved + 100` // Estimation
      })
      .eq('project_id', this.projectId)
      .eq('request_hash', hash);

    if (error) {
      console.error('Error incrementing hit count:', error);
    }
  }

  // Génère ou récupère embedding
  private async getOrCreateEmbedding(request: ParsedRequest): Promise<number[]> {
    // Vérifie si embedding existe déjà
    const { data: existing } = await supabase
      .from('requests')
      .select('embedding')
      .eq('project_id', this.projectId)
      .eq('url', request.endpoint)
      .eq('method', request.method)
      .limit(1)
      .single();

    if (existing?.embedding) {
      return existing.embedding;
    }

    // Génère nouveau embedding (simulé pour l'instant)
    // TODO: Appeler OpenAI API
    return Array(1536).fill(0).map(() => Math.random());
  }

  // Construit contexte enrichi avec patterns
  private buildEnrichedContext(patterns: any[], request: ParsedRequest): string {
    const patternSummary = patterns.map(p =>
      `- ${p.pattern_name}: vu ${p.times_seen} fois, confiance ${(p.confidence_score * 100).toFixed(0)}%`
    ).join('\n');

    const vectorSummary = [...new Set(patterns.flatMap(p => p.attack_vectors || []))]
      .slice(0, 5)
      .join(', ');

    return `CONTEXTE ENRICHI:
Catégorie: ${request.category}
Endpoint: ${request.method} ${request.endpoint}

PATTERNS SIMILAIRES CONNUS:
${patternSummary}

VECTEURS D'ATTAQUE POSSIBLES:
${vectorSummary}

DONNÉES CRITIQUES:
${JSON.stringify(request.body).substring(0, 200)}
`;
  }

  // Nettoie le cache expiré
  async cleanupExpiredCache(): Promise<void> {
    const { error } = await supabase
      .from('similarity_cache')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error cleaning cache:', error);
    }
  }

  // Obtient statistiques du cache
  async getCacheStats(): Promise<any> {
    const { data } = await supabase
      .from('similarity_cache')
      .select('cache_level, hit_count, tokens_saved')
      .eq('project_id', this.projectId);

    if (!data) return null;

    const stats = {
      L1: { hits: 0, tokensSaved: 0 },
      L2: { hits: 0, tokensSaved: 0 },
      L3: { hits: 0, tokensSaved: 0 },
      total: { hits: 0, tokensSaved: 0, costSaved: 0 }
    };

    data.forEach(item => {
      const level = `L${item.cache_level}` as 'L1' | 'L2' | 'L3';
      stats[level].hits += item.hit_count;
      stats[level].tokensSaved += item.tokens_saved;
      stats.total.hits += item.hit_count;
      stats.total.tokensSaved += item.tokens_saved;
    });

    // Estimation coût (OpenAI pricing)
    stats.total.costSaved = stats.total.tokensSaved * 0.00001;

    return stats;
  }
}