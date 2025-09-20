# Bug Bounty AGI - Plan Vivant

## État actuel du projet
**URL Production**: http://84.247.131.60:3000
**Status**: ✅ Opérationnel - Problème 401 résolu

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

## Prochaines étapes [Planned]
- [ ] Implémenter authentification utilisateur
- [ ] Sécuriser avec service key Supabase
- [ ] Réactiver RLS avec politiques par utilisateur
- [ ] Export Markdown pour HackerOne
- [ ] Cache embeddings pour optimisation
- [ ] Tests de charge et monitoring

## Notes techniques
- Build avec Turbopack pour performance optimale
- Pas de RLS pour MVP (développement rapide)
- Politiques permissives prêtes pour migration future