const fs = require('node:fs');
const path = require('node:path');
const root = process.argv[2] || process.cwd();
const source = fs.readFileSync(path.join(root, 'supabase/functions/kpi-sync/index.ts'), 'utf8');
const deploy = fs.readFileSync(path.join(root, 'Deploy-KpiSync.ps1'), 'utf8');
const docs = fs.readFileSync(path.join(root, 'SUPABASE_DEPLOYMENT.md'), 'utf8');
const checks = [
  ['deployment version advanced', source.includes('const deploymentVersion = "2026.10.21.1";') && deploy.includes('$expectedDeploymentVersion = "2026.10.21.1"')],
  ['critical full-deletion guard', source.includes('full_removal_${collection}')],
  ['critical collection threshold guard', source.includes('deleteCount / currentCount >= 0.25')],
  ['general protected collection threshold retained', source.includes('deleteCount / currentCount > 0.35')],
  ['blocked mutation audit log', source.includes('[SAFE_MUTATION_BLOCKED]') && source.includes('logBlockedDestructiveMutation')],
  ['last active Admin guard', source.includes('function assertLastAdminPreserved') && source.includes('last_active_admin_removal')],
  ['guard applied to computed next state', source.includes('assertLastAdminPreserved(current.state, result.state, actorId)')],
  ['deployment docs updated', docs.includes('2026.10.21.1 SAFE')],
];
let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failed++;
}
if (failed) process.exit(1);
console.log(`All ${checks.length} SAFE checks passed.`);
