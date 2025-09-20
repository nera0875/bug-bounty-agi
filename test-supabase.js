const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://clcpszhztwfhnvirexao.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsY3Bzemh6dHdmaG52aXJleGFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NzY1NDIsImV4cCI6MjA3MTQ1MjU0Mn0.PWnQqh6lKQKKO8-9_GoyzWxKLNVxWsVWoZ-fdMPb2HA'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testConnection() {
  console.log('🔍 Test de connexion Supabase...')
  console.log('URL:', supabaseUrl)
  console.log('Key (début):', supabaseAnonKey.substring(0, 20) + '...')

  try {
    // Test 1: Lister les projets
    console.log('\n📋 Test 1: Récupération des projets...')
    const { data: projects, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    if (projectError) {
      console.error('❌ Erreur projets:', projectError)
    } else {
      console.log('✅ Projets récupérés:', projects?.length || 0)
    }

    // Test 2: Créer un projet test
    console.log('\n📋 Test 2: Création d\'un projet test...')
    const { data: newProject, error: createError } = await supabase
      .from('projects')
      .insert({ name: 'Test API ' + new Date().toISOString() })
      .select()
      .single()

    if (createError) {
      console.error('❌ Erreur création:', createError)
    } else {
      console.log('✅ Projet créé:', newProject)

      // Nettoyer
      if (newProject?.id) {
        const { error: deleteError } = await supabase
          .from('projects')
          .delete()
          .eq('id', newProject.id)

        if (!deleteError) {
          console.log('🧹 Projet test supprimé')
        }
      }
    }

    // Test 3: Vérifier les permissions
    console.log('\n📋 Test 3: Vérification des permissions RLS...')
    const { data: policies, error: policyError } = await supabase
      .rpc('check_rls_policies', {})
      .single()

    if (policyError && policyError.code !== 'PGRST202') {
      console.log('⚠️  Fonction RLS non disponible (normal)')
    }

  } catch (err) {
    console.error('❌ Erreur générale:', err)
  }
}

testConnection()