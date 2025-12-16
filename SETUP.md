# Oshi3 Nihonto Project Setup Summary

**Setup Date:** December 16, 2025

## Project Overview
Japanese sword catalog digitization and translation project. Parsing Juyo Zufu volumes (重要刀剣等図譜) from PDF to database with AI-powered translation.

## Infrastructure Complete

### ✅ Supabase
- **Project Name:** oshi3-nihonto
- **Project ID:** itbhfhyptogxcjbjfzwx
- **Project URL:** https://itbhfhyptogxcjbjfzwx.supabase.co
- **Dashboard:** https://supabase.com/dashboard/project/itbhfhyptogxcjbjfzwx
- **Region:** East US (North Virginia)
- **Database Password:** Oshi3Nihonto2025!
- All API keys configured in .env

### ✅ GitHub
- **Repository:** https://github.com/0raclide/oshi3-nihonto
- **Owner:** 0raclide (Christopher Hill)
- **Visibility:** Public
- Git initialized and first commit pushed

### ✅ Netlify
- **Account:** christoph.hill0@gmail.com
- **Team:** Oshi3
- CLI authenticated and ready
- (Site will be created when we build frontend)

## Environment Variables (.env)
All tokens and keys are stored securely in `.env` (gitignored):
- Supabase project keys (URL, anon, service_role)
- Supabase management token
- Netlify auth token
- GitHub personal access token

## CLI Tools Installed
- ✅ Supabase CLI (v2.65.5)
- ✅ Netlify CLI
- ✅ Git

## Source Materials
Located in `/data/`:
- `1　第一回重要刀剣等図譜.pdf` (38.3 MB)
- `2　第二回重要刀剣等図譜.pdf` (44.2 MB)

## Next Steps
1. Examine PDF structure to understand page layout
2. Design database schema for nihonto items
3. Build PDF processing pipeline
4. Implement VLLM translation system
5. Create Supabase Storage buckets for images

## Architecture Plan (To Be Developed)
- PDF → Extract pages as JPEG pairs (oshigata + setsumei)
- Upload to Supabase Storage
- Use Claude Vision API to translate Japanese setsumei
- Store structured data in PostgreSQL tables
