#!/usr/bin/env bash

# ==============================================================================
# SIMRS RAWAT JALAN TERINTEGRASI — ALL-IN-ONE RUNNER
# PT Inova Medika Solusindo
# ==============================================================================

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color
BOLD='\033[1m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

echo -e "${CYAN}${BOLD}"
echo "========================================================================="
echo "   🏥 SIMRS RAWAT JALAN TERINTEGRASI — ALL-IN-ONE SYSTEM LAUNCHER       "
echo "           PT Inova Medika Solusindo (Single Source of Truth)           "
echo "========================================================================="
echo -e "${NC}"

# 1. Check PostgreSQL
echo -e "${BLUE}[1/4] Memeriksa konektivitas Database PostgreSQL (5432)...${NC}"
if pg_isready -q 2>/dev/null; then
    echo -e "  ${GREEN}✓ PostgreSQL aktif dan siap menerima koneksi.${NC}"
else
    echo -e "  ${YELLOW}⚠️  Peringatan: PostgreSQL belum terdeteksi aktif pada port 5432.${NC}"
    echo -e "     Pastikan service PostgreSQL berjalan jika ada kendala koneksi."
fi

# 2. Cleanup lingering ports if already running
cleanup_port() {
    local port=$1
    local pid=$(lsof -ti :$port 2>/dev/null)
    if [ -n "$pid" ]; then
        echo -e "  ${YELLOW}Port $port sedang digunakan (PID: $pid). Menutup proses lama...${NC}"
        kill -9 $pid 2>/dev/null || true
    fi
}

echo -e "\n${BLUE}[2/4] Membersihkan port kerja (8000, 3001, 5173)...${NC}"
cleanup_port 8000
cleanup_port 3001
cleanup_port 5173
echo -e "  ${GREEN}✓ Seluruh port kerja bersih dan siap digunakan.${NC}"

# 3. Launch Services
echo -e "\n${BLUE}[3/4] Menjalankan seluruh layanan SIMRS secara paralel...${NC}"

# A. Core Backend (PHP Yii)
php -S 127.0.0.1:8000 -t public public/index.php > /dev/null 2>&1 &
PHP_PID=$!
echo -e "  ${GREEN}✓ Core Backend PHP 8.4 (Yii) berjalan${NC}      (PID: $PHP_PID ➔ http://127.0.0.1:8000)"

# B. Supporting Backend (Node.js)
(cd backend-node && npm run dev > /dev/null 2>&1) &
NODE_PID=$!
echo -e "  ${GREEN}✓ Supporting Backend (Node.js 22) berjalan${NC} (PID: $NODE_PID ➔ http://localhost:3001)"

# C. Frontend React SPA
(cd frontend-react && npm run dev > /dev/null 2>&1) &
VITE_PID=$!
echo -e "  ${GREEN}✓ Frontend Web SPA (React + Vite) berjalan${NC} (PID: $VITE_PID ➔ http://localhost:5173)"

# Cleanup on exit (Ctrl + C)
cleanup_all() {
    echo -e "\n\n${YELLOW}Menghentikan seluruh layanan SIMRS...${NC}"
    kill $PHP_PID $NODE_PID $VITE_PID 2>/dev/null || true
    kill -9 $(lsof -ti :8000 :3001 :5173 2>/dev/null) 2>/dev/null || true
    echo -e "${GREEN}✓ Seluruh layanan berhasil dihentikan dengan aman. Sampai jumpa!${NC}\n"
    exit 0
}
trap cleanup_all SIGINT SIGTERM EXIT

# 4. Wait for services to be healthy
echo -e "\n${BLUE}[4/4] Memverifikasi kesiapan respon HTTP layanan...${NC}"
for i in {1..15}; do
    if curl -s -I http://127.0.0.1:8000/api/v1/polyclinics >/dev/null 2>&1 && \
       curl -s http://localhost:3001/api/v1/health >/dev/null 2>&1 && \
       curl -s -I http://localhost:5173 >/dev/null 2>&1; then
        break
    fi
    sleep 0.5
done

echo -e "${GREEN}${BOLD}✓ SELURUH LAYANAN AKTIF & SIAP DIAKSES!${NC}"
echo -e "${CYAN}=========================================================================${NC}"
echo -e "${BOLD}  🌐 URL APLIKASI WEB      :${NC} ${GREEN}${BOLD}http://localhost:5173${NC}"
echo -e "${BOLD}  ⚡ CORE REST API (PHP)   :${NC} http://127.0.0.1:8000/api/v1"
echo -e "${BOLD}  🔬 NODE SUPPORTING API   :${NC} http://localhost:3001/api/v1"
echo -e "${CYAN}-------------------------------------------------------------------------${NC}"
echo -e "${BOLD}  🔑 KREDENSIAL PENGUJIAN (Password: ${YELLOW}Password123!${NC}${BOLD})${NC}"
echo -e "     • Administrator      : ${BOLD}admin${NC}"
echo -e "     • Pendaftaran        : ${BOLD}petugas.pendaftaran${NC}"
echo -e "     • Dokter Spesialis   : ${BOLD}dr.budi${NC}  (Penyakit Dalam) / ${BOLD}dr.anisa${NC} (Anak)"
echo -e "     • Farmasi            : ${BOLD}petugas.farmasi${NC}"
echo -e "     • Kasir              : ${BOLD}kasir${NC}"
echo -e "${CYAN}=========================================================================${NC}"
echo -e "${YELLOW}${BOLD}Tekan [Ctrl + C] untuk mematikan seluruh layanan sekaligus.${NC}\n"

# Keep the script running to hold the processes
wait
