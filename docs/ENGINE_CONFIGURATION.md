# FreeSWITCH Engine Configuration

## Environment Variables

### Basic Configuration
- `ENGINE_FS_BASE_DIR`: FreeSWITCH configuration directory (default: `/usr/local/freeswitch/conf`)
- `ENGINE_AUDIO_DIR`: Audio files directory (default: `/var/lib/freeswitch/storage/tenant`)
- `ENGINE_ESL_HOST`: ESL host (default: `127.0.0.1`)
- `ENGINE_ESL_PORT`: ESL port (default: `8021`)
- `ENGINE_ESL_PASSWORD`: ESL password (default: `ClueCon`)

### Dialplan Reload Control
- `ENGINE_RELOAD_DIALPLAN`: Control whether to reload dialplan after changes
  - `true` (default): Enable ESL reloadxml commands (production)
  - `false`: Disable ESL reloadxml commands (development/testing)

## Usage Examples

### Production (with reload)
```bash
export ENGINE_FS_BASE_DIR=/usr/local/freeswitch/conf
export ENGINE_RELOAD_DIALPLAN=true
# or leave ENGINE_RELOAD_DIALPLAN unset (defaults to true)
```

### Development/Testing (without reload)
```bash
export ENGINE_FS_BASE_DIR=/usr/local/freeswitch/conf
export ENGINE_RELOAD_DIALPLAN=false
```

### Recommended API Startup Command
```bash
cd apps/api && ENGINE_FS_BASE_DIR=/usr/local/freeswitch/conf ENGINE_RELOAD_DIALPLAN=false pnpm start:dev
```

## Why Disable Reload?

The `reloadxml` command can be slow and sometimes fail in certain FreeSWITCH configurations. Disabling it allows:

1. **Faster operations**: No waiting for dialplan reload
2. **More reliable**: Operations succeed even if reload fails
3. **Development friendly**: Test changes without affecting running calls

## Manual Reload

If you disable automatic reload, you can manually reload when needed:

```bash
# Via fs_cli
fs_cli -x "reloadxml"

# Or restart FreeSWITCH service
systemctl restart freeswitch
```

## Note

When `ENGINE_RELOAD_DIALPLAN=false`, the system will:
- ✅ Create/update configuration files
- ✅ Log operations as successful
- ⚠️ Skip ESL reloadxml commands
- ⚠️ Require manual reload for changes to take effect
