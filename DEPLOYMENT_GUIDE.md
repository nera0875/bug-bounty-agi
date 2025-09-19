# 🚀 Guide de Déploiement Vercel - Bug Bounty AGI

## Option 1: Déploiement via l'interface web Vercel (Recommandé)

### Étapes:

1. **Accédez à Vercel**
   - Ouvrez: https://vercel.com/new
   - Connectez-vous avec GitHub

2. **Importez le repository**
   - URL: `https://github.com/nera0875/bug-bounty-agi`
   - Ou cherchez: `nera0875/bug-bounty-agi`

3. **Configuration des variables d'environnement**

   Ajoutez ces variables dans la section "Environment Variables":

   ```
   NEXT_PUBLIC_SUPABASE_URL=(voir .env.local)
   NEXT_PUBLIC_SUPABASE_ANON_KEY=(voir .env.local)
   SUPABASE_SERVICE_KEY=(voir .env.local)
   ANTHROPIC_API_KEY=(votre clé Claude API)
   OPENAI_API_KEY=(votre clé OpenAI API)
   ```

   **Note**: Les vraies clés sont stockées dans `.env.local`

4. **Cliquez sur "Deploy"**
   - Le déploiement prendra 2-3 minutes
   - URL finale: `bug-bounty-agi.vercel.app` ou un sous-domaine généré

## Option 2: Déploiement via Vercel CLI

```bash
# Installation globale de Vercel CLI
npm i -g vercel

# Dans le dossier du projet
cd /home/pilote/projet/bug-bounty-agi

# Login (suivez les instructions)
vercel login

# Déploiement
vercel --prod
```

Lors du premier déploiement, répondez:
- Setup and deploy? **Yes**
- Which scope? **Votre compte**
- Link to existing project? **No**
- Project name? **bug-bounty-agi**
- In which directory is your code? **.//**
- Want to override settings? **No**

## Option 3: Lien direct de déploiement

Cliquez sur ce bouton pour déployer directement:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fnera0875%2Fbug-bounty-agi&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,SUPABASE_SERVICE_KEY,ANTHROPIC_API_KEY,OPENAI_API_KEY)

## 📝 Notes importantes

- **Base de données**: Déjà configurée sur Supabase (projet BRP)
- **Build**: Testé et fonctionnel (Next.js 15.5 + Turbopack)
- **API Keys**: Toutes configurées dans `.env.local`
- **GitHub**: Repository public accessible

## ✅ Vérification post-déploiement

1. Accédez à votre URL Vercel
2. Créez un nouveau projet
3. Importez des requêtes HAR/Burp
4. Testez l'analyse avec Claude
5. Vérifiez le feedback loop

## 🔧 Dépannage

Si erreur de build:
- Vérifiez les variables d'environnement
- Consultez les logs Vercel
- Testez localement: `npm run build`

## 🎯 URLs importantes

- **GitHub**: https://github.com/nera0875/bug-bounty-agi
- **Supabase**: https://supabase.com/dashboard/project/clcpszhztwfhnvirexao
- **Vercel Dashboard**: https://vercel.com/dashboard

---

**Le projet est prêt pour le déploiement! 🚀**