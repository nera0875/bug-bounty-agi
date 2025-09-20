// Script pour appliquer les migrations Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function applyMigrations() {
  console.log('🚀 Starting migrations...\n');

  try {
    // Lire le fichier de migration
    const migrationPath = path.join(__dirname, '..', 'migrations', '002_ai_memory_system.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Séparer les commandes SQL
    const commands = migrationSQL
      .split(';')
      .filter(cmd => cmd.trim())
      .map(cmd => cmd.trim() + ';');

    console.log(`📝 Found ${commands.length} SQL commands to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    // Exécuter chaque commande
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i];

      // Skip les commentaires
      if (command.startsWith('--') || command.length < 10) {
        continue;
      }

      // Extraire le type de commande pour le log
      const commandType = command.substring(0, 50).replace(/\n/g, ' ');

      try {
        console.log(`[${i + 1}/${commands.length}] Executing: ${commandType}...`);

        // Utiliser RPC pour exécuter SQL brut
        const { error } = await supabase.rpc('exec_sql', {
          query: command
        });

        if (error) {
          // Si exec_sql n'existe pas, essayer avec query direct (moins idéal)
          if (error.message.includes('exec_sql')) {
            console.log('⚠️  exec_sql not available, trying direct query...');
            // Pour certaines commandes simples, on peut les transformer
            // Mais pour l'instant on skip
            console.log('⏭️  Skipping complex command, apply manually via Supabase dashboard');
            continue;
          }
          throw error;
        }

        successCount++;
        console.log('✅ Success\n');
      } catch (error) {
        errorCount++;
        console.error(`❌ Error: ${error.message}\n`);

        // Continue avec les autres commandes
        if (!command.includes('CREATE TABLE IF NOT EXISTS')) {
          // Les erreurs sur CREATE TABLE IF NOT EXISTS sont OK
        }
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successful commands: ${successCount}`);
    console.log(`❌ Failed commands: ${errorCount}`);

    if (errorCount > 0) {
      console.log('\n⚠️  Some commands failed. This might be normal if tables already exist.');
      console.log('You may need to apply the migration manually via Supabase SQL editor.');
    }

    // Vérifier que les tables ont été créées
    console.log('\n🔍 Verifying tables...');
    await verifyTables();

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

async function verifyTables() {
  const tablesToCheck = [
    'request_patterns',
    'ai_memory',
    'similarity_cache',
    'compressed_requests',
    'learning_loops'
  ];

  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('id')
        .limit(1);

      if (error && error.code === '42P01') {
        console.log(`❌ Table '${table}' does not exist`);
      } else if (error) {
        console.log(`⚠️  Table '${table}' - Error: ${error.message}`);
      } else {
        console.log(`✅ Table '${table}' exists`);
      }
    } catch (err) {
      console.log(`❌ Could not check table '${table}'`);
    }
  }
}

// Alternative : Afficher les commandes SQL pour copier/coller manuel
async function generateManualSQL() {
  console.log('\n📋 Manual SQL Commands (copy to Supabase SQL editor):\n');
  console.log('=' .repeat(60));

  const migrationPath = path.join(__dirname, '..', 'migrations', '002_ai_memory_system.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log(migrationSQL);
  console.log('=' .repeat(60));
  console.log('\n✨ Copy the above SQL and paste it in your Supabase SQL editor');
  console.log('   Dashboard > SQL Editor > New Query');
}

// Menu principal
async function main() {
  console.log('🔧 Supabase Migration Tool\n');
  console.log('1. Try automatic migration');
  console.log('2. Generate SQL for manual application');
  console.log('3. Verify tables only\n');

  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('Choose option (1-3): ', async (answer) => {
    switch(answer.trim()) {
      case '1':
        await applyMigrations();
        break;
      case '2':
        await generateManualSQL();
        break;
      case '3':
        await verifyTables();
        break;
      default:
        console.log('Invalid option');
    }
    readline.close();
  });
}

// Fonction helper pour créer exec_sql si elle n'existe pas
async function createExecSQLFunction() {
  const createFunction = `
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;
`;

  console.log('Creating exec_sql function...');
  // Cette fonction devrait être créée manuellement dans Supabase
  console.log('Please create this function manually in Supabase SQL editor:');
  console.log(createFunction);
}

// Run
main().catch(console.error);