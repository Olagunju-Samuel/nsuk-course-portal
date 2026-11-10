# Vercel and Supabase deployment

The frontend is a Vite single-page app hosted on Vercel. Supabase provides Auth, the Edge Function API, the PostgreSQL key-value table, and private PDF Storage. The existing public Supabase URL/key in `utils/supabase/info.tsx` are client-side values; never put the Supabase service-role key in the frontend or Vercel build variables.

## Deploy the frontend

1. Push this repository to a Git provider and import it into Vercel.
2. Vercel should detect Vite. The checked-in `vercel.json` sets `pnpm build`, `dist`, and SPA fallback routing.
3. Deploy, then note the production URL (for example, `https://your-site.vercel.app`). No frontend environment variables are required for the currently connected Supabase project.

## Deploy the Supabase API

The frontend calls the existing Supabase project configured in `utils/supabase/info.tsx`. Deploy the function to that same project using the Supabase CLI, with the project linked and authenticated:

```sh
supabase link --project-ref mgrupllmxlslvksilkor
supabase functions deploy make-server-e9064e7e
```

The function's Supabase URL and service-role key are supplied by Supabase at runtime. Do not copy the service-role key into Vercel, source files, or client code. The function config disables the platform JWT gate because public read/setup-status routes use the anon key; protected admin routes verify the user's access token and active admin profile inside the function.

Confirm the function is reachable at `https://mgrupllmxlslvksilkor.supabase.co/functions/v1/make-server-e9064e7e/health` and returns `{"status":"ok"}`.

## Create the first administrator

Public self-registration is intentionally disabled. Provision the first account only after the Edge Function has been deployed:

1. In Supabase Dashboard for project `mgrupllmxlslvksilkor`, open **Authentication → Users** and create the administrator's email/password account. Keep the password private and give it directly to the administrator.
2. Copy the new user's UUID from the Auth user list.
3. In **SQL Editor**, run the statement below after replacing all three placeholders with the actual UUID, email, and name. This creates the active admin profile the API checks. Use the same email as the Auth user.

```sql
insert into public.kv_store_e9064e7e (key, value)
values (
  'profiles:REPLACE_WITH_AUTH_USER_UUID',
  jsonb_build_object(
    'id', 'REPLACE_WITH_AUTH_USER_UUID',
    'email', 'admin@example.com',
    'fullName', 'Administrator Name',
    'role', 'admin',
    'status', 'active',
    'createdAt', now()::text
  )
);
```

4. Open the Vercel site and choose **Administrator access** in the footer. Sign in with that account. The first-admin setup form is not available to the public.

To add another administrator, create a separate Auth user and insert its corresponding `profiles:<UUID>` record with `role: admin` and `status: active` using the same process. To revoke access, change that profile's status to `disabled` in the protected database.

## Supabase Auth and Storage checks

- Set the Supabase Auth **Site URL** to the production Vercel URL. Add the production URL and any Vercel preview URLs you intend to use to the Auth redirect URL allow-list.
- Confirm the existing `kv_store_e9064e7e` table is present in the connected Supabase project.
- On the first PDF upload, the function creates the `academic-resources` bucket as private. Test with a draft PDF and confirm only published, verified resources receive public signed URLs.
- Do not use real student or sensitive personal data for initial testing.

## Verify before launch

Run a local production build with `pnpm build`, then check the Vercel deployment, student browse flow, administrator sign-in, saving a record, and PDF upload/download. The administrator must be provisioned in Supabase before sign-in will succeed.
