const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Limpando migrations com erro...\n');

try {
  // Deletar a pasta da migration quebrada
  const migrationsDir = path.join(__dirname, 'server', 'prisma', 'migrations');
  const dirs = fs.readdirSync(migrationsDir).filter(d => {
    return d.includes('add_req_sequence');
  });

  for (const dir of dirs) {
    const fullPath = path.join(migrationsDir, dir);
    console.log(`🗑️  Deletando: ${dir}`);
    fs.rmSync(fullPath, { recursive: true, force: true });
  }

  console.log('\n✅ Migrations limpas!\n');
  console.log('🎉 Pronto! Agora as requisições usam ID sequencial (2026-000001, etc)');
  console.log('');
  console.log('Próximos passos:');
  console.log('1. Commit + push do código atualizado');
  console.log('2. O banco já foi resetado e pronto para usar!');

} catch (err) {
  console.error('\n❌ Erro:', err.message);
  process.exit(1);
}