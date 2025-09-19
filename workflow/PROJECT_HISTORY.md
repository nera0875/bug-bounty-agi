# Bug Bounty AGI - Project History

## Plan vivant

### Stack technique
- **Frontend**: Next.js 15.5, React 19, TypeScript 5.9
- **Styling**: Tailwind CSS 4.1, shadcn/ui
- **Database**: Supabase (PostgreSQL avec pgvector)
- **AI**: OpenAI (embeddings), Anthropic Claude (analyse)
- **Deployment**: Vercel (frontend), Supabase (backend)

### Architecture MVP [Done]
- ✅ Tables Supabase (projects, requests, sessions)
- ✅ Fonction de recherche vectorielle (match_requests)
- ✅ Page d'accueil avec liste des projets
- ✅ Page projet avec 3 zones (Import, Chat, Résultats)
- ✅ Parser HAR/Burp avec auto-tagging
- ✅ API routes (analyze, feedback)

### Features Core [In Progress]
- ✅ Import requêtes HAR/Burp via textarea
- ✅ Génération embeddings avec OpenAI
- ✅ Analyse Claude avec contexte similaire
- ✅ Boucle de feedback (marche/erreur/partiel)
- ⏳ Export Markdown pour HackerOne
- ⏳ Cache embeddings pour optimisation
- ⏳ Batch suggestions Claude

### Déploiement [Planned]
- 🔲 Configuration variables environnement Vercel
- 🔲 Création repository GitHub
- 🔲 Connexion Vercel avec GitHub
- 🔲 Configuration domaine personnalisé

## Décisions techniques

### Sécurité
- Utilisation de Supabase service key côté serveur uniquement
- Pas de RLS activé pour le MVP (à ajouter en production)
- Variables d'environnement pour toutes les clés API

### Optimisations
- Embeddings en text-embedding-3-small (1536 dimensions)
- Claude Haiku pour réponses rapides et économiques
- Limite de 20 requêtes similaires pour le contexte

## État actuel
Le MVP est fonctionnel localement avec :
- Interface complète avec les 3 zones
- Parser de requêtes fonctionnel
- Intégration Supabase/OpenAI/Claude prête
- Workflow complet : Import → Analyse → Test → Feedback

Prochaines étapes : Déploiement sur Vercel et tests en production.