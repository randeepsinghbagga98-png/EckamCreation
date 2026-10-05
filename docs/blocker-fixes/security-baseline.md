# Security probe

prefix: qa-fix-202610050453
web: http://localhost:3047 admin: http://localhost:3001 api: http://127.0.0.1:3002

| ID | Expected | Actual | Result |
| --- | --- | --- | --- |
| staff-login | 200 | 200 | PASS |
| staff-cookie | httpOnly+Lax | {"present":true,"httpOnly":true,"secure":false,"sameSite":"lax","valuePrinted":false} | PASS |
| staff-body-safe | no secrets | leak=false | PASS |
| admin-unauth | 307 login | 307 /admin/login | PASS |
| admin-api-unauth | 401 | 401 | PASS |
| reg-a | 201 | 201 | PASS |
| cust-cookie | httpOnly+Lax | {"present":true,"httpOnly":true,"secure":false,"sameSite":"lax","valuePrinted":false} | PASS |
| reg-b | 201 | 201 | PASS |
| cust-on-admin | 401/403 | 401 | PASS |
| idor-addr | 401/403/404 | 404 | PASS |
| idor-order | 401/403/404 | 404 | PASS |
| cart-poison | 200 server total | 200 sub=true leak=false | PASS |
| checkout-ready | 201 paymentReady false | 201 ready=false | PASS |
| unpaid-complete | 4xx | 400 | PASS |
| logout | 200 | 200 | PASS |
| replay | 401 or unauthenticated | 200 auth=false | PASS |
| staff-logout | 200 | 200 | PASS |
| staff-replay | 401 or unauthenticated | 200 auth=false | PASS |
