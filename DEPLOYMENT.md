# Guide de Déploiement Vercel

## 📋 Prérequis
- Compte Vercel
- Repository GitHub configuré : https://github.com/nera0875/bug-bounty-agi

## 🚀 Étapes de déploiement

### 1. Importer le projet sur Vercel

1. Allez sur [vercel.com/new](https://vercel.com/new)
2. Cliquez sur "Import Git Repository"
3. Sélectionnez : `nera0875/bug-bounty-agi`

### 2. Configurer les variables d'environnement

Ajoutez ces variables dans l'interface Vercel :

```env
NEXT_PUBLIC_SUPABASE_URL=https://clcpszhztwfhnvirexao.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsY3BzemhodHdmaG52aXJleGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ0MjkzNDIsImV4cCI6MjAzNzAwNTM0Mn0.LiIQB4IrfuMoKLN2YJJBaB1Vkp5U6kKHJ5kxl6k6wAI
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsY3BzemhodHdmaG52aXJleGFvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNDQyOTM0MiwiZXhwIjoyMDM3MDA1MzQyfQ.AxXqKCJcFq5xGGGXJl0dVA1G5q_hJ3TVvFBIz0cKOoQ
ANTHROPIC_API_KEY=[Votre clé Claude API]
OPENAI_API_KEY=[Votre clé OpenAI API]
```

### 3. Paramètres de build

- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 4. Déployer

1. Cliquez sur "Deploy"
2. Attendez que le build se termine (~2-3 minutes)
3. Votre app sera disponible sur : `bug-bounty-agi.vercel.app`

## 🗄 Base de données Supabase

La base de données est déjà configurée sur Supabase avec :
- **Projet**: BRP (clcpszhztwfhnvirexao)
- **Région**: EU-West-3
- **Tables**: projects, requests, sessions
- **Extension**: pgvector activé

## ⚠️ Important

- **Ne pas committer** le fichier `.env.local` avec les vraies clés
- **Sauvegarder** les clés API dans un gestionnaire de mots de passe
- **Activer RLS** sur Supabase en production

## 🔧 Test local

```bash
npm install
npm run dev
# Accès : http://localhost:3000
```

## 📊 Monitoring

- **Vercel Dashboard**: Logs et métriques
- **Supabase Dashboard**: Usage base de données
- **OpenAI/Anthropic**: Usage API et coûts

## 🆘 Support

En cas de problème :
1. Vérifier les logs Vercel
2. Vérifier la console Supabase
3. Tester localement avec les mêmes variables

---

**MVP déployé avec succès ! 🚀**