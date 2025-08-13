#!/usr/bin/env bash
set -euo pipefail

# FreeSWITCH 1.10 (Debian 12) + mod_python + (libks2/mod_verto) sem mods opcionais que quebram build
# Evita repositório SignalWire (401), compila do source e cria serviço systemd

if [[ $(id -u) -ne 0 ]]; then echo "Por favor, execute como root" >&2; exit 1; fi
export DEBIAN_FRONTEND=noninteractive
export MAKEFLAGS="-j$(nproc)"

log(){ echo -e "\n[INFO] $*"; }
ok(){  echo -e "[OK]   $*"; }

# 0) limpar repo antigo
rm -f /etc/apt/sources.list.d/freeswitch.list || true

# 1) deps
log "Instalando dependências de compilação…"
apt-get update
apt-get install -y \
  git curl wget ca-certificates pkg-config build-essential autoconf automake libtool cmake ninja-build yasm \
  libssl-dev libcurl4-openssl-dev libpcre3-dev libedit-dev libxml2-dev libldns-dev \
  libsqlite3-dev libspeexdsp-dev libopus-dev libsndfile1-dev libmpg123-dev libmp3lame-dev \
  libvorbis-dev libogg-dev libtiff-dev libjpeg-dev libvpx-dev libavcodec-dev libavformat-dev libswscale-dev libfftw3-dev \
  uuid-dev unixodbc-dev libpq-dev liblua5.2-dev python3 python3-dev libpython3-dev \
  python3 python3-dev libpython3-dev python3-distutils python3-setuptools

echo "/usr/local/lib" >/etc/ld.so.conf.d/local.conf
ldconfig
export PKG_CONFIG_PATH=/usr/local/lib/pkgconfig:/usr/local/lib64/pkgconfig:${PKG_CONFIG_PATH:-}

SRC="/usr/src"; mkdir -p "$SRC"

# 2) spandsp3
if ! pkg-config --exists spandsp; then
  log "Compilando spandsp…"
  rm -rf "$SRC/spandsp"; git clone https://github.com/freeswitch/spandsp.git "$SRC/spandsp"
  cd "$SRC/spandsp"; ./bootstrap.sh -j; ./configure --prefix=/usr/local
  make; make install; ldconfig; ok "spandsp instalado."
else ok "spandsp já presente."; fi

# 3) sofia-sip >= 1.13.17
NEED_SOFIA=1
if pkg-config --exists sofia-sip-ua; then
  if pkg-config --modversion sofia-sip-ua | awk -F. '{ if ($1>1 || ($1==1 && $2>=13)) exit 0; else exit 1 }'; then NEED_SOFIA=0; fi
fi
if [[ $NEED_SOFIA -eq 1 ]]; then
  log "Compilando sofia-sip…"
  rm -rf "$SRC/sofia-sip"; git clone https://github.com/freeswitch/sofia-sip.git "$SRC/sofia-sip"
  cd "$SRC/sofia-sip"; ./bootstrap.sh -j; ./configure --prefix=/usr/local
  make; make install; ldconfig; ok "sofia-sip instalado/atualizado."
else ok "sofia-sip recente detectado."; fi

# 4) libks2 (para mod_verto)
if ! pkg-config --exists libks2 && ! pkg-config --exists libks; then
  log "Compilando libks2…"
  rm -rf "$SRC/libks"; git clone https://github.com/signalwire/libks.git "$SRC/libks"
  cd "$SRC/libks"
  cmake -B build -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/usr/local -DCMAKE_INSTALL_LIBDIR=lib
  cmake --build build
  cmake --install build
  ldconfig
  # alias opcional: alguns checks esperam 'libks'
  ln -sf /usr/local/lib/pkgconfig/libks2.pc /usr/local/lib/pkgconfig/libks.pc || true
  ok "libks2 instalado."
else ok "libks/libks2 já presente."; fi

# 5) FreeSWITCH
log "Obtendo FreeSWITCH v1.10…"
rm -rf "$SRC/freeswitch"; git clone -b v1.10 https://github.com/signalwire/freeswitch.git "$SRC/freeswitch"
cd "$SRC/freeswitch"

# modules.conf
cp -n modules.conf.in modules.conf
# habilitar mod_python
sed -i 's|^#\s*languages/mod_python|languages/mod_python|' modules.conf
# desativar módulos que frequentemente faltam deps
sed -i 's|^applications/mod_flite|#applications/mod_flite|' modules.conf
sed -i 's|^applications/mod_soundtouch|#applications/mod_soundtouch|' modules.conf
sed -i 's|^languages/mod_v8|#languages/mod_v8|' modules.conf
# desativar mod_signalwire (evita dependência do signalwire-client-c)
sed -i 's|^applications/mod_signalwire|#applications/mod_signalwire|' modules.conf
# manter mod_verto (libks2 já instalado)

# build
log "Bootstrap/configure…"
./bootstrap.sh -j
./configure --with-python=/usr/bin/python3

log "Compilando FreeSWITCH… (pode levar alguns minutos)"
make
make install
make sounds-install moh-install
make samples

# autoload mod_python
MODS_XML="/usr/local/freeswitch/conf/autoload_configs/modules.conf.xml"
if [[ -f "$MODS_XML" ]] && ! grep -q 'mod_python' "$MODS_XML"; then
  sed -i '/<\/modules>/i \ \ <load module="mod_python"/>' "$MODS_XML"
fi

# systemd
log "Criando serviço systemd…"
cat >/etc/systemd/system/freeswitch.service <<'EOF'
[Unit]
Description=FreeSWITCH
After=network.target

[Service]
User=root
Group=root
ExecStart=/usr/local/freeswitch/bin/freeswitch -nc -nonat
ExecReload=/usr/local/freeswitch/bin/fs_cli -x "reloadxml"
ExecStop=/usr/local/freeswitch/bin/fs_cli -x "shutdown"
Restart=always
LimitNOFILE=100000
LimitNPROC=60000

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable freeswitch
systemctl restart freeswitch || true

log "Status do serviço:"
systemctl --no-pager status freeswitch | cat || true

log "Verificando mod_python:"
/usr/local/freeswitch/bin/fs_cli -x 'show modules' | grep mod_python || true

ok "Instalação concluída."
