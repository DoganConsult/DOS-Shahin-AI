const pkg = require('./services/ai-engine-service/package.json');
pkg.imports = { "#services/*": "./src/domain/ai-governance/services/*" };
require('fs').writeFileSync('./services/ai-engine-service/package.json', JSON.stringify(pkg, null, 2));
