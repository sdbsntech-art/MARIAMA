#!/bin/bash
echo "╔══════════════════════════════════════════╗"
echo "║   SoutenancePro  —  ESP-UCAD DSECG2     ║"
echo "╚══════════════════════════════════════════╝"
echo ""
cd "$(dirname "$0")"

echo "▶ Service sécurité Python (port 5000)..."
cd security && pip install -r requirements.txt -q && python3 main.py &
PYTHON_PID=$!
cd ..

sleep 2

echo "▶ Backend Node.js (port 3000)..."
cd backend && node server.js &
NODE_PID=$!
cd ..

sleep 2
echo ""
echo "✅ Application démarrée !"
echo "   Interface → http://localhost:3000"
echo "   Login     → admin / admin123"
echo ""
echo "Ctrl+C pour arrêter"
trap "kill $PYTHON_PID $NODE_PID 2>/dev/null; echo 'Arrêt.'" INT
wait
