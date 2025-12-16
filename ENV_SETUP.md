# Environment Variables Setup with dotenvx

## Quick Start

### 1. Create your `.env` file

Create a `.env` file in the project root with the following variables:

```env
# Supabase Configuration
NUXT_SUPABASE_URL=https://your-project.supabase.co
NUXT_SUPABASE_ANON_KEY=your_anon_key_here
NUXT_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Application Configuration (optional)
# NODE_ENV=production
```

### 2. Running the Application

#### Development Mode
```bash
npm run dev
```

#### Production Build
```bash
npm run build
npm run start
```

The `npm run start` command uses dotenvx to load environment variables from `.env` file.

### 3. Using dotenvx Features

#### Encrypt your `.env` file (Recommended for Production)
```bash
npx dotenvx encrypt
```

This creates a `.env.keys` file. **Keep this file secure and never commit it!**

#### Run with encrypted environment
```bash
npx dotenvx run -- node .output/server/index.mjs
```

#### Multiple Environments

Create environment-specific files:
- `.env.local` - Local development
- `.env.production` - Production
- `.env.staging` - Staging

Run with specific environment:
```bash
npx dotenvx run -f .env.production -- node .output/server/index.mjs
```

### 4. CI/CD Integration

For production deployment, you can:

**Option 1: Use encrypted .env**
```bash
npx dotenvx run -- node .output/server/index.mjs
```

**Option 2: Pass environment variables directly**
```bash
NUXT_SUPABASE_URL=xxx NUXT_SUPABASE_SERVICE_ROLE_KEY=xxx node .output/server/index.mjs
```

## Benefits of dotenvx

- 🔐 **Encryption**: Encrypt sensitive variables
- 🌍 **Multi-environment**: Easy environment switching
- 🔄 **Type-safe**: Better error handling
- 📝 **Better logging**: See which env vars are loaded
- 🔧 **Framework agnostic**: Works everywhere

## Security Best Practices

1. ✅ Never commit `.env` files to git (already in .gitignore)
2. ✅ Keep `.env.keys` secure and private
3. ✅ Use encrypted `.env` files in production
4. ✅ Share `.env.example` with your team (safe template)
5. ✅ Rotate keys regularly

## Troubleshooting

### Error: "supabaseUrl is required"
Make sure your `.env` file exists and contains all required variables.

### Variables not loading
Ensure you're using `npm run start` or `dotenvx run --` prefix when running the built app.

### Permission errors
Run with appropriate permissions or use dotenvx's `--verbose` flag:
```bash
npx dotenvx run --verbose -- node .output/server/index.mjs
```

