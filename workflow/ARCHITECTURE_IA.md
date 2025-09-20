# Architecture IA Multi-Projets

## Concept Core
Chaque projet = Une IA isolée avec sa propre mémoire et apprentissage

## Structure Par Projet

### 1. Isolation Complète
```typescript
interface ProjectAI {
  id: string
  domain: string // amazon.com, booking.com
  memory: {
    requests: Request[] // Historique complet
    embeddings: Vector[] // Cache embeddings
    patterns: Pattern[] // Patterns découverts
    exploits: Exploit[] // Succès confirmés
  }
  context: {
    businessModel: string // e-commerce, booking, etc
    specificRules: string[] // Règles métier connues
    customPrompt: string // Prompt adapté au domaine
  }
  cache: {
    L1_exact: Map<hash, response>
    L2_similar: Map<embedding, response[]>
    L3_context: Map<pattern, suggestions>
  }
}
```

### 2. Mémoire Persistante
```sql
-- Extension schema actuel
ALTER TABLE projects ADD COLUMN
  ai_memory JSONB DEFAULT '{}',
  ai_context TEXT,
  cache_stats JSONB DEFAULT '{}',
  total_tokens_used INTEGER DEFAULT 0;

-- Table dédiée pour patterns appris
CREATE TABLE project_patterns (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  pattern_type text, -- price_manipulation, workflow_bypass, etc
  pattern_description text,
  success_rate float,
  example_requests jsonb,
  discovered_at timestamp DEFAULT now()
);

-- Cache de similarité pour économie
CREATE TABLE similarity_cache (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  request_hash text,
  similar_requests uuid[],
  similarity_scores float[],
  cached_analysis text,
  hit_count integer DEFAULT 0,
  created_at timestamp DEFAULT now(),
  UNIQUE(project_id, request_hash)
);
```

### 3. Prompt Business Logic Intégré
```typescript
const BUSINESS_LOGIC_MINDSET = `
MINDSET OBLIGATOIRE:
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
- Double dépense/utilisation
`;

// Contexte enrichi par projet
function buildAIContext(project: Project): string {
  return `
${BUSINESS_LOGIC_MINDSET}

CONTEXTE PROJET: ${project.domain}
================
TYPE DE BUSINESS: ${project.businessModel}

MÉMOIRE DES SUCCÈS:
${project.exploits.map(e => `- ${e.type}: ${e.description}`).join('\n')}

ENDPOINTS MAPPÉS:
${project.endpoints.map(e => `${e.method} ${e.path} - ${e.purpose}`).join('\n')}

PATTERNS CONFIRMÉS:
${project.patterns.map(p => `- ${p.type}: ${p.description} (${p.successRate}% success)`).join('\n')}

ANALYSE MAINTENANT:
`;
}
```

### 4. Système de Cache Intelligent
```typescript
class ProjectAICache {
  async checkCache(request: Request, projectId: string): CacheResult {
    // Niveau 1: Exact match (0 tokens)
    const exactMatch = await this.L1_exact(request.hash);
    if (exactMatch) return { hit: 'L1', response: exactMatch, cost: 0 };

    // Niveau 2: Similarité haute (réutilise analyse)
    const embedding = await this.getOrCreateEmbedding(request);
    const similar = await this.L2_similarity(embedding, threshold=0.95);
    if (similar) return { hit: 'L2', response: similar, cost: 'minimal' };

    // Niveau 3: Context enrichi (économise 50% tokens)
    const context = await this.L3_contextual(embedding, threshold=0.85);
    if (context) return { hit: 'L3', enrichedContext: context, cost: 'reduced' };

    return { hit: 'miss', cost: 'full' };
  }

  async updateCache(request: Request, response: Analysis) {
    // Stocke à tous les niveaux
    await this.storeL1(request.hash, response);
    await this.updateL2(request.embedding, response);
    await this.enrichL3(request.pattern, response);

    // Mise à jour stats
    await this.updateCacheStats(request.projectId);
  }
}
```

### 5. Workflow Boucle d'Apprentissage
```typescript
interface LearningLoop {
  // 1. Claude suggère
  suggestion: {
    action: string // "Essaye POST /checkout avec quantity=-1"
    reasoning: string // "Pattern de validation côté client détecté"
    confidence: number // 0.85
  }

  // 2. User teste
  userFeedback: {
    executed: string // "J'ai fait POST avec -1"
    result: string // "Erreur 400 mais le panier s'est vidé"
    screenshot?: string // Preuve visuelle
  }

  // 3. Claude apprend
  learning: {
    pattern: string // "Validation incomplète sur quantités"
    nextStep: string // "Essayons avec 0.5 ou MAX_INT"
    memoryUpdate: string // Ajout au contexte permanent
  }
}

// Persistance de l'apprentissage
async function persistLearning(projectId: string, loop: LearningLoop) {
  // Ajoute au contexte permanent du projet
  await db.projectPatterns.create({
    projectId,
    type: loop.learning.pattern,
    description: loop.suggestion.action + ' → ' + loop.userFeedback.result,
    successRate: calculateSuccess(loop.userFeedback)
  });

  // Met à jour la mémoire IA
  await updateProjectMemory(projectId, loop.learning.memoryUpdate);
}
```

## Avantages de cette Architecture

### 1. **Isolation Totale**
- Chaque site a son IA dédiée
- Pas de pollution entre projets
- Apprentissage spécifique au domaine

### 2. **Économie Massive**
- Cache L1: 0 tokens (exact match)
- Cache L2: ~10 tokens (similar)
- Cache L3: ~50% tokens (context)
- Réutilisation: 90% des requêtes

### 3. **Apprentissage Continu**
- Patterns persistés par projet
- Succès documentés et réutilisés
- Contexte enrichi à chaque session

### 4. **Scalabilité**
- 1 user = N projets isolés
- Cache par projet = pas d'explosion
- Tokens optimisés = coûts maîtrisés

## Estimation Coûts

### Sans Cache
- 100 requêtes × 2000 tokens = 200k tokens/session
- Coût: ~$2-3 par session

### Avec Cache Intelligent
- 10% nouvelles = 20k tokens
- 90% cachées = ~5k tokens context
- Coût: ~$0.25 par session (90% économie)

## Implémentation Prioritaire

1. **Phase 1**: Isolation mémoire par projet
2. **Phase 2**: Cache L1 (exact match)
3. **Phase 3**: Business logic prompt
4. **Phase 4**: Learning loop persistence
5. **Phase 5**: Cache L2/L3 similarité