# mysbc-platform (monorepo)

Plataforma multitenant para criação e gerenciamento de integrações de comunicação.

- apps/web: Next.js 14 (App Router), Tailwind, shadcn/ui
- apps/api: NestJS
- packages/ui: componentes compartilhados
- packages/shared: tipos/DTOs
- packages/flow-nodes: SDK de nós e nós padrão

Gerenciado com pnpm workspaces.

## Instalação rápida (Debian 11/12)

```bash
# 1) Dependências do sistema
apt-get update && apt-get install -y ca-certificates curl gnupg nginx git make sudo unzip

# 2) Node 20 + pnpm
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt-get install -y nodejs
corepack enable && corepack prepare pnpm@9.6.0 --activate

# 3) FreeSWITCH (básico)
./infra/engine/install_freeswitch_debian.sh
./infra/engine/post_install_config.sh
./infra/engine/verify_engine.sh

# 4) Nginx
cp infra/nginx/nginx.conf.hbs /etc/nginx/nginx.conf
nginx -t && systemctl restart nginx

# 5) Variáveis de ambiente
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
# edite SUPABASE_URL/KEYS e ENGINE_* conforme necessário

# 6) Instalação e build
pnpm i
pnpm -r build

# 7) Execução (dev)
pnpm --filter web dev &
pnpm --filter api start:dev &
```

