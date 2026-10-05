# QA matrix

| ID | Check | Expected | Actual | Evidence label | PASS/FAIL |
| --- | --- | --- | --- | --- | --- |
| P0-API-HEALTH | API health | 200 | 200 | [MEASURED] | PASS |
| S1-WEB-/ | GET / | 200 | 200 | [MEASURED] | PASS |
| S1-WEB-/about | GET /about | 200 | 200 | [MEASURED] | PASS |
| S1-WEB-/contact | GET /contact | 200 | 200 | [MEASURED] | PASS |
| S1-WEB-/privacy | GET /privacy | 200 | 200 | [MEASURED] | PASS |
| S1-WEB-/terms | GET /terms | 200 | 200 | [MEASURED] | PASS |
| S1-WEB-/refund-policy | GET /refund-policy | 200 | 200 | [MEASURED] | PASS |
| S1-WEB-/shop | GET /shop | 200 | 200 | [MEASURED] | PASS |
| S1-WEB-/search | GET /search | 200 | 200 | [MEASURED] | PASS |
| S1-WEB-/collections | GET /collections | 200 | 200 | [MEASURED] | PASS |
| S1-WEB-/cart | GET /cart | 200 | 200 | [MEASURED] | PASS |
| S1-WEB-/checkout | GET /checkout | 200 | 200 | [MEASURED] | PASS |
| S1-WEB-/account | GET /account | 200-or-gated | 200 | [MEASURED] | PASS |
| S1-WEB-/login | GET /login | 307 | 307 -> /account/login | [MEASURED] | PASS |
| S1-WEB-/signup | GET /signup | 307 | 307 -> /account/signup | [MEASURED] | PASS |
| S1-WEB-/account/login | GET /account/login | 200 | 200 | [MEASURED] | PASS |
| S1-WEB-/account/signup | GET /account/signup | 200 | 200 | [MEASURED] | PASS |
| S1-WEB-/account/wishlist | GET /account/wishlist | 200-or-gated | 200 | [MEASURED] | PASS |
| S1-WEB-/account/addresses | GET /account/addresses | 200-or-gated | 200 | [MEASURED] | PASS |
| S1-WEB-/account/orders | GET /account/orders | 200-or-gated | 200 | [MEASURED] | PASS |
| S1-WEB-/account/profile | GET /account/profile | 200-or-gated | 200 | [MEASURED] | PASS |
| S1-WEB-/robots.txt | GET /robots.txt | 200 | 200 | [MEASURED] | PASS |
| S1-WEB-/sitemap.xml | GET /sitemap.xml | 200 | 200 | [MEASURED] | PASS |
| S1-ADMIN-/admin/login | unauth GET /admin/login | 200 | 200  | [MEASURED] | PASS |
| S1-ADMIN-/admin | unauth GET /admin | 307 login | 307 /admin/login | [MEASURED] | PASS |
| S1-ADMIN-/admin/products | unauth GET /admin/products | 307 login | 307 /admin/login | [MEASURED] | PASS |
| S1-ADMIN-/admin/products/new | unauth GET /admin/products/new | 307 login | 307 /admin/login | [MEASURED] | PASS |
| S1-ADMIN-/admin/categories | unauth GET /admin/categories | 307 login | 307 /admin/login | [MEASURED] | PASS |
| S1-ADMIN-/admin/orders | unauth GET /admin/orders | 307 login | 307 /admin/login | [MEASURED] | PASS |
| S1-ADMIN-/admin/customers | unauth GET /admin/customers | 307 login | 307 /admin/login | [MEASURED] | PASS |
| S1-ADMIN-/admin/payments | unauth GET /admin/payments | 307 login | 307 /admin/login | [MEASURED] | PASS |
| S1-ADMIN-/admin/shipments | unauth GET /admin/shipments | 307 login | 307 /admin/login | [MEASURED] | PASS |
| S1-ADMIN-/admin/settings | unauth GET /admin/settings | 307 login | 307 /admin/login | [MEASURED] | PASS |
| S1-ADMIN-/admin/ai | unauth GET /admin/ai | 307 login | 307 /admin/login | [MEASURED] | PASS |
| S1-CATALOGUE | list published products | 200 n>0 | 200 n=11 | [MEASURED] | PASS |
| S1-PDP-artisan-decorative-tray | GET /shop/artisan-decorative-tray | 200 | 200 | [MEASURED] | PASS |
| S1-PDP-botanical-gift-box | GET /shop/botanical-gift-box | 200 | 200 | [MEASURED] | PASS |
| S1-PDP-linen-accent-cushion | GET /shop/linen-accent-cushion | 200 | 200 | [MEASURED] | PASS |
| S1-PDP-minimal-pendant-necklace | GET /shop/minimal-pendant-necklace | 200 | 200 | [MEASURED] | PASS |
| S1-PDP-pearl-drop-earrings | GET /shop/pearl-drop-earrings | 200 | 200 | [MEASURED] | PASS |
| S1-PDP-porcelain-table-setting | GET /shop/porcelain-table-setting | 200 | 200 | [MEASURED] | PASS |
| S1-PDP-daily-ritual-care | GET /shop/daily-ritual-care | 200 | 200 | [MEASURED] | PASS |
| S1-PDP-everyday-tailored-layer | GET /shop/everyday-tailored-layer | 200 | 200 | [MEASURED] | PASS |
| S1-PDP-tan-carryall | GET /shop/tan-carryall | 200 | 200 | [MEASURED] | PASS |
| S1-PDP-noir-compact-bag | GET /shop/noir-compact-bag | 200 | 200 | [MEASURED] | PASS |
| S1-PDP-cream-structured-tote | GET /shop/cream-structured-tote | 200 | 200 | [MEASURED] | PASS |
| S1-PDP-INVALID | invalid product slug | 404 | 200 | [MEASURED] | FAIL |
| S1-CAT-jewellery-accessories | GET /shop?category=jewellery-accessories | 200 | 200 | [MEASURED] | PASS |
| S1-CAT-bags-lifestyle | GET /shop?category=bags-lifestyle | 200 | 200 | [MEASURED] | PASS |
| S1-CAT-fashion | GET /shop?category=fashion | 200 | 200 | [MEASURED] | PASS |
| S1-CAT-home-decor | GET /shop?category=home-decor | 200 | 200 | [MEASURED] | PASS |
| S1-CAT-kitchen-essentials | GET /shop?category=kitchen-essentials | 200 | 200 | [MEASURED] | PASS |
| S1-CAT-beauty-personal-care | GET /shop?category=beauty-personal-care | 200 | 200 | [MEASURED] | PASS |
| S1-CAT-gifts-celebrations | GET /shop?category=gifts-celebrations | 200 | 200 | [MEASURED] | PASS |
| S1-CAT-arts-crafts-spiritual | GET /shop?category=arts-crafts-spiritual | 200 | 200 | [MEASURED] | PASS |
| S1-COL-everyday-edit | GET /collections/everyday-edit | 200 | 200 | [MEASURED] | PASS |
| S1-COL-INVALID | invalid collection slug | 404 | 200 | [MEASURED] | FAIL |
| S2-RET-/account/login?next=https://evil.example | returnTo /account/login?next=https://evil.example | no open redirect | 200 leaked=true | [MEASURED] | FAIL |
| S2-RET-/account/login?next=//evil.example | returnTo /account/login?next=//evil.example | no open redirect | 200 leaked=true | [MEASURED] | FAIL |
| S2-RET-/account/login?next=/\evil.example | returnTo /account/login?next=/\evil.example | no open redirect | 200 leaked=false | [MEASURED] | PASS |
| S2-RET-/account/login?next=/shop/tan-carryall | returnTo /account/login?next=/shop/tan-carryall | no open redirect | 200 leaked=false | [MEASURED] | PASS |
| S4-STAFF-COOKIE | staff Set-Cookie flags | httpOnly + SameSite=Lax | {"present":true,"httpOnly":true,"secure":false,"sameSite":"lax","path":"/","valuePrinted":false} | [MEASURED] | PASS |
| S4-STAFF-BODY-SAFE | staff login body has no secrets | no hash/token | unsafe=false | [MEASURED] | PASS |
| S10-UNAUTH-/v1/admin/dashboard | unauth /v1/admin/dashboard | 401 | 401 | [MEASURED] | PASS |
| S10-UNAUTH-/v1/admin/products | unauth /v1/admin/products | 401 | 401 | [MEASURED] | PASS |
| S10-UNAUTH-/v1/admin/categories | unauth /v1/admin/categories | 401 | 401 | [MEASURED] | PASS |
| S10-UNAUTH-/v1/admin/orders | unauth /v1/admin/orders | 401 | 401 | [MEASURED] | PASS |
| S10-UNAUTH-/v1/admin/customers | unauth /v1/admin/customers | 401 | 401 | [MEASURED] | PASS |
| S10-UNAUTH-/v1/admin/payments/intents | unauth /v1/admin/payments/intents | 401 | 401 | [MEASURED] | PASS |
| S10-UNAUTH-/v1/admin/shipments | unauth /v1/admin/shipments | 401 | 401 | [MEASURED] | PASS |
| S10-UNAUTH-/v1/admin/settings | unauth /v1/admin/settings | 401 | 401 | [MEASURED] | PASS |
| S10-UNAUTH-/v1/admin/ai/status | unauth /v1/admin/ai/status | 401 | 401 | [MEASURED] | PASS |
| S3-REG-A | register A | 201 | 201 | [MEASURED] | PASS |
| S4-CUST-COOKIE | customer Set-Cookie flags | httpOnly + SameSite=Lax | {"present":true,"httpOnly":true,"secure":false,"sameSite":"lax","path":"/","valuePrinted":false} | [MEASURED] | PASS |
| S4-REG-SAFE | register body safe | no secrets | unsafe=false | [MEASURED] | PASS |
| S3-REG-B | register B | 201 | 201 | [MEASURED] | PASS |
| S3-ME-A | GET /v1/me A | 200 email match | 200 unsafe=false | [MEASURED] | PASS |
| S3-SESS-A | GET /v1/auth/session A | 200 authenticated | 200 auth=true | [MEASURED] | PASS |
| S10-CUST-/v1/admin/dashboard | customer cookie /v1/admin/dashboard | 401 | 401 | [MEASURED] | PASS |
| S10-CUST-/v1/admin/products | customer cookie /v1/admin/products | 401 | 401 | [MEASURED] | PASS |
| S10-CUST-/v1/admin/categories | customer cookie /v1/admin/categories | 401 | 401 | [MEASURED] | PASS |
| S10-CUST-/v1/admin/orders | customer cookie /v1/admin/orders | 401 | 401 | [MEASURED] | PASS |
| S10-CUST-/v1/admin/customers | customer cookie /v1/admin/customers | 401 | 401 | [MEASURED] | PASS |
| S10-CUST-/v1/admin/payments/intents | customer cookie /v1/admin/payments/intents | 401 | 401 | [MEASURED] | PASS |
| S10-CUST-/v1/admin/shipments | customer cookie /v1/admin/shipments | 401 | 401 | [MEASURED] | PASS |
| S10-CUST-/v1/admin/settings | customer cookie /v1/admin/settings | 401 | 401 | [MEASURED] | PASS |
| S10-CUST-/v1/admin/ai/status | customer cookie /v1/admin/ai/status | 401 | 401 | [MEASURED] | PASS |
| S4-STAFF-AS-CUST | staff cookie on /v1/me | 401 | 401 | [MEASURED] | PASS |
| S3-ADDR-B | create address B | 201 | 201 | [MEASURED] | PASS |
| S8-ADDR-GET | A GET B address | 405 or 404 no leak | 405 leak=false | [MEASURED] | PASS |
| S8-ADDR-PATCH | A PATCH B address | 404 | 404 | [MEASURED] | PASS |
| S8-ADDR-LIST | A list does not include B | no B id | leaked=false | [MEASURED] | PASS |
| S7-WISH-ADD | wishlist add A | 201 | 201 | [MEASURED] | PASS |
| S8-WISH-B | B wishlist does not contain A's add | no leak | Bstatus=200 leaked=false | [MEASURED] | PASS |
| S7-WISH-GET | wishlist get A | 200 | 200 unsafe=false | [MEASURED] | PASS |
| S5-CART-ADD | cart add ignores poison | 200 server total | 200 sub=SET | [MEASURED] | PASS |
| S5-QTY-0 | quantity 0 rejected or ignored | 4xx | 400 | [MEASURED] | PASS |
| S5-QTY-NEG | quantity negative rejected | 4xx | 400 | [MEASURED] | PASS |
| S6-CHECKOUT | checkout start unconfigured | 201 paymentReady false server total | 201 ready=false | [MEASURED] | PASS |
| S8-CHECKOUT | B cannot read A's checkout | 404 | 404 | [MEASURED] | PASS |
| S6-INTENT | payment intent unconfigured | 4xx no provider success | 400 code=VALIDATION_ERROR | [MEASURED] | PASS |
| S6-COMPLETE | complete without payment | 4xx no paid order | 400 | [MEASURED] | PASS |
| S8-ORDER-GUESS | A guess foreign/missing order | 404 | 404 | [MEASURED] | PASS |
| S3-ORDERS | A order history | 200 empty or own | 200 n=0 | [MEASURED] | PASS |
| S7-GUEST-WISH | guest wishlist add | 401 | 401 | [MEASURED] | PASS |
| S3-LOGOUT | logout A | 200 | 200 | [MEASURED] | PASS |
| S3-REPLAY | replay A cookie | 401 | 401 | [MEASURED] | PASS |
| S3-LOGIN | login A | 200 | 200 | [MEASURED] | PASS |
| S3-WRONG-PW | wrong password | 401 | 401 code=UNAUTHORIZED | [MEASURED] | PASS |
| S3-UNKNOWN | unknown email | 401 | 401 code=UNAUTHORIZED | [MEASURED] | PASS |
| S3-ENUM | login messages do not distinguish user existence beyond product intent | same or documented | different=false | [MEASURED] | PASS |
| S3-DUP | duplicate email | 409/400 | 409 | [MEASURED] | PASS |
| S3-WEAK | weak password | 400 | 400 | [MEASURED] | PASS |
| S9-STAFF-LOGOUT | staff logout | 200 | 200 | [MEASURED] | PASS |
| S9-STAFF-REPLAY | staff cookie replay | 401 | 401 | [MEASURED] | PASS |
| S12-CORS-EVIL | unlisted origin not reflected | no ACAO or not evil | acao=none | [MEASURED] | PASS |
| S12-BADJSON | malformed JSON | 400 no stack | 400 stack=false | [MEASURED] | PASS |
| S5-SEARCH-LONG | very long search | 200 or 400 | 400 | [MEASURED] | PASS |
| S5-SEARCH-EMPTY | no-results search | 200 empty | 200 n=0 | [MEASURED] | PASS |
| S5-PAGE-NEG | negative pagination | 400 or clamped 200 | 400 | [MEASURED] | PASS |
| S9-API-/v1/admin/dashboard | staff GET /v1/admin/dashboard | 200 | 200 unsafe=false | [MEASURED] | PASS |
| S9-API-/v1/admin/products | staff GET /v1/admin/products | 200 | 200 unsafe=false | [MEASURED] | PASS |
| S9-API-/v1/admin/categories | staff GET /v1/admin/categories | 200 | 200 unsafe=false | [MEASURED] | PASS |
| S9-API-/v1/admin/orders | staff GET /v1/admin/orders | 200 | 200 unsafe=false | [MEASURED] | PASS |
| S9-API-/v1/admin/customers | staff GET /v1/admin/customers | 200 | 200 unsafe=false | [MEASURED] | PASS |
| S9-API-/v1/admin/payments/intents | staff GET /v1/admin/payments/intents | 200 | 200 unsafe=false | [MEASURED] | PASS |
| S9-API-/v1/admin/shipments | staff GET /v1/admin/shipments | 200 | 200 unsafe=false | [MEASURED] | PASS |
| S9-API-/v1/admin/settings | staff GET /v1/admin/settings | 200 | 200 unsafe=false | [MEASURED] | PASS |
| S9-API-/v1/admin/ai/status | staff GET /v1/admin/ai/status | 200 | 200 unsafe=false | [MEASURED] | PASS |
| S11-HEALTH-POST | POST /v1/health | 405/404 | 405 | [MEASURED] | PASS |
| S17-CLEANUP | delete only qa-scan prefix users | deleted | n=2 | [MEASURED] | PASS |
| S2-RET-HREF | Open-redirect href check | no href to evil.example | evilHrefs=[] nextInForm=false | [MEASURED] | PASS |
| S10-ANALYST-403 | Staff without write permission | 403 | 403 write / 200 read (analyst QA user cleaned) | [MEASURED] | PASS |
| S14-OVERFLOW | Document overflow 7 viewports x primary routes | 0 overflow | 0 / 63 cells | [MEASURED] | PASS |
| S16-AUTH-SECRET | AUTH_SECRET present locally | set for prod | UNSET on this machine | [MEASURED] | FAIL-local |
| S17-MIGRATE | prisma migrate status | up to date | 1 migration, schema up to date, localhost:5432 | [MEASURED] | PASS |
| S18-SITEMAP | sitemap indexable | canonical host | localhost true, 9 urls | [MEASURED] | FAIL |
| P1-ADMIN-TC | admin typecheck | PASS | FAIL TS18047 admin-shell.tsx | [MEASURED] | FAIL |
| P1-ADMIN-BUILD | admin next build | PASS | FAIL same TS18047 | [MEASURED] | FAIL |
| P1-WEB-BUILD | web next build | PASS | PASS 33 routes | [MEASURED] | PASS |
| P1-API-BUILD | api next build | PASS | PASS 43 routes | [MEASURED] | PASS |
| P1-TESTS | vitest | all pass | 208 passed / 24 files | [MEASURED] | PASS |
| P1-LINT | lint web/admin/api | 0 errors | 0 errors, 1 admin font warning | [MEASURED] | PASS |
| S11-SWEEP | unauth all inventoried endpoints | no unexpected 5xx/leak | 96 checked, 95 PASS, webhook 503 no leak | [MEASURED] | PASS |
| S10-ANALYST-WRITE | analyst POST /v1/admin/products | 403 | 403 | [MEASURED] | PASS |
| S10-ANALYST-READ | analyst GET /v1/admin/products | 200 | 200 | [MEASURED] | PASS |
| S6-UI-EMPTY | checkout empty HTTP | honest no fake paid | honest=true fakePaid=false | [OBSERVED] | PASS |
| S6-UI-BROWSER | checkout client empty state | empty or unconfigured | skeleton after 8s | [OBSERVED] | FAIL |
| S9-LOGIN-UI | admin login copy | staff-only | Staff sign in observed | [OBSERVED] | PASS |
| S13-ICON | icon.svg | 200 | 200 | [MEASURED] | PASS |
| S13-FAVICON | favicon.ico | 200 | 404 | [MEASURED] | FAIL |
| S13-NEXTIMAGE | next/image unsplash sample | 200 | 200 | [MEASURED] | PASS |
| S16-GITENV | .env files tracked | only .env.example | only .env.example | [MEASURED] | PASS |
| S16-CLIENT-BUNDLE | web static JS secret names | none | none in .next/static | [MEASURED] | PASS |
| S17-AFTER-TEST | catalogue intact after tests | 11/8/0 | 11/8/0 customers 76 | [MEASURED] | PASS |
| S18-ROBOTS-TXT | robots disallow private | account cart checkout | all true | [MEASURED] | PASS |
| S18-ROBOTS-META | cart/checkout meta noindex | noindex | index, follow | [MEASURED] | FAIL |
