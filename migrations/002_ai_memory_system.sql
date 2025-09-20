-- Migration: AI Memory System per Project
-- Date: 2025-01-20
-- Description: Ajoute système de mémoire IA isolée par projet

-- 1. Étendre la table projects avec contexte IA
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS business_type text DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS ai_context text DEFAULT '',
ADD COLUMN IF NOT EXISTS learned_patterns jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS success_exploits jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS total_requests_analyzed integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS tokens_saved integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_analysis timestamp with time zone DEFAULT now();

-- 2. Table pour patterns détectés par projet
CREATE TABLE IF NOT EXISTS request_patterns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  pattern_type text NOT NULL, -- auth, payment, api, workflow, etc
  pattern_name text NOT NULL, -- nom unique du pattern
  pattern_value jsonb NOT NULL, -- données du pattern
  critical_data jsonb, -- données extraites importantes
  attack_vectors text[], -- vecteurs d'attaque possibles
  confidence_score float DEFAULT 0.5, -- confiance dans le pattern
  times_seen integer DEFAULT 1, -- combien de fois vu
  last_seen timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(project_id, pattern_type, pattern_name)
);

-- 3. Table de mémoire IA évolutive
CREATE TABLE IF NOT EXISTS ai_memory (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  memory_type text NOT NULL, -- context, success, failure, suggestion
  memory_key text NOT NULL, -- identifiant unique
  memory_value text NOT NULL, -- contenu de la mémoire
  metadata jsonb DEFAULT '{}'::jsonb, -- données additionnelles
  hit_count integer DEFAULT 0, -- nombre d'utilisations
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(project_id, memory_type, memory_key)
);

-- 4. Cache de similarité pour économie tokens
CREATE TABLE IF NOT EXISTS similarity_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  request_hash text NOT NULL, -- hash de la requête
  request_summary text NOT NULL, -- résumé court de la requête
  embedding vector(1536), -- embedding OpenAI
  similar_requests uuid[], -- IDs de requêtes similaires
  similarity_scores float[], -- scores de similarité
  cached_analysis text, -- analyse Claude cachée
  cache_level integer DEFAULT 1, -- L1=exact, L2=similar, L3=context
  hit_count integer DEFAULT 0,
  tokens_saved integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + interval '30 days'),
  UNIQUE(project_id, request_hash)
);

-- 5. Table de compression de requêtes
CREATE TABLE IF NOT EXISTS compressed_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  request_id uuid REFERENCES requests(id) ON DELETE CASCADE,
  original_size integer NOT NULL, -- taille originale en bytes
  compressed_size integer NOT NULL, -- taille compressée
  compression_ratio float GENERATED ALWAYS AS (1.0 - (compressed_size::float / original_size::float)) STORED,
  extracted_data jsonb NOT NULL, -- données critiques extraites
  patterns_detected text[], -- patterns détectés
  category text, -- auth, payment, api, etc
  created_at timestamp with time zone DEFAULT now()
);

-- 6. Table de learning loops (boucle apprentissage)
CREATE TABLE IF NOT EXISTS learning_loops (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  request_id uuid REFERENCES requests(id),
  suggestion text NOT NULL, -- suggestion de Claude
  reasoning text, -- raisonnement de Claude
  confidence float DEFAULT 0.5,
  user_action text, -- ce que l'user a fait
  result text, -- résultat obtenu
  feedback_type text CHECK (feedback_type IN ('success', 'failure', 'partial', 'other')),
  pattern_learned text, -- pattern découvert
  next_step text, -- prochaine suggestion
  created_at timestamp with time zone DEFAULT now()
);

-- 7. Index pour performance
CREATE INDEX IF NOT EXISTS idx_request_patterns_project ON request_patterns(project_id);
CREATE INDEX IF NOT EXISTS idx_request_patterns_type ON request_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_ai_memory_project ON ai_memory(project_id);
CREATE INDEX IF NOT EXISTS idx_ai_memory_type ON ai_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_similarity_cache_project ON similarity_cache(project_id);
CREATE INDEX IF NOT EXISTS idx_similarity_cache_hash ON similarity_cache(request_hash);
CREATE INDEX IF NOT EXISTS idx_compressed_requests_project ON compressed_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_learning_loops_project ON learning_loops(project_id);

