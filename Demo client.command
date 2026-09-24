#!/bin/bash
# =============================================================================
#  THE BLACK CAT — démo client
#  Double-cliquez ce fichier depuis le Finder.
#  Il démarre le site et le back-office, puis ouvre les trois fenêtres.
#  Pour tout arrêter : fermez cette fenêtre du Terminal, ou Ctrl-C.
# =============================================================================
cd "$(dirname "$0")" || exit 1

SITE_PORT=5174
CMS_PORT=3200

printf '\n  THE BLACK CAT — démo client\n'
printf '  ==============================\n\n'

# --- Nettoyage : on repart de ports libres ----------------------------------
for port in $SITE_PORT $CMS_PORT; do
  pid=$(lsof -nP -tiTCP:$port -sTCP:LISTEN 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "  • Port $port déjà occupé, on libère…"
    kill $pid 2>/dev/null
    sleep 1
  fi
done

# --- Le site ----------------------------------------------------------------
echo "  • Démarrage du site…"
node server.cjs > /tmp/blackcat-site.log 2>&1 &
SITE_PID=$!

# --- Le back-office ---------------------------------------------------------
echo "  • Démarrage du back-office (30 à 60 s au premier lancement)…"
( cd cms && LOGIN_TENANT=blackcat npm run dev > /tmp/blackcat-cms.log 2>&1 ) &
CMS_PID=$!

# Tout arrêter proprement à la fermeture
trap 'echo; echo "  Arrêt…"; kill $SITE_PID 2>/dev/null; pkill -f "next dev -p $CMS_PORT" 2>/dev/null; exit 0' INT TERM

# --- Attente : le site ------------------------------------------------------
for i in $(seq 1 20); do
  curl -s -o /dev/null -m 2 "http://localhost:$SITE_PORT/" && break
  sleep 1
done

# --- Attente : le back-office ----------------------------------------------
pret=0
for i in $(seq 1 90); do
  if curl -s -o /dev/null -m 2 "http://localhost:$CMS_PORT/api/health"; then pret=1; break; fi
  sleep 1
done

if [ "$pret" = "1" ]; then
  echo "  • Back-office prêt."
else
  echo "  ⚠ Le back-office n'a pas répondu. Voir /tmp/blackcat-cms.log"
fi

# --- Les trois fenêtres -----------------------------------------------------
echo
echo "  Ouverture des trois fenêtres :"
echo "    1. Le site           http://localhost:$SITE_PORT/"
open "http://localhost:$SITE_PORT/index.html"; sleep 1
echo "    2. Aperçu mobile     http://localhost:$SITE_PORT/apercu.html"
open "http://localhost:$SITE_PORT/apercu.html"; sleep 1
echo "    3. Back-office       http://localhost:$CMS_PORT/"
open "http://localhost:$CMS_PORT/"

cat <<TXT

  ---------------------------------------------------------------
  Connexion au back-office
    Le bar   : blackcat / blackcat-a-changer
    Agence   : agence   / agence-a-changer

  Autres pages utiles
    Le Bar     http://localhost:$SITE_PORT/le-bar.html
    La Carte   http://localhost:$SITE_PORT/carte.html
    Événements http://localhost:$SITE_PORT/evenement.html
    Réserver   http://localhost:$SITE_PORT/reserver.html

  Laissez cette fenêtre ouverte pendant la démonstration.
  Pour tout arrêter : fermez-la, ou Ctrl-C.
  ---------------------------------------------------------------

TXT

wait
