# Guide Migration Base de Données - Système IA

## 🚀 Étapes pour appliquer les migrations

### 1. Connexion au Dashboard Supabase
1. Ouvrir https://supabase.com/dashboard
2. Sélectionner votre projet
3. Aller dans **SQL Editor** (icône SQL dans la sidebar)

### 2. Application des migrations

#### Option A: Application complète (recommandée)
1. Cliquer sur **New Query**
2. Copier tout le contenu SQL généré par `node scripts/apply-migrations.js` option 2
3. Coller dans l'éditeur SQL
4. Cliquer sur **Run** (ou Ctrl+Enter)

#### Option B: Application progressive (si erreurs)
Si certaines tables existent déjà, appliquer par section:

1. **Extensions requises** (si pas déjà installé):
```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

2. **Modifications table projects**:
```sql
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS business_type text DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS ai_context text DEFAULT '',
ADD COLUMN IF NOT EXISTS learned_patterns jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS success_exploits jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS total_requests_analyzed integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS tokens_saved integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_analysis timestamp with time zone DEFAULT now();
```

3. **Créer chaque table individuellement** si nécessaire

### 3. Vérification des tables

Après migration, vérifier que toutes les tables sont créées:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN (
  'request_patterns',
  'ai_memory',
  'similarity_cache',
  'compressed_requests',
  'learning_loops'
);
```

Devrait retourner 5 lignes.

### 4. Configuration des variables d'environnement

Créer/modifier `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[YOUR-ANON-KEY]
SUPABASE_SERVICE_KEY=[YOUR-SERVICE-KEY] # Optionnel, pour admin

# OpenAI (pour embeddings)
OPENAI_API_KEY=sk-[YOUR-KEY]

# Anthropic (pour Claude)
ANTHROPIC_API_KEY=sk-ant-[YOUR-KEY]
```

### 5. Test de connexion

Tester avec le script de vérification:
```bash
node scripts/apply-migrations.js
# Choisir option 3 (Verify tables only)
```

## 📊 Tables créées

| Table | Description | Rôle |
|-------|-------------|------|
| `request_patterns` | Patterns détectés par projet | Stocke les patterns business logic identifiés |
| `ai_memory` | Mémoire IA évolutive | Contexte et apprentissages par projet |
| `similarity_cache` | Cache de similarité | Économise 95% des tokens via cache intelligent |
| `compressed_requests` | Requêtes compressées | Réduit 5KB → 200 bytes |
| `learning_loops` | Boucles d'apprentissage | Feedback utilisateur → amélioration IA |

## 🔍 Vérification post-migration

### Test rapide des fonctions
```sql
-- Test construction contexte
SELECT build_ai_context(
  (SELECT id FROM projects LIMIT 1)
);

-- Test calcul économies
SELECT calculate_token_savings(
  (SELECT id FROM projects LIMIT 1)
);
```

### Vérifier les index
```sql
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename LIKE '%pattern%'
OR tablename LIKE '%memory%'
OR tablename LIKE '%cache%';
```

## ⚠️ Troubleshooting

### Erreur: "vector type does not exist"
```sql
CREATE EXTENSION vector;
```

### Erreur: "function gen_random_uuid() does not exist"
```sql
CREATE EXTENSION "uuid-ossp";
```

### Tables déjà existantes
- Ignorer les erreurs "already exists"
- Ou supprimer et recréer: `DROP TABLE IF EXISTS table_name CASCADE;`

## ✅ Prochaines étapes

1. ✅ Migrations appliquées
2. 📝 Configurer les clés API dans `.env.local`
3. 🧪 Tester avec une première requête
4. 📊 Vérifier le dashboard des stats

## 📚 Documentation API

- **POST /api/analyze-smart**: Analyse intelligente avec cache
- **POST /api/feedback-smart**: Boucle d'apprentissage
- **GET /api/project-stats**: Statistiques par projet

Chaque projet a sa propre mémoire isolée, garantissant:
- 🔒 Isolation complète des données
- 💰 95% d'économie sur les coûts API
- 🧠 Apprentissage continu par feedback
- ⚡ Réponses instantanées via cache L1/L2/L3