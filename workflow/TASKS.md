# Bug Bounty AGI - Backlog de Tâches

## En cours [Doing]

Aucune tâche en cours actuellement.

## À faire [Planned]

### Sécurité et permissions
- [ ] Lier les projets aux utilisateurs (user_id dans table projects)
- [ ] Réactiver RLS avec politiques par utilisateur
- [ ] Ajouter validation des données côté serveur

### Fonctionnalités core
- [ ] Export Markdown pour HackerOne/Bugcrowd
- [ ] Cache embeddings pour optimisation performances
- [ ] Support multi-formats d'import (JSON, XML)
- [ ] Template de payloads personnalisables

### Analytics et monitoring
- [ ] Dashboard analytics par utilisateur
- [ ] Tests de charge et monitoring
- [ ] Logs d'erreurs centralisés
- [ ] Métriques d'utilisation API

### Améliorations UX
- [ ] Mode sombre
- [ ] Raccourcis clavier
- [ ] Notifications temps réel
- [ ] Import par drag & drop

## Complété [Done]

### Infrastructure MVP ✅
- [x] Configuration Supabase avec pgvector
- [x] Setup Next.js 15.5.3 avec TypeScript
- [x] Intégration Tailwind CSS + shadcn/ui
- [x] Déploiement VPS production (port 3002)

### Fonctionnalités de base ✅
- [x] Import requêtes HAR/Burp via textarea
- [x] Génération embeddings OpenAI
- [x] Analyse Claude avec contexte similaire
- [x] Boucle de feedback (marche/erreur/partiel)
- [x] Parser HAR/Burp avec auto-tagging
- [x] Fonction recherche vectorielle (match_requests)

### Authentification ✅
- [x] Page login/signup Supabase Auth
- [x] AuthProvider pour gestion état
- [x] Protection des routes
- [x] Déconnexion et affichage email utilisateur
- [x] Middleware anti-cache

### Résolution bugs ✅
- [x] Fix 401 Unauthorized Supabase
- [x] Suppression clés API expirées hardcodées
- [x] Configuration variables environnement
- [x] RLS désactivé avec politiques permissives

## Bloqué [Blocked]

Aucune tâche bloquée actuellement.

## Notes
- Prioriser la sécurité avant nouvelles fonctionnalités
- Tester chaque feature avant déploiement
- Documenter les changements dans CHANGELOG.md