// AI Context Builder - Construction du contexte optimisé pour Claude
import { createClient } from '@supabase/supabase-js';
import { ParsedRequest } from './request-parser';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Prompt Business Logic spécialisé
const BUSINESS_LOGIC_MINDSET = `MINDSET OBLIGATOIRE:
- Pense comme un fraudeur, pas un développeur
- Cherche ce qui est "légalement permis mais non souhaité"
- Ignore les bugs techniques classiques (XSS, SQLi)
- Focus sur l'abus de fonctionnalités légitimes

ANALYSE SYSTÉMATIQUE:
1. Comprendre le modèle économique de l'app
2. Identifier tous les flux monétaires/points de valeur
3. Mapper les rôles utilisateurs et leurs privilèges
4. Repérer les workflows multi-étapes

QUESTIONS À TOUJOURS POSER:
- Peut-on bypasser des étapes?
- Que se passe-t-il avec des valeurs négatives/extrêmes?
- Peut-on combiner plusieurs features pour un résultat imprévu?
- Les conditions de course sont-elles possibles?
- Y a-t-il des limites côté client uniquement?

TESTS PRIORITAIRES:
- Manipulation de prix/quantités
- Contournement de restrictions temporelles
- Abus de codes promo/réductions
- Élévation de privilèges par workflow
- Double dépense/utilisation`;

export interface ProjectContext {
  id: string;
  name: string;
  domain: string;
  businessType: string;
  aiContext: string;
  learnedPatterns: any[];
  successExploits: any[];
  recentTests: any[];
}

export interface BuiltContext {
  systemPrompt: string;
  projectMemory: string;
  requestContext: string;
  fullContext: string;
  tokenEstimate: number;
}

export class AIContextBuilder {
  private projectId: string;
  private projectContext?: ProjectContext;

  constructor(projectId: string) {
    this.projectId = projectId;
  }

  // Charge le contexte du projet
  async loadProjectContext(): Promise<ProjectContext> {
    // Récupère info projet
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', this.projectId)
      .single();

    if (!project) throw new Error('Project not found');

    // Récupère patterns confirmés (top 20)
    const { data: patterns } = await supabase
      .from('request_patterns')
      .select('*')
      .eq('project_id', this.projectId)
      .gt('confidence_score', 0.7)
      .order('times_seen', { ascending: false })
      .limit(20);

    // Récupère exploits réussis (top 10)
    const { data: exploits } = await supabase
      .from('ai_memory')
      .select('*')
      .eq('project_id', this.projectId)
      .eq('memory_type', 'success')
      .order('updated_at', { ascending: false })
      .limit(10);

    // Récupère tests récents (top 5)
    const { data: recentTests } = await supabase
      .from('learning_loops')
      .select('*')
      .eq('project_id', this.projectId)
      .order('created_at', { ascending: false })
      .limit(5);

    this.projectContext = {
      id: project.id,
      name: project.name,
      domain: project.url || '',
      businessType: project.business_type || 'unknown',
      aiContext: project.ai_context || '',
      learnedPatterns: patterns || [],
      successExploits: exploits || [],
      recentTests: recentTests || []
    };

    return this.projectContext;
  }

  // Construit le contexte complet pour Claude
  async buildContext(request: ParsedRequest, includeHistory: boolean = true): Promise<BuiltContext> {
    if (!this.projectContext) {
      await this.loadProjectContext();
    }

    const systemPrompt = this.buildSystemPrompt();
    const projectMemory = this.buildProjectMemory();
    const requestContext = this.buildRequestContext(request);

    let fullContext = '';

    if (includeHistory) {
      fullContext = `${systemPrompt}

${projectMemory}

${requestContext}

ANALYSE MAINTENANT:
Basé sur cette requête et l'historique du projet, suggère des tests de business logic abuse spécifiques.
Focus sur les manipulations légales mais non souhaitées.
Propose 3 tests concrets avec les valeurs exactes à tester.`;
    } else {
      // Version courte sans historique (pour économie tokens)
      fullContext = `${systemPrompt}

PROJET: ${this.projectContext!.domain} (${this.projectContext!.businessType})

${requestContext}

SUGGÈRE 3 TESTS:`;
    }

    return {
      systemPrompt,
      projectMemory,
      requestContext,
      fullContext,
      tokenEstimate: this.estimateTokens(fullContext)
    };
  }

  // Construit le prompt système
  private buildSystemPrompt(): string {
    return BUSINESS_LOGIC_MINDSET;
  }

  // Construit la mémoire du projet
  private buildProjectMemory(): string {
    if (!this.projectContext) return '';

    const patterns = this.formatPatterns();
    const exploits = this.formatExploits();
    const tests = this.formatRecentTests();

    return `CONTEXTE PROJET: ${this.projectContext.domain}
TYPE DE BUSINESS: ${this.projectContext.businessType}

MÉMOIRE DES PATTERNS IDENTIFIÉS:
${patterns}

EXPLOITS CONFIRMÉS (ce qui a marché):
${exploits}

TESTS RÉCENTS (historique):
${tests}

NOTES SPÉCIFIQUES:
${this.projectContext.aiContext || 'Aucune note spécifique'}`;
  }

  // Construit le contexte de la requête
  private buildRequestContext(request: ParsedRequest): string {
    const criticalData = this.extractMostCritical(request);

    return `REQUÊTE ACTUELLE:
Endpoint: ${request.method} ${request.endpoint}
Domaine: ${request.domain}
Catégorie: ${request.category}

DONNÉES CRITIQUES:
${criticalData}

PATTERNS DÉTECTÉS:
${request.patterns.join(', ') || 'Aucun'}

VECTEURS D'ATTAQUE POSSIBLES:
${request.attackVectors.slice(0, 5).join(', ')}`;
  }

