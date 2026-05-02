curl -i -X POST http://127.0.0.1:4000/api/public/onboarding/new-user/register \
-H "Content-Type: application/json" \
-d '{"companyNameEn":"FixTestCorp","email":"fixtest@err.com","password":"Password123!","userName":"FixTest","consent":true}'
