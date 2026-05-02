const { execSync } = require('child_process');

async function test() {
  const json = JSON.parse(execSync(`curl -s -X POST http://127.0.0.1:4000/api/public/onboarding/new-user/register -H "Content-Type: application/json" -d '{"companyNameEn":"GtwFlow","email":"user_flow_2@ex.com","password":"Password123!","userName":"usr","consent":true}'`));
  
  if (!json.token) throw new Error("No token");
  
  console.log("Token received, calling bootstrap...");
  
  const start = Date.now();
  const bs = execSync(`curl -s -i -X GET http://127.0.0.1:4000/api/session/bootstrap -H "Authorization: Bearer ${json.token}" -H "x-tenant-id: ${json.tenantId}"`);
  console.log("Time: " + (Date.now() - start) + "ms");
  console.log(bs.toString().slice(0, 300));
}
test();
