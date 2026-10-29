#!/bin/bash
# Guarda a chave do Supabase (só neste Mac) para o backup poder ler os dados.
# A chave é digitada com a tela "escondida" e fica em ~/.vekio-backup.env (permissão só sua).
set -e
cd "$(dirname "$0")/.."

CFG="$HOME/.vekio-backup.env"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

echo "Buscando o endereço do Supabase..."
npx vercel env pull "$TMP" --environment=production --yes >/dev/null 2>&1 || true
URL="$(grep '^NEXT_PUBLIC_SUPABASE_URL=' "$TMP" | cut -d= -f2- | tr -d '"' || true)"
URL_OK='^https://[a-z0-9]+\.supabase\.co$'

if ! [[ "$URL" =~ $URL_OK ]] && [ -f "$CFG" ]; then
  URL="$(grep '^SUPABASE_URL=' "$CFG" | cut -d= -f2- || true)"
fi

if ! [[ "$URL" =~ $URL_OK ]]; then
  read -r -p "Cole a Project URL do Supabase (https://xxxx.supabase.co): " URL
fi

echo
echo "No Supabase: Project Settings > API Keys > copie a chave 'service_role' (ou 'secret')."
read -r -s -p "Cole a chave aqui (não aparece na tela) e aperte Enter: " KEY
echo

if [ -z "$KEY" ]; then
  echo "Nenhuma chave colada. Nada foi salvo."
  exit 1
fi

umask 077
{
  echo "SUPABASE_URL=$URL"
  echo "SUPABASE_SERVICE_ROLE_KEY=$KEY"
} > "$CFG"
chmod 600 "$CFG"
echo "Chave salva em $CFG"
