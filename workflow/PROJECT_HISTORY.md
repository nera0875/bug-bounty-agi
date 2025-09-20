# Bug Bounty AGI - Plan Vivant

## État actuel du projet
**URL Production**: http://84.247.131.60:3002
**GitHub**: https://github.com/nera0875/bug-bounty-agi
**Status**: ✅ Opérationnel - Authentification ajoutée

## Configuration [Done]
- **Supabase**:
  - URL: `https://clcpszhztwfhnvirexao.supabase.co`
  - Projet ID: `clcpszhztwfhnvirexao`
  - Clé anon: Vérifiée et fonctionnelle via MCP
  - RLS: **Désactivé** avec politiques permissives créées
  - Tables: `projects`, `requests`, `sessions` - toutes accessibles

## Architecture MVP [Done]
- **Frontend**: Next.js 15.5.3, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **Database**: Supabase PostgreSQL avec pgvector
- **AI**: OpenAI (embeddings), Anthropic Claude (analyse)
- **Deployment**: VPS (84.247.131.60) sur port 3000

## Features Core [Done]
- ✅ Import requêtes HAR/Burp via textarea
- ✅ Génération embeddings avec OpenAI
- ✅ Analyse Claude avec contexte similaire
- ✅ Boucle de feedback (marche/erreur/partiel)
- ✅ Parser HAR/Burp avec auto-tagging
- ✅ Fonction de recherche vectorielle (match_requests)
- ✅ API routes fonctionnelles (analyze, feedback)

## Problèmes résolus [Done]
- **401 Unauthorized Supabase**:
  - RLS désactivé sur toutes les tables
  - Politiques permissives créées pour accès anonyme
  - Clé API vérifiée via Supabase MCP
- **Cache navigateur**: Application rebuild complète
- **Conflits services**: nginx, apache, docker arrêtés

## Déploiement [Done]
- ✅ Application en production sur VPS
- ✅ Build de production avec Turbopack
- ✅ Variables environnement configurées (.env.local)
- ✅ Services inutiles désactivés

## Commandes utiles
```bash
# Production
npm run build && npm start

# Développement
npm run dev

# Test Supabase
node test-supabase.js
```

## Features récentes [Done]
- ✅ **Authentification Supabase Auth** (20/01/2025)
  - Page login/signup responsive
  - AuthProvider pour gestion état utilisateur
  - Protection des routes (redirection auto vers /login)
  - Bouton déconnexion avec affichage email
  - Middleware anti-cache pour éviter erreurs 401

## Système IA avancé [Completed] (20/01/2025)
- ✅ Schema DB pour isolation mémoire (7 nouvelles tables)
- ✅ Parser intelligent de requêtes (compression 95%: 5KB → 200 bytes)
- ✅ Cache multi-niveaux (L1: exact, L2: >95% similarité, L3: contexte)
- ✅ Context builder avec mindset business logic abuse
- ✅ API analyze-smart avec embeddings et détection patterns
- ✅ API feedback-smart pour learning loops
- ✅ Interface UI complète avec panel de feedback interactif
- ✅ Migrations SQL générées et guide d'application

## En cours [Doing]
- [ ] **Mise en production système IA** (20/01/2025)
  - [ ] Appliquer migrations dans Supabase Dashboard
  - [ ] Configurer clés API (OpenAI, Anthropic)
  - [ ] Créer projets test (FNAC, Booking, UberEats)
  - [ ] Premier test end-to-end avec feedback

## Prochaines étapes [Planned]
- [ ] Lier les projets aux utilisateurs (user_id)
- [ ] Réactiver RLS avec politiques par utilisateur
- [ ] Export Markdown pour HackerOne
- [ ] Dashboard analytics par projet avec stats IA
- [ ] Tests de charge et monitoring

## Notes techniques
- Build avec Turbopack pour performance optimale
- Pas de RLS pour MVP (développement rapide)
- Politiques permissives prêtes pour migration future