const fs = require('fs');

const files = [
  '/root/DOS-AIO/services/platform-product-service/src/routes/product-license.routes.ts',
  '/root/DOS-AIO/services/platform-core-service/src/routes/mobile-session.routes.ts'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  if (!content.includes(', asyncHandler')) {
    content = content.replace(/import \{ validate/g, 'import { asyncHandler, validate');
    
    // Replace the exact route signatures
    content = content.replace(/async \(req: Request, res: Response\) => \{/g, 'asyncHandler(async (req: Request, res: Response) => {');
    
    // Replace the specific end brackets for handlers that end with `});`
    // We can do this safely by looking for `  } catch (err) {\n    res.status(500)... }`
    // followed by `});`
    content = content.replace(/\s*res\.status\(500\)\.json\(\{.*?\}\);\n  \}\n\}\);/g, match => {
      return match.replace(/}\);$/, '}));');
    });
  }

  fs.writeFileSync(file, content, 'utf8');
});