-- Index pour recherche vectorielle sur cache
CREATE INDEX IF NOT EXISTS idx_similarity_cache_embedding ON similarity_cache
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- 8. Fonction pour construire contexte IA
CREATE OR REPLACE FUNCTION build_ai_context(p_project_id uuid)
RETURNS text AS $$
DECLARE
  v_context text;
  v_project record;
  v_patterns text;
  v_exploits text;
  v_recent_tests text;
BEGIN
  -- Récupère info projet
  SELECT * INTO v_project FROM projects WHERE id = p_project_id;

  -- Récupère patterns confirmés
  SELECT string_agg(
    format('- %s: %s (%s fois)', pattern_type, pattern_name, times_seen),
    E'\n'
  ) INTO v_patterns
  FROM request_patterns
  WHERE project_id = p_project_id
    AND confidence_score > 0.7
  ORDER BY times_seen DESC
  LIMIT 20;

  -- Récupère exploits réussis
  SELECT string_agg(
    format('✓ %s', memory_value),
    E'\n'
  ) INTO v_exploits
  FROM ai_memory
  WHERE project_id = p_project_id
    AND memory_type = 'success'
  ORDER BY updated_at DESC
  LIMIT 10;

  -- Récupère tests récents
  SELECT string_agg(
    format('%s → %s', user_action, result),
    E'\n'
  ) INTO v_recent_tests
  FROM learning_loops
  WHERE project_id = p_project_id
  ORDER BY created_at DESC
  LIMIT 5;

  -- Construit contexte complet
  v_context := format(E'PROJET: %s\nTYPE: %s\n\nPATTERNS IDENTIFIÉS:\n%s\n\nEXPLOITS CONFIRMÉS:\n%s\n\nTESTS RÉCENTS:\n%s\n\nCONTEXTE:\n%s',
    v_project.name,
    v_project.business_type,
    COALESCE(v_patterns, 'Aucun pattern détecté'),
    COALESCE(v_exploits, 'Aucun exploit confirmé'),
    COALESCE(v_recent_tests, 'Aucun test récent'),
    COALESCE(v_project.ai_context, '')
  );

  RETURN v_context;
END;
$$ LANGUAGE plpgsql;

-- 9. Fonction pour calculer économie tokens
CREATE OR REPLACE FUNCTION calculate_token_savings(p_project_id uuid)
RETURNS jsonb AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_requests', COUNT(DISTINCT cr.id),
    'total_original_bytes', SUM(cr.original_size),
    'total_compressed_bytes', SUM(cr.compressed_size),
    'bytes_saved', SUM(cr.original_size) - SUM(cr.compressed_size),
    'compression_ratio', AVG(cr.compression_ratio),
    'cache_hits', SUM(sc.hit_count),
    'tokens_saved', SUM(sc.tokens_saved),
    'estimated_cost_saved', ROUND((SUM(sc.tokens_saved)::numeric * 0.00001), 2)
  ) INTO v_result
  FROM compressed_requests cr
  LEFT JOIN similarity_cache sc ON sc.project_id = cr.project_id
  WHERE cr.project_id = p_project_id;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 10. Vue pour dashboard projet
CREATE OR REPLACE VIEW project_ai_stats AS
SELECT
  p.id,
  p.name,
  p.business_type,
  p.total_requests_analyzed,
  p.tokens_saved,
  COUNT(DISTINCT rp.id) as patterns_discovered,
  COUNT(DISTINCT ll.id) as learning_loops_completed,
  AVG(ll.confidence) as avg_confidence,
  MAX(p.last_analysis) as last_active
FROM projects p
LEFT JOIN request_patterns rp ON rp.project_id = p.id
LEFT JOIN learning_loops ll ON ll.project_id = p.id
GROUP BY p.id, p.name, p.business_type, p.total_requests_analyzed, p.tokens_saved;