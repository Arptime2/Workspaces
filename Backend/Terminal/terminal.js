const { spawn } = require('child_process');

function spawnShell() {
    return spawn('bash', [], { stdio: ['pipe', 'pipe', 'pipe'] });
}

module.exports = { spawnShell };

if (require.main === module) {
    const command = process.argv.slice(2).join(' ');
    if (!command) {
        console.error('Usage: node Backend/Terminal/terminal.js <command>');
        process.exit(1);
    }
    const child = spawn('bash', ['-c', command], { stdio: 'inherit' });
}