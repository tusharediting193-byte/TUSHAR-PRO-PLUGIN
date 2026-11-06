TUSHAR PRO ADMIN WEB — BETA 0.1

WHAT THIS BUILD DOES
- Supabase email/password sign-in
- Server-side admin check through the public.is_admin() RPC
- Dashboard overview counts
- Read-only views for profiles, licenses, devices, presets, updates, announcements and logs
- Black/red responsive admin UI

IMPORTANT LIMITATIONS
- This is an initial admin dashboard, not a finished commercial backend.
- It does not create or manage payments.
- It does not yet provide forms for uploading presets/releases or editing users.
- Storage buckets and upload policies are not configured.
- Admin audit log writes are not yet wired.
- Device trigger limits active device rows to two, but trusted device registration must be implemented server-side.
- Supabase RLS and database policies remain the security boundary.

DEPLOY LOCALLY
Open index.html in a modern browser. Internet is required for the Supabase JS CDN and Supabase project.

DEPLOY TO CLOUDFLARE PAGES (STATIC)
1. Create a GitHub repository, e.g. tushar-pro-admin.
2. Upload all files from this folder to the repository root.
3. In Cloudflare Dashboard, open Workers & Pages > Create > Pages > Connect to Git.
4. Select the repository.
5. Framework preset: None.
6. Build command: leave blank.
7. Build output directory: / (or the root directory setting shown by the current Cloudflare UI).
8. Deploy.
9. Keep the site private operationally: the dashboard itself requires Supabase sign-in AND the admin role check.

CONFIGURATION
config.js contains the Supabase project URL and publishable key. Publishable keys are intended for browser use. NEVER put sb_secret or service_role keys here.
