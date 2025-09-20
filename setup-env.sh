#!/bin/bash

# Script de configuration des variables d'environnement
# Usage: ./setup-env.sh

echo "🔧 Configuration de l'environnement Bug Bounty AGI"
echo "=================================================="
echo ""

# Vérifier si .env.local existe
if [ -f .env.local ]; then
    echo "⚠️  Le fichier .env.local existe déjà."
    read -p "Voulez-vous le mettre à jour? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Annulé."
        exit 0
    fi
    # Backup
    cp .env.local .env.local.backup
    echo "✅ Backup créé: .env.local.backup"
fi

echo ""
echo "📝 Configuration Supabase (obligatoire)"
echo "---------------------------------------"
echo "Récupérez ces valeurs depuis: https://supabase.com/dashboard/project/_/settings/api"
echo ""

# Lire les valeurs Supabase existantes si disponibles
if [ -f .env.local ]; then
    CURRENT_SUPABASE_URL=$(grep NEXT_PUBLIC_SUPABASE_URL .env.local | cut -d '=' -f2)
    CURRENT_SUPABASE_ANON=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d '=' -f2)
fi

read -p "SUPABASE_URL [${CURRENT_SUPABASE_URL:-https://[PROJECT-ID].supabase.co}]: " SUPABASE_URL
SUPABASE_URL=${SUPABASE_URL:-$CURRENT_SUPABASE_URL}

read -p "SUPABASE_ANON_KEY [${CURRENT_SUPABASE_ANON:-Hidden}]: " SUPABASE_ANON_KEY
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY:-$CURRENT_SUPABASE_ANON}

echo ""
echo "🤖 Configuration IA (requis pour système intelligent)"
echo "------------------------------------------------------"

read -p "OPENAI_API_KEY (pour embeddings) [sk-...]: " OPENAI_KEY
read -p "ANTHROPIC_API_KEY (pour Claude) [sk-ant-...]: " ANTHROPIC_KEY

echo ""
echo "📝 Création du fichier .env.local..."

cat > .env.local << EOL
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}

# AI APIs (required for smart analysis)
OPENAI_API_KEY=${OPENAI_KEY}
ANTHROPIC_API_KEY=${ANTHROPIC_KEY}

# Optional: Supabase Service Key (for admin operations)
# SUPABASE_SERVICE_KEY=

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
EOL

echo "✅ Fichier .env.local créé avec succès!"
echo ""
echo "📋 Prochaines étapes:"
echo "1. Appliquer les migrations dans Supabase Dashboard"
echo "   → Copier le SQL depuis: node scripts/apply-migrations.js (option 2)"
echo "2. Créer des projets test dans la base"
echo "3. Lancer l'application: npm run dev"
echo "4. Accéder à: http://localhost:3000/analyze-smart"
echo ""
echo "💡 Pour tester sans clés IA, utilisez le cache L1/L2"
echo "   Les requêtes similaires économisent 95% des tokens!"