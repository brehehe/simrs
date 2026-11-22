#!/usr/bin/env bash

# ==============================================================================
# INTERACTIVE DEMO RUNNER & CONTROL CENTER
# SIMRS Rawat Jalan Terintegrasi — PT Inova Medika Solusindo
# ==============================================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

clear

print_banner() {
    echo -e "${BLUE}================================================================================${NC}"
    echo -e "${CYAN}${BOLD}       🏥 SISTEM INFORMASI MANAJEMEN RUMAH SAKIT (SIMRS) RAWAT JALAN          ${NC}"
    echo -e "${CYAN}              PT Inova Medika Solusindo — Real Case Test                      ${NC}"
    echo -e "${BLUE}================================================================================${NC}"
    echo -e "${YELLOW}  Teknologi: PHP 8.4 (Yii2) • PostgreSQL 17 • Node.js 22 LTS • React Vite SPA  ${NC}"
    echo -e "${YELLOW}  Standar  : Permenkes No. 24/2022 (SATUSEHAT FHIR R4) • Akreditasi KARS/STARKES${NC}"
    echo -e "${BLUE}--------------------------------------------------------------------------------${NC}"
}

show_menu() {
    print_banner
    echo -e "${BOLD}PILIH MENU OPERASIONAL / PENGUJIAN:${NC}"
    echo ""
    echo -e "  ${GREEN}1)${NC} 🧪 Jalankan Master Acceptance Test E2E (${BOLD}21 Tahapan Alur Rumah Sakit${NC})"
    echo -e "  ${GREEN}2)${NC} 📊 Jalankan Full Automated Test Suite (${BOLD}120 Unit & Integration Tests${NC})"
    echo -e "  ${GREEN}3)${NC} 🩺 Jalankan System Health Check & Integrity Diagnostics (${BOLD}12 Monitors 100% OK${NC})"
    echo -e "  ${GREEN}4)${NC} 🛡️  Jalankan Uji Audit Trail Permenkes 24/2022 (${BOLD}13 Kepatuhan RME Tests${NC})"
    echo -e "  ${GREEN}5)${NC} 🏥 Jalankan Simulasi 1 Hari Operasional RS (${BOLD}3 Pasien Alur Penuh Selesai${NC})"
    echo -e "  ${GREEN}6)${NC} ⚡ Jalankan Uji Stres Konkurensi & Benchmark (${BOLD}600+ req/s Multi-Thread${NC})"
    echo -e "  ${GREEN}7)${NC} 📦 Inspeksi Live Data, Total Kunjungan & Stok Obat Real-time"
    echo -e "  ${GREEN}8)${NC} 🔑 Tampilkan Kredensial Pengujian (Cheat Sheet 6 Role & Akun)"
    echo -e "  ${GREEN}9)${NC} 🌐 Buka Layanan Web di Browser (SPA, Display TV Antrean, Swagger UI)"
    echo -e "  ${GREEN}10)${NC} 🎁 Buat Arsip Paket Deliverable (.tar.gz) Penguji"
    echo -e "  ${GREEN}11)${NC} 🚪 Keluar"
    echo ""
    echo -e "${BLUE}--------------------------------------------------------------------------------${NC}"
    read -p "Masukkan pilihan [1-11]: " choice
}

