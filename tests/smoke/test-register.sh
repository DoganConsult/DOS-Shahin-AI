curl -i -X POST http://127.0.0.1:4010/api/public/onboarding/new-user/register \
-H "Content-Type: application/json" \
-d '{"companyNameEn":"Test Inc","email":"test@example.com","password":"Password123!","userName":"Test User","consent":true}'