  // Formate les patterns pour le contexte
  private formatPatterns(): string {
    if (!this.projectContext?.learnedPatterns?.length) {
      return 'Aucun pattern confirmé pour ce projet';
    }

    return this.projectContext.learnedPatterns
      .map(p => `- ${p.pattern_type}/${p.pattern_name}: vu ${p.times_seen}x, confiance ${(p.confidence_score * 100).toFixed(0)}%`)
      .join('\n');
  }

  // Formate les exploits réussis
  private formatExploits(): string {
    if (!this.projectContext?.successExploits?.length) {
      return 'Aucun exploit confirmé encore';
    }

    return this.projectContext.successExploits
      .map(e => `✓ ${e.memory_value}`)
      .join('\n');
  }

  // Formate les tests récents
  private formatRecentTests(): string {
    if (!this.projectContext?.recentTests?.length) {
      return 'Aucun test récent';
    }

    return this.projectContext.recentTests
      .map(t => `${t.user_action} → ${t.result} (${t.feedback_type})`)
      .join('\n');
  }

  // Extrait les données les plus critiques
  private extractMostCritical(request: ParsedRequest): string {
    const critical: any = {};

    // Sélectionne les champs les plus importants selon la catégorie
    switch (request.category) {
      case 'auth':
        critical.authentication = {
          email: request.body.email,
          providers: request.body.providers,
          token_present: !!request.body.token
        };
        break;

      case 'payment':
        critical.payment = {
          amount: request.body.amount,
          currency: request.body.currency,
          items: request.body.items?.length || 0
        };
        break;

      case 'api':
        critical.api = {
          endpoint: request.endpoint,
          has_query: !!request.body.query,
          params_count: Object.keys(request.params).length
        };
        break;

      default:
        critical.general = {
          has_id: !!request.body.id,
          body_size: JSON.stringify(request.body).length,
          params: Object.keys(request.params).slice(0, 5)
        };
    }

    return JSON.stringify(critical, null, 2).substring(0, 500);
  }

  // Estime le nombre de tokens
  private estimateTokens(text: string): number {
    // Estimation approximative: 1 token ≈ 4 caractères
    return Math.ceil(text.length / 4);
  }

  // Met à jour la mémoire après un test
  async updateMemory(
    testResult: {
      suggestion: string;
      userAction: string;
      result: string;
      feedbackType: 'success' | 'failure' | 'partial' | 'other';
      patternLearned?: string;
    }
  ): Promise<void> {
    // Enregistre dans learning_loops
    await supabase
      .from('learning_loops')
      .insert({
        project_id: this.projectId,
        suggestion: testResult.suggestion,
        user_action: testResult.userAction,
        result: testResult.result,
        feedback_type: testResult.feedbackType,
        pattern_learned: testResult.patternLearned,
        created_at: new Date().toISOString()
      });

    // Si succès, ajoute à la mémoire
    if (testResult.feedbackType === 'success') {
      await supabase
        .from('ai_memory')
        .upsert({
          project_id: this.projectId,
          memory_type: 'success',
          memory_key: `exploit_${Date.now()}`,
          memory_value: `${testResult.userAction} → ${testResult.result}`,
          metadata: { pattern: testResult.patternLearned },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'project_id,memory_type,memory_key'
        });

      // Met à jour le contexte du projet
      await this.updateProjectContext(testResult);
    }
  }

  // Met à jour le contexte AI du projet
  private async updateProjectContext(testResult: any): Promise<void> {
    const { data: project } = await supabase
      .from('projects')
      .select('ai_context, learned_patterns')
      .eq('id', this.projectId)
      .single();

    if (!project) return;

    const currentContext = project.ai_context || '';
    const currentPatterns = project.learned_patterns || [];

    // Ajoute le nouveau pattern si découvert
    if (testResult.patternLearned && !currentPatterns.includes(testResult.patternLearned)) {
      currentPatterns.push(testResult.patternLearned);
    }

    // Met à jour le contexte avec le nouveau succès
    const newContext = `${currentContext}\n✓ ${new Date().toISOString().split('T')[0]}: ${testResult.userAction} → ${testResult.result}`.trim();

    await supabase
      .from('projects')
      .update({
        ai_context: newContext.substring(0, 5000), // Limite à 5000 chars
        learned_patterns: currentPatterns
      })
      .eq('id', this.projectId);
  }

  // Nettoie le contexte (garde que les plus récents/pertinents)
  async pruneContext(): Promise<void> {
    // Garde seulement les 50 patterns les plus utilisés
    const { data: patterns } = await supabase
      .from('request_patterns')
      .select('id')
      .eq('project_id', this.projectId)
      .order('times_seen', { ascending: false })
      .range(50, 1000);

    if (patterns && patterns.length > 0) {
      const idsToDelete = patterns.map(p => p.id);
      await supabase
        .from('request_patterns')
        .delete()
        .in('id', idsToDelete);
    }

    // Garde seulement les 20 derniers succès
    const { data: oldMemory } = await supabase
      .from('ai_memory')
      .select('id')
      .eq('project_id', this.projectId)
      .eq('memory_type', 'success')
      .order('updated_at', { ascending: false })
      .range(20, 1000);

    if (oldMemory && oldMemory.length > 0) {
      const idsToDelete = oldMemory.map(m => m.id);
      await supabase
        .from('ai_memory')
        .delete()
        .in('id', idsToDelete);
    }
  }
}