// API Route - Analyse intelligente avec contexte IA et cache
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { RequestParser } from '@/lib/request-parser';
import { AICache } from '@/lib/ai-cache';
import { AIContextBuilder } from '@/lib/ai-context-builder';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// Init clients
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { projectId, rawRequest, useCache = true, forceNewAnalysis = false } = body;

    if (!projectId || !rawRequest) {
      return NextResponse.json(
        { error: 'Missing projectId or rawRequest' },
        { status: 400 }
      );
    }

    console.log(`[ANALYZE-SMART] Starting for project ${projectId}`);

    // 1. Parse la requête pour extraire l'essentiel
    const parser = new RequestParser();
    const parsedRequest = parser.parse(rawRequest);

    console.log(`[PARSE] Category: ${parsedRequest.category}, Patterns: ${parsedRequest.patterns.join(', ')}`);
    console.log(`[COMPRESSION] ${parsedRequest.originalSize} bytes → ${parsedRequest.compressedSize} bytes (${(parsedRequest.compressionRatio * 100).toFixed(0)}% saved)`);

    // 2. Vérifie le cache si activé
    const cache = new AICache(projectId);
    let cachedResult = null;

    if (useCache && !forceNewAnalysis) {
      cachedResult = await cache.checkCache(parsedRequest);

      if (cachedResult.hit !== 'miss') {
        console.log(`[CACHE] Hit ${cachedResult.hit}! Cost: ${cachedResult.cost}`);

        if (cachedResult.response) {
          // Cache L1 ou L2 : réponse complète disponible
          return NextResponse.json({
            analysis: cachedResult.response,
            cacheHit: cachedResult.hit,
            confidence: cachedResult.confidence,
            tokensSaved: calculateTokensSaved(parsedRequest.originalSize),
            patterns: parsedRequest.patterns,
            category: parsedRequest.category
          });
        }
      }
    }

    // 3. Stocke la requête compressée
    const { data: storedRequest } = await supabase
      .from('compressed_requests')
      .insert({
        project_id: projectId,
        original_size: parsedRequest.originalSize,
        compressed_size: parsedRequest.compressedSize,
        extracted_data: parsedRequest.body,
        patterns_detected: parsedRequest.patterns,
        category: parsedRequest.category
      })
      .select()
      .single();

    // 4. Génère embedding si nécessaire
    let embedding: number[] | null = null;

    if (cachedResult?.hit === 'miss' || forceNewAnalysis) {
      const embeddingText = parser.compressForContext(parsedRequest);

      try {
        const embeddingResponse = await openai.embeddings.create({
          model: 'text-embedding-3-small',
          input: embeddingText,
        });

        embedding = embeddingResponse.data[0].embedding;
        console.log('[EMBEDDING] Generated new embedding');
      } catch (error) {
        console.error('[EMBEDDING] Error:', error);
        // Continue sans embedding
      }
    }

    // 5. Construit le contexte enrichi pour Claude
    const contextBuilder = new AIContextBuilder(projectId);
    const context = await contextBuilder.buildContext(
      parsedRequest,
      cachedResult?.hit !== 'L3' // Inclut historique complet sauf si L3
    );

    console.log(`[CONTEXT] Built context: ${context.tokenEstimate} tokens estimated`);

    // 6. Recherche requêtes similaires pour enrichir
    let similarRequests = [];
    if (embedding) {
      const { data: similar } = await supabase
        .rpc('match_requests', {
          query_embedding: embedding,
          similarity_threshold: 0.8,
          match_count: 5,
          project_id: projectId
        });

      if (similar && similar.length > 0) {
        similarRequests = similar;
        console.log(`[SIMILAR] Found ${similar.length} similar requests`);
      }
    }

    // 7. Prépare le contexte final avec similarité
    let finalContext = context.fullContext;

    if (similarRequests.length > 0) {
      const similarContext = similarRequests
        .map((r: any) => `- ${r.method} ${r.url}: ${r.tags?.join(', ') || 'no tags'}`)
        .join('\n');

      finalContext += `\n\nREQUÊTES SIMILAIRES ANALYSÉES:\n${similarContext}`;
    }

    // 8. Appelle Claude avec le contexte optimisé
    console.log('[CLAUDE] Calling with optimized context...');

    const claudeResponse = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: finalContext
        }
      ],
      system: "Tu es un expert en bug bounty spécialisé dans le business logic abuse. Réponds de manière concise et actionnable."
    });

    const analysis = claudeResponse.content[0].type === 'text'
      ? claudeResponse.content[0].text
      : 'Analyse non disponible';

    // 9. Stocke dans le cache pour réutilisation
    if (embedding) {
      await cache.storeInCache(parsedRequest, analysis, embedding);
    }

    // 10. Met à jour les patterns détectés
    for (const pattern of parsedRequest.patterns) {
      await supabase
        .from('request_patterns')
        .upsert({
          project_id: projectId,
          pattern_type: parsedRequest.category,
          pattern_name: pattern,
          pattern_value: {
            endpoint: parsedRequest.endpoint,
            data: parsedRequest.body
          },
          critical_data: parsedRequest.body,
          attack_vectors: parsedRequest.attackVectors,
          confidence_score: 0.5, // Initial
          times_seen: 1
        }, {
          onConflict: 'project_id,pattern_type,pattern_name',
          ignoreDuplicates: false
        });
    }

    // 11. Met à jour stats projet
    await supabase
      .from('projects')
      .update({
        total_requests_analyzed: supabase.raw('total_requests_analyzed + 1'),
        last_analysis: new Date().toISOString()
      })
      .eq('id', projectId);

    // 12. Retourne l'analyse avec métadonnées
    return NextResponse.json({
      analysis,
      requestId: storedRequest?.id,
      cacheHit: cachedResult?.hit || 'miss',
      patterns: parsedRequest.patterns,
      category: parsedRequest.category,
      attackVectors: parsedRequest.attackVectors,
      compression: {
        original: parsedRequest.originalSize,
        compressed: parsedRequest.compressedSize,
        ratio: `${(parsedRequest.compressionRatio * 100).toFixed(0)}%`
      },
      similarRequests: similarRequests.length,
      tokensSaved: cachedResult?.hit !== 'miss' ? calculateTokensSaved(parsedRequest.originalSize) : 0
    });

  } catch (error) {
    console.error('[ANALYZE-SMART] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Calcule les tokens économisés
function calculateTokensSaved(originalSize: number): number {
  // Estimation : 1 token = 4 caractères
  return Math.floor(originalSize / 4 * 0.9); // 90% économisé avec compression
}