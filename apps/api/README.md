# API - FreeSWITCH Integration

Esta API NestJS integra com FreeSWITCH para gerenciar inbound connectors e fluxos de chamadas.

## 🚀 Inicialização

### Método Recomendado (com configuração FreeSWITCH)

```bash
cd apps/api
pnpm start:freeswitch
```

Este comando:
- ✅ Define automaticamente `ENGINE_FS_BASE_DIR=/usr/local/freeswitch/conf`
- ✅ Configura `ENGINE_RELOAD_DIALPLAN=false` para evitar timeouts ESL
- ✅ Define todas as variáveis de ambiente necessárias

### Método Manual

```bash
cd apps/api
ENGINE_FS_BASE_DIR=/usr/local/freeswitch/conf ENGINE_RELOAD_DIALPLAN=false pnpm start:dev
```

### Método Desenvolvimento

```bash
cd apps/api
pnpm start:dev
```

⚠️ **Nota**: O método de desenvolvimento usa os valores padrão do código, que já estão corretos.

## 📁 Estrutura de Arquivos FreeSWITCH

Os arquivos XML são criados em:

```
/usr/local/freeswitch/conf/dialplan/public/
├── {orgId}_{priority}_{name}.xml  # Inbound connectors
└── ...
```

Exemplo:
```
15fdb6da-04f3-4bc8-96ab-62fea602a435_100_testeRotadeEntrada.xml
```

## ⚙️ Variáveis de Ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `ENGINE_FS_BASE_DIR` | **HARDCODED** | Diretório base do FreeSWITCH (sempre `/usr/local/freeswitch/conf`) |
| `ENGINE_RELOAD_DIALPLAN` | `false` | Controla reload automático via ESL |
| `ENGINE_ESL_HOST` | `127.0.0.1` | Host do Event Socket Library |
| `ENGINE_ESL_PORT` | `8021` | Porta do ESL |
| `ENGINE_ESL_PASSWORD` | `ClueCon` | Senha do ESL |
| `ENGINE_AUDIO_DIR` | `/var/lib/freeswitch/storage/tenant` | Diretório de áudios |

## 🔒 **Caminho FreeSWITCH Hardcoded**

O caminho do FreeSWITCH está **hardcoded** no código para garantir consistência:
- ✅ **Sempre usa**: `/usr/local/freeswitch/conf`
- ✅ **Não depende** de variáveis de ambiente
- ✅ **Funciona** com qualquer comando de inicialização

## 🔧 Funcionalidades

### Auto-Sincronização
- ✅ **Create**: Novos inbounds são automaticamente publicados no FreeSWITCH
- ✅ **Update**: Edições são automaticamente sincronizadas
- ✅ **Delete**: Remoções são automaticamente aplicadas

### Controle de Reload
- 🟢 **Produção**: `ENGINE_RELOAD_DIALPLAN=true` (reload automático)
- 🟡 **Desenvolvimento**: `ENGINE_RELOAD_DIALPLAN=false` (sem reload para evitar timeouts)

## 📝 Logs

A API gera logs detalhados sobre:
- Criação/atualização de arquivos XML
- Status do dialplan reload
- Operações de auto-sincronização

Exemplo:
```
[FreeswitchEngineAdapter] Upserting inbound testeRotadeEntrada for org 15fdb6da...
[FreeswitchEngineAdapter] Inbound file written: /usr/local/freeswitch/conf/dialplan/public/15fdb6da_100_testeRotadeEntrada.xml
[FreeswitchEngineAdapter] Dialplan reload disabled via ENGINE_RELOAD_DIALPLAN=false
[InboundsService] Inbound 96857487... auto-published to engine after update
```
