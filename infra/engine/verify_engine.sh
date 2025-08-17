# use as mesmas credenciais que você quer no ESL
ESL_PASS="${ENGINE_ESL_PASSWORD:-ClueCon}"

# garanta o caminho correto
CONF="/usr/local/freeswitch/conf"
AUTO="$CONF/autoload_configs"

install -d -m 755 "$AUTO"

# event socket NA PASTA CERTA
cat >"$AUTO/event_socket.conf.xml" <<XML
<configuration name="event_socket.conf" description="Event Socket">
  <settings>
    <param name="listen-ip" value="127.0.0.1"/>
    <param name="listen-port" value="8021"/>
    <param name="password" value="${ESL_PASS}"/>
  </settings>
</configuration>
XML

# garanta mod_event_socket e mod_python3 no autoload
mods="$AUTO/modules.conf.xml"
if [ ! -f "$mods" ]; then
  cat >"$mods" <<'XML'
<configuration name="modules.conf" description="Modules">
  <modules>
    <load module="mod_logfile"/>
    <load module="mod_sofia"/>
    <load module="mod_event_socket"/>
    <load module="mod_dptools"/>
    <load module="mod_xml_cdr"/>
    <load module="mod_python3"/>
  </modules>
</configuration>
XML
else
  grep -q 'mod_event_socket' "$mods" || sed -i '/<\/modules>/i \ \ <load module="mod_event_socket"/>' "$mods"
  grep -q 'mod_python3' "$mods"    || sed -i '/<\/modules>/i \ \ <load module="mod_python3"/>' "$mods"
fi
