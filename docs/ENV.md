# Environment Variables

## Project Root for Backend (.env)

```env
SUPABASE_URL=           # Supabase project Settings > API > Project URL
SUPABASE_ANON_KEY=      # Supabase project Settings > API > anon public key
SUPABASE_SERVICE_KEY=   # Supabase project Settings > API > service_role key (backend only, never expose)
GEMINI_API_KEY=         # Google AI Studio: https://aistudio.google.com/apikey
GEMINI_MODEL=gemini-2.5-flash
```

## Frontend Extension (frontend/extension/.env)

```env
VITE_SUPABASE_URL=      # Same as SUPABASE_URL
VITE_SUPABASE_ANON_KEY= # Same as SUPABASE_ANON_KEY
VITE_DEMO_PASSWORD=     # Demo account password for jury access
VITE_DASHBOARD_URL=     # https://sepetiq.vercel.app or http://localhost:3000
```

## Frontend Web (frontend/web/.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=      # Same as SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Same as SUPABASE_ANON_KEY
NEXT_PUBLIC_DEMO_PASSWORD=     # Same as VITE_DEMO_PASSWORD
```

## Notes

- `SUPABASE_SERVICE_KEY` sadece backend'de kullanılmalı, frontend'e asla ekleme
- Tüm değerler Supabase ve Google AI Studio'dan ücretsiz alınabilir
- Railway ve Vercel deploy için bu değerleri ilgili platform environment variables bölümüne ekle
