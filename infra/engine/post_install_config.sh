#!/usr/bin/env bash
set -euo pipefail
if [[ $EUID -ne 0 ]]; then echo "Please run as root" >&2; exit 1; fi
export DEBIAN_FRONTEND=noninteractive
ESL_PASS="${ENGINE_ESL_PASSWORD:-ClueCon}"
ACL_ALLOW="${ENGINE_ACL_ALLOW:-127.0.0.1/32}"
BASE="${ENGINE_FS_BASE_DIR:-/etc/freeswitch}"

mkdir -p "$BASE/autoload_configs"

cat >"$BASE/autoload_configs/event_socket.conf.xml" <<XML
<configuration name="event_socket.conf" description="Event Socket">
  <settings>
    <param name="listen-ip" value="127.0.0.1"/>
    <param name="listen-port" value="8021"/>
    <param name="password" value="${ESL_PASS}"/>
  </settings>
</configuration>
XML

cat >"$BASE/autoload_configs/acl.conf.xml" <<XML
<configuration name="acl.conf" description="Network Lists">
  <network-lists>
    <list name="lan" default="deny">
      <node type="allow" cidr="127.0.0.1/32"/>
      <node type="allow" cidr="${ACL_ALLOW}"/>
    </list>
  </network-lists>
</configuration>
XML

cat >"$BASE/autoload_configs/modules.conf.xml" <<XML
<configuration name="modules.conf" description="Modules">
  <modules>
    <load module="mod_logfile"/>
    <load module="mod_sofia"/>
    <load module="mod_event_socket"/>
    <load module="mod_dptools"/>
    <load module="mod_xml_cdr"/>
  </modules>
</configuration>
XML

# Reload configs and rescan
if command -v fs_cli >/dev/null 2>&1; then
  fs_cli -x reloadxml || true
  fs_cli -x "sofia profile external rescan reload" || true
fi

systemctl restart freeswitch || true

echo "[config] FreeSWITCH post-install configuration applied."
