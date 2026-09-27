#!/usr/bin/env bash
# Instalador de NEXO para Ubuntu (VPS). Se puede correr las veces que quieras: también actualiza.
#   curl -fsSL https://raw.githubusercontent.com/Crownedcrazy-hue/Crazy-crowned-Black-/nexo/instalar.sh | bash
# Con cerebro de IA:
#   curl -fsSL https://raw.githubusercontent.com/Crownedcrazy-hue/Crazy-crowned-Black-/nexo/instalar.sh | OPENAI_API_KEY=sk-... bash
set -e
REPO="https://github.com/Crownedcrazy-hue/Crazy-crowned-Black-.git"
DIR="/opt/nexo"
SUDO=""; [ "$(id -u)" -ne 0 ] && SUDO="sudo"

echo "==> Revisando Node..."
NEED_NODE=1
if command -v node >/dev/null; then
  V=$(node -p 'const [a,b]=process.versions.node.split(".").map(Number); a>22||(a===22&&b>=13)?1:0')
  [ "$V" = "1" ] && NEED_NODE=0
fi
if [ "$NEED_NODE" = "1" ]; then
  echo "==> Instalando Node 22..."
  curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO bash -
  $SUDO apt-get install -y nodejs
fi
command -v git >/dev/null || $SUDO apt-get install -y git
command -v pm2 >/dev/null || $SUDO npm install -g pm2

echo "==> Bajando NEXO..."
if [ -d "$DIR/.git" ]; then
  $SUDO git -C "$DIR" fetch --depth 1 origin nexo && $SUDO git -C "$DIR" reset --hard origin/nexo
else
  $SUDO git clone --depth 1 -b nexo "$REPO" "$DIR"
fi
$SUDO chown -R "$(id -u):$(id -g)" "$DIR"
cd "$DIR"

if [ ! -f .env ]; then
  PORT=3000
  while (echo > /dev/tcp/127.0.0.1/$PORT) >/dev/null 2>&1; do PORT=$((PORT+1)); done
  cp .env.example .env
  sed -i "s/^PORT=.*/PORT=$PORT/" .env
  IP=$(curl -fsS4 https://api.ipify.org || hostname -I | awk '{print $1}')
  sed -i "s#^PUBLIC_URL=.*#PUBLIC_URL=http://$IP:$PORT#" .env
fi
if [ -n "$OPENAI_API_KEY" ]; then sed -i "s#^OPENAI_API_KEY=.*#OPENAI_API_KEY=$OPENAI_API_KEY#" .env; fi
PORT=$(grep '^PORT=' .env | cut -d= -f2)

echo "==> Levantando con PM2..."
if pm2 describe nexo >/dev/null 2>&1; then pm2 restart nexo --update-env; else pm2 start ecosystem.config.cjs; fi
pm2 save >/dev/null
if command -v ufw >/dev/null && $SUDO ufw status | grep -q "Status: active"; then $SUDO ufw allow "$PORT/tcp" >/dev/null; fi

sleep 2
URL=$(grep '^PUBLIC_URL=' .env | cut -d= -f2)
if curl -fsS "http://127.0.0.1:$PORT/api/config" >/dev/null; then
  echo ""
  echo "  ✅ NEXO está andando: $URL"
  echo "  Instrucciones para IAs: $URL/skill.md"
  grep -q '^OPENAI_API_KEY=.\+' .env && echo "  🧠 Cerebro de IA: activo" || echo "  🧠 Cerebro de IA: apagado (volvé a correr el comando con OPENAI_API_KEY=sk-... para activarlo)"
else
  echo "  ❌ No arrancó. Mirá el error con: pm2 logs nexo --lines 50"
fi
