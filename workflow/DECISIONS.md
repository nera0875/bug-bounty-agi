# Bug Bounty AGI - Décisions Techniques

## Stack technique

### Frontend
- **Framework**: Next.js 15.5.3 (App Router)
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: React Context (AuthProvider)
- **Build**: Turbopack

### Backend
- **Database**: Supabase PostgreSQL
- **Vector DB**: pgvector extension
- **Auth**: Supabase Auth (email/password)
- **API**: Next.js Route Handlers

### AI/ML
- **Embeddings**: OpenAI text-embedding-3-small
- **Analyse**: Anthropic Claude 3
- **Similarité**: Cosine distance pgvector

### Infrastructure
- **Hosting**: VPS 84.247.131.60
- **Port**: 3002 (production)
- **Process**: PM2 ou npm start direct
- **Git**: GitHub (nera0875/bug-bounty-agi)

## Décisions clés

### Sécurité
1. **RLS temporairement désactivé** pour MVP
   - Raison: Développement rapide
   - Plan: Réactiver avec politiques user après auth

2. **Variables environnement**
   - Jamais de secrets hardcodés
   - .env.local pour config locale
   - .env.example pour template

3. **Authentification obligatoire**
   - Toutes les routes protégées sauf /login
   - Redirection automatique si non connecté
   - Session Supabase côté client

### Architecture
1. **Monolithique pour MVP**
   - Frontend et API dans même Next.js
   - Plus simple à déployer et maintenir
   - Migration microservices possible plus tard

2. **Client Components par défaut**
   - 'use client' sur toutes les pages
   - Interactions riches nécessaires
   - SSR non critique pour MVP

3. **Pas de cache navigateur**
   - Headers no-store sur toutes les routes
   - Évite problèmes de synchronisation
   - Performance secondaire vs fiabilité

### Base de données
1. **Tables sans contraintes FK**
   - projects, requests, sessions indépendantes
   - Flexibilité maximale pour MVP
   - Intégrité gérée côté application

2. **Embeddings 1536 dimensions**
   - Standard OpenAI text-embedding-3-small
   - Balance performance/coût optimale
   - Compatible pgvector natif

3. **Politiques permissives prêtes**
   - Créées mais non actives (RLS off)
   - Migration facile quand nécessaire
   - Format: allow_[table]_[action]_anon

## Conventions

### Code
- **Naming**: camelCase (JS), PascalCase (components)
- **Imports**: Absolute paths avec @/
- **Async**: async/await partout (pas de .then)
- **Erreurs**: try/catch avec logs console

### Git
- **Branches**: direct sur main pour MVP
- **Commits**: feat/fix/docs conventionnels
- **Push**: Après chaque feature complète

### Déploiement
- **Build**: npm run build (Turbopack)
- **Start**: PORT=3002 HOSTNAME=0.0.0.0 npm start
- **Env**: .env.local avec vraies clés
- **Test**: Vérifier sur production direct

## Justifications

### Pourquoi Supabase?
- PostgreSQL managé + Auth intégré
- pgvector pour recherche sémantique
- SDK JavaScript excellent
- Gratuit pour MVP

### Pourquoi Next.js 15?
- App Router moderne et performant
- API Routes intégrées
- TypeScript natif
- Déploiement simple

### Pourquoi pas de tests?
- MVP rapide, itération prioritaire
- Validation manuelle suffisante
- Tests ajoutés post-validation marché

## À reconsidérer
- RLS quand >10 utilisateurs
- Cache Redis si >1000 req/jour
- CDN si latence internationale
- Tests si équipe >2 devs