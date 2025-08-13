#!/usr/bin/env bash
set -euo pipefail
if [[ $EUID -ne 0 ]]; then echo "Please run as root" >&2; exit 1; fi

systemctl is-active --quiet freeswitch && echo "[verify] freeswitch service: active" || (echo "[verify] freeswitch not active"; exit 1)
if command -v fs_cli >/dev/null 2>&1; then
  fs_cli -x status | head -n 5 | cat || true
  fs_cli -x "sofia xmlstatus" | head -n 20 | cat || true
fi