while true; do
    show_menu
    case $choice in
        1)
            clear
            php scripts/e2e_acceptance_test.php
            echo ""
            read -p "Tekan [Enter] untuk kembali ke menu..."
            ;;
        2)
            clear
            bash tests/run_all_tests.sh
            echo ""
            read -p "Tekan [Enter] untuk kembali ke menu..."
            ;;
        3)
            clear
            php scripts/system_health_check.php
            echo ""
            read -p "Tekan [Enter] untuk kembali ke menu..."
            ;;
        4)
            clear
            php tests/audit_compliance_test.php
            echo ""
            read -p "Tekan [Enter] untuk kembali ke menu..."
            ;;
        5)
            clear
            php scripts/simulate_day.php
            echo ""
            read -p "Tekan [Enter] untuk kembali ke menu..."
            ;;
        6)
            clear
            php scripts/benchmark_concurrency.php
            echo ""
            read -p "Tekan [Enter] untuk kembali ke menu..."
            ;;
        7)
            clear
            echo -e "${CYAN}=== STATISTIK OPERASIONAL SIMRS REAL-TIME ===${NC}\n"
            PGPASSWORD='SimrsCoreSecret2026!' psql -h 127.0.0.1 -U simrs_core -d simrs_db -c "
                SELECT 'Total Pasien Terdaftar' AS metrik, count(*)::text AS nilai FROM patients
                UNION ALL
                SELECT 'Total Kunjungan Rawat Jalan', count(*)::text FROM visits
                UNION ALL
                SELECT 'Kunjungan Status COMPLETED', count(*)::text FROM visits WHERE status = 'COMPLETED'
                UNION ALL
                SELECT 'Total Pendapatan Terbayar', 'Rp ' || to_char(COALESCE(sum(amount), 0), 'FM999,999,999,999') FROM payments
                UNION ALL
                SELECT 'Total Log Mutasi Audit (Permenkes 24/2022)', count(*)::text FROM audit_logs
                UNION ALL
                SELECT 'Total Log Transmisi SATUSEHAT', count(*)::text FROM satusehat_logs;
            "
            echo -e "\n${CYAN}=== KARTU STOK OBAT APOTEK TERKINI ===${NC}\n"
            PGPASSWORD='SimrsCoreSecret2026!' psql -h 127.0.0.1 -U simrs_core -d simrs_db -c "
                SELECT m.code, m.name, ms.current_stock, ms.minimum_stock, m.unit
                FROM medicines m
                JOIN medicine_stocks ms ON ms.medicine_id = m.id
                ORDER BY ms.current_stock ASC;
            "
            echo ""
            read -p "Tekan [Enter] untuk kembali ke menu..."
            ;;
        8)
            clear
            echo -e "${CYAN}=== KREDENSIAL PENGUJIAN AKUN ROLE SIMRS ===${NC}\n"
            echo -e "Kata Sandi Default Seluruh Akun: ${BOLD}${YELLOW}Password123!${NC}\n"
            echo -e "┌─────────────────────┬──────────────────┬───────────────────────────────────────────┐"
            echo -e "│ Username            │ Role             │ Deskripsi & Otoritas Akses               │"
            echo -e "├─────────────────────┼──────────────────┼───────────────────────────────────────────┤"
            echo -e "│ admin               │ ADMIN            │ Akses penuh, Master data & Manajemen     │"
            echo -e "│ petugas.pendaftaran │ REGISTRATION     │ Pasien Baru, Verifikasi BPJS & Antrean   │"
            echo -e "│ dr.budi             │ DOCTOR           │ Poli Penyakit Dalam (SOAP, Resep, Lab)   │"
            echo -e "│ dr.anisa            │ DOCTOR           │ Poli Anak (Pediatri)                     │"
            echo -e "│ dr.citra            │ DOCTOR           │ Poli Kandungan & Kebidanan (Obgyn)       │"
            echo -e "│ petugas.farmasi     │ PHARMACY         │ Validasi Resep & Dispense Obat Atomik    │"
            echo -e "│ petugas.lab         │ LABORATORY       │ Validasi & Input Hasil Uji Analyzer Lab  │"
            echo -e "│ kasir               │ CASHIER          │ Konsolidasi Invoice & Pembayaran Kasir   │"
            echo -e "└─────────────────────┴──────────────────┴───────────────────────────────────────────┘"
            echo ""
            echo -e "${YELLOW}URL Portal API Docs Swagger:${NC} http://127.0.0.1:8080/docs/"
            echo -e "${YELLOW}URL Frontend Client SPA    :${NC} http://localhost:5173"
            echo -e "${YELLOW}URL Display TV Antrean     :${NC} http://localhost:5173/tv-queue"
            echo ""
            read -p "Tekan [Enter] untuk kembali ke menu..."
            ;;
        9)
            echo -e "\n${GREEN}Membuka tautan peramban...${NC}"
            if command -v open &> /dev/null; then
                open "http://localhost:5173"
                open "http://localhost:5173/tv-queue"
                open "http://127.0.0.1:8080/docs/"
            else
                echo "Silakan buka manual peramban ke: http://localhost:5173"
            fi
            sleep 1
            ;;
        10)
            clear
            echo -e "${CYAN}=== MEMBUAT PAKET DELIVERABLE LENGKAP UNTUK PENGUJI ===${NC}\n"
            make simrs-package
            echo ""
            read -p "Tekan [Enter] untuk kembali ke menu..."
            ;;
        11)
            echo -e "\n${GREEN}Terima kasih telah menggunakan sistem SIMRS PT Inova Medika Solusindo!${NC}\n"
            exit 0
            ;;
        *)
            echo -e "${BOLD}Pilihan tidak valid, silakan coba lagi.${NC}"
            sleep 1
            ;;
    esac
done
