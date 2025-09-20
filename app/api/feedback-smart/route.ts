// API Route - Feedback intelligent avec apprentissage
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AIContextBuilder } from '@/lib/ai-context-builder';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      requestId,
      suggestion,
      userAction,
      result,
      feedbackType,
      screenshot,
      patternDiscovered,
      nextSteps
    } = body;

    if (!projectId || !feedbackType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log(`[FEEDBACK] Project ${projectId}: ${feedbackType}`);

    // 1. Enregistre dans learning_loops
    const { data: learningLoop } = await supabase
      .from('learning_loops')
      .insert({
        project_id: projectId,
        request_id: requestId,
        suggestion: suggestion || '',
        user_action: userAction || '',
        result: result || '',
        feedback_type: feedbackType,
        pattern_learned: patternDiscovered,
        next_step: nextSteps,
        confidence: calculateConfidence(feedbackType),
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    // 2. Si succès, met à jour la mémoire IA
    if (feedbackType === 'success') {
      await handleSuccessfulExploit(projectId, {
        userAction,
        result,
        pattern: patternDiscovered,
        learningId: learningLoop?.id
      });
    }

    // 3. Si pattern découvert, l'enregistre
    if (patternDiscovered) {
      await registerNewPattern(projectId, patternDiscovered, feedbackType);
    }

    // 4. Met à jour confiance des patterns existants
    if (requestId) {
      await updatePatternConfidence(projectId, requestId, feedbackType);
    }

    // 5. Construit suggestion pour prochaine étape
    const contextBuilder = new AIContextBuilder(projectId);
    let nextSuggestion = '';

    if (feedbackType === 'success') {
      nextSuggestion = await generateNextSteps(contextBuilder, {
        lastSuccess: `${userAction} → ${result}`,
        pattern: patternDiscovered
      });
    } else if (feedbackType === 'failure') {
      nextSuggestion = await generateAlternatives(contextBuilder, {
        failedAttempt: userAction,
        errorMessage: result
      });
    }

    // 6. Met à jour statistiques projet
    await updateProjectStats(projectId, feedbackType);

    // 7. Nettoie contexte si trop gros
    if (Math.random() < 0.1) { // 10% chance
      await contextBuilder.pruneContext();
    }

    return NextResponse.json({
      success: true,
      learningLoopId: learningLoop?.id,
      nextSuggestion,
      stats: await getProjectLearningStats(projectId)
    });

  } catch (error) {
    console.error('[FEEDBACK] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Gère un exploit réussi
async function handleSuccessfulExploit(
  projectId: string,
  data: any
): Promise<void> {
  // Ajoute à la mémoire de succès
  await supabase
    .from('ai_memory')
    .upsert({
      project_id: projectId,
      memory_type: 'success',
      memory_key: `success_${Date.now()}`,
      memory_value: `${data.userAction} → ${data.result}`,
      metadata: {
        pattern: data.pattern,
        learning_id: data.learningId,
        timestamp: new Date().toISOString()
      },
      hit_count: 0,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'project_id,memory_type,memory_key'
    });

  // Met à jour learned_patterns du projet
  const { data: project } = await supabase
    .from('projects')
    .select('learned_patterns, success_exploits')
    .eq('id', projectId)
    .single();

  if (project) {
    const patterns = project.learned_patterns || [];
    const exploits = project.success_exploits || [];

    if (data.pattern && !patterns.includes(data.pattern)) {
      patterns.push(data.pattern);
    }

    exploits.push({
      action: data.userAction,
      result: data.result,
      date: new Date().toISOString()
    });

    // Garde max 50 exploits
    const recentExploits = exploits.slice(-50);

    await supabase
      .from('projects')
      .update({
        learned_patterns: patterns,
        success_exploits: recentExploits
      })
      .eq('id', projectId);
  }
}

// Enregistre un nouveau pattern
async function registerNewPattern(
  projectId: string,
  patternName: string,
  feedbackType: string
): Promise<void> {
  const confidence = feedbackType === 'success' ? 0.8 :
                    feedbackType === 'partial' ? 0.5 : 0.2;

  await supabase
    .from('request_patterns')
    .upsert({
      project_id: projectId,
      pattern_type: 'discovered',
      pattern_name: patternName,
      pattern_value: {
        discovered_via: feedbackType,
        timestamp: new Date().toISOString()
      },
      confidence_score: confidence,
      times_seen: 1,
      last_seen: new Date().toISOString()
    }, {
      onConflict: 'project_id,pattern_type,pattern_name'
    });
}

// Met à jour confiance des patterns
async function updatePatternConfidence(
  projectId: string,
  requestId: string,
  feedbackType: string
): Promise<void> {
  // Récupère patterns de la requête
  const { data: request } = await supabase
    .from('compressed_requests')
    .select('patterns_detected')
    .eq('id', requestId)
    .single();

  if (!request?.patterns_detected) return;

  for (const pattern of request.patterns_detected) {
    const adjustment = feedbackType === 'success' ? 0.1 :
                       feedbackType === 'failure' ? -0.05 :
                       feedbackType === 'partial' ? 0.05 : 0;

    await supabase.rpc('adjust_pattern_confidence', {
      p_project_id: projectId,
      p_pattern_name: pattern,
      p_adjustment: adjustment
    });
  }
}

// Génère suggestions pour prochaines étapes
async function generateNextSteps(
  contextBuilder: AIContextBuilder,
  data: any
): Promise<string> {
  // Simple heuristique pour suggestions
  const suggestions = [
    `Basé sur le succès "${data.lastSuccess}", essayez de combiner avec un autre paramètre`,
    `Pattern "${data.pattern}" confirmé. Testez avec des valeurs extrêmes (MAX_INT, -1, 0.001)`,
    `Succès validé. Tentez maintenant une race condition sur le même endpoint`,
    `Exploit fonctionnel. Vérifiez si applicable sur d'autres endpoints similaires`
  ];

  return suggestions[Math.floor(Math.random() * suggestions.length)];
}

// Génère alternatives après échec
async function generateAlternatives(
  contextBuilder: AIContextBuilder,
  data: any
): Promise<string> {
  const alternatives = [
    `"${data.failedAttempt}" n'a pas fonctionné. Essayez avec encodage différent (URL, Base64)`,
    `Échec détecté. Tentez de bypasser via un paramètre caché ou header custom`,
    `Erreur: "${data.errorMessage}". Peut-être une validation côté serveur - essayez via l'API directement`,
    `Test échoué. Vérifiez si le workflow peut être contourné via une autre route`
  ];

  return alternatives[Math.floor(Math.random() * alternatives.length)];
}

// Met à jour stats projet
async function updateProjectStats(
  projectId: string,
  feedbackType: string
): Promise<void> {
  const column = feedbackType === 'success' ? 'success_count' :
                 feedbackType === 'failure' ? 'failure_count' :
                 feedbackType === 'partial' ? 'partial_count' : null;

  if (column) {
    await supabase.rpc('increment_project_stat', {
      p_project_id: projectId,
      p_column: column
    });
  }
}

// Récupère stats apprentissage
async function getProjectLearningStats(projectId: string): Promise<any> {
  const { data } = await supabase
    .from('learning_loops')
    .select('feedback_type')
    .eq('project_id', projectId);

  if (!data) return null;

  const stats = {
    total: data.length,
    success: data.filter(l => l.feedback_type === 'success').length,
    failure: data.filter(l => l.feedback_type === 'failure').length,
    partial: data.filter(l => l.feedback_type === 'partial').length,
    successRate: 0
  };

  if (stats.total > 0) {
    stats.successRate = Math.round((stats.success / stats.total) * 100);
  }

  return stats;
}

// Calcule confiance selon feedback
function calculateConfidence(feedbackType: string): number {
  switch (feedbackType) {
    case 'success': return 0.9;
    case 'partial': return 0.5;
    case 'failure': return 0.2;
    default: return 0.3;
  }
}