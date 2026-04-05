const { execSync } = require('child_process');
const path = require('path');

// Extract --port if it was passed by the environment
let port = 3001;
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
if (portIndex !== -1 && args[portIndex + 1]) {
  port = args[portIndex + 1];
} else if (process.env.PORT) {
  port = process.env.PORT;
}

console.log(`Starting server on port ${port}...`);

try {
  // Use serve with the correct -l port syntax
  execSync(`npx serve dist -l ${port}`, { 
    stdio: 'inherit',
    cwd: __dirname 
  });
} catch (error) {
  console.error('Server failed to start:', error.message);
  process.exit(1);
}
