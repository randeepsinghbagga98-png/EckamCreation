const keys = [
  'ALLOW_TEST_PAYMENT_PROVIDER',
  'NEXT_PUBLIC_APP_URL',
  'AI_API_KEY',
];
for (const key of keys) {
  const raw = process.env[key];
  const set = Boolean(raw && raw.trim());
  console.log(`${key}=${set ? 'SET' : 'UNSET'}`);
}
