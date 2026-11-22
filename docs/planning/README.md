# SIMRS Rawat Jalan Terintegrasi — Master Planning & Architectural Blueprint
**Perusahaan:** PT Inova Medika Solusindo  
**Proyek:** Real Case Test – Senior Programmer (72-Hour Delivery Target)  
**Dokumentasi:** Planning, Architecture, Database, State Machines, API Contract, UI/UX Design System & Implementation Strategy  

---

## 📌 Executive Summary

Dokumen ini merupakan master blueprint perencanaan dan arsitektur teknis untuk pembangunan **Sistem Informasi Manajemen Rumah Sakit (SIMRS) Rawat Jalan Terintegrasi**. Sistem ini dirancang untuk menangani seluruh proses pelayanan pasien rawat jalan secara end-to-end:
```
Pasien ➔ Pendaftaran & Antrean ➔ Pemeriksaan Dokter (EMR/SOAP) ➔ Diagnosis & Tindakan Medis 
       ➔ Resep Obat / Permintaan Lab ➔ Farmasi / Laboratorium ➔ Billing & Kasir ➔ Pembayaran & Invoice ➔ Riwayat Kunjungan
```

Pembangunan dilakukan dengan pendekatan **Enterprise-grade MVP (Minimum Viable Product)** dalam time-box 72 jam, berfokus pada **integritas data finansial/klinis**, **penanganan konkurensi tingkat tinggi (high concurrency)**, **keamanan berbasis RBAC & JWT**, **arsitektur modular monolith terintegrasi microservice pendukung**, serta **antarmuka frontend kelas enterprise modern yang sepenuhnya responsif di semua perangkat (mobile, tablet, desktop)**.

---

## 📂 Struktur Dokumen Perencanaan

Seluruh perencanaan teknis dipecah ke dalam 7 dokumen modular dan terstruktur di direktori ini:

| No | Dokumen | Fokus Utama |
|---|---|---|
| **01** | [01-requirements-and-scope.md](file:///Users/macbookair/Documents/website/SIMRS/SIMRS/docs/planning/01-requirements-and-scope.md) | Analisis kebutuhan, batasan MVP 72 jam, peran 6 user (RBAC Matrix), dan alur bisnis end-to-end. |
| **02** | [02-system-architecture.md](file:///Users/macbookair/Documents/website/SIMRS/SIMRS/docs/planning/02-system-architecture.md) | Arsitektur Modular Monolith (Yii) + Node.js Supporting Service + React Frontend, Diagram Mermaid, Clean Architecture & Service Layer. |
| **03** | [03-database-design-and-erd.md](file:///Users/macbookair/Documents/website/SIMRS/SIMRS/docs/planning/03-database-design-and-erd.md) | PostgreSQL Schema, Diagram ERD Mermaid lengkap, spesifikasi 30 tabel master s/d transaksional, indexing, constraints, & audit trail. |
| **04** | [04-state-machines-and-critical-cases.md](file:///Users/macbookair/Documents/website/SIMRS/SIMRS/docs/planning/04-state-machines-and-critical-cases.md) | Finite State Machine (Visit, Prescription, Lab, Invoice) & Solusi Teknis 6 Masalah Kritis (Double Registration, Stock Race, Double Payment, Post-invoice changes, Integration Failure, Query Optimization). |
| **05** | [05-api-contract-and-specifications.md](file:///Users/macbookair/Documents/website/SIMRS/SIMRS/docs/planning/05-api-contract-and-specifications.md) | Standarisasi JSON Response, Katalog lengkap REST API Yii Backend, Internal API, dan Node.js Integration/Dashboard Gateway. |
| **06** | [06-implementation-roadmap-72h.md](file:///Users/macbookair/Documents/website/SIMRS/SIMRS/docs/planning/06-implementation-roadmap-72h.md) | Rencana kerja jam-ke-jam (0-72h), struktur folder monorepo, 18 skenario pengujian verifikasi, dan checklist acceptance criteria. |
| **07** | [07-ui-ux-design-system-and-frontend.md](file:///Users/macbookair/Documents/website/SIMRS/SIMRS/docs/planning/07-ui-ux-design-system-and-frontend.md) | Desain UI/UX Healthcare Enterprise SaaS, responsif semua perangkat (Mobile 320px s/d Desktop 1440px+), integrasi skill (*ui-ux-pro-max, impeccable, baseline-ui, framer-motion, antislop*), motion variants, AppShell, dan spesifikasi 15 layar layanan. |

---

## 🛠️ Mandatory Technology Stack

- **Core Backend (Single Source of Truth):** PHP 8.x + Yii Framework (ActiveRecord, Migration, REST Controller, RBAC, DB Transactions)
- **Supporting Backend:** Node.js LTS + Express.js (Zod Validation, Error Handler, External Lab Integration Gateway, Read-Only Dashboard Aggregation via PostgreSQL SELECT user)
- **Frontend SPA:** React.js + Vite (TypeScript), Tailwind CSS, TanStack Query, React Hook Form + Zod, Recharts, Lucide Icons, Sonner Toast, Motion/React (Framer Motion v12+)
- **Database:** PostgreSQL 16+ (Foreign Keys, Partial Unique Indexes, Row-level Locking `FOR UPDATE`, Atomic Counter Sequences)
- **Testing & Tooling:** PHPUnit / Codeception, Supertest, Postman Collection & Environment, Docker Compose

---

## 🎨 Standar Desain UI/UX & Integrasi Skill

1. **ui-ux-pro-max:** Pola Healthcare Enterprise SaaS, warna dasar Teal `#0D9488` & Navy `#0F172A`, kepatuhan kontras rasio WCAG AA (4.5:1 untuk teks normal).
2. **impeccable:** Mode *"Operate"* (antarmuka kerja bervolume tinggi, scanability maksimal, minim friksi, hierarki informasi jelas).
3. **baseline-ui:** Larangan *AI UI Slop*, penggunaan Tailwind CSS murni, utility `cn` (`clsx` + `tailwind-merge`), primitif aksesibel, `h-dvh` (bukan `h-screen`), `safe-area-inset` untuk mobile, tidak memblokir *paste* pada input, dan animasi compositor di bawah 200ms.
4. **framer-motion (`motion/react`):** Transisi halus berbasis *opacity* dan *transform*, modal dialog entrance, drawer slide-in mobile, dan kepatuhan `prefers-reduced-motion`.
5. **antislop:** Desain manusiawi, touch target minimal **44x44px** di mobile, reflow tabel otomatis menjadi *card view* di layar kecil (< 640px), dan pencegahan overflow horizontal.

---

## 🎯 6 Masalah Kritis yang Dipecahkan Secara Arsitektural

1. **Duplikasi Pendaftaran Pasien:** Atomic queue counter table + Partial unique index `(patient_id, polyclinic_id, visit_date) WHERE status NOT IN ('CANCELLED')`.
2. **Konkurensi Stok Obat (Race Condition):** PostgreSQL Row-Level Locking (`SELECT FOR UPDATE`) dan conditional update atomik `WHERE current_stock >= :qty`.
3. **Pembayaran Ganda (Network Glitch):** Idempotency Key unik dengan unique constraint pada tabel `payments`, atomic balance update, and cached idempotent response.
4. **Perubahan Klinis Pasca-Invoice:** Snapshot harga historis immutable, invoice versioning, dan formal `invoice_adjustments` audit log.
5. **Kegagalan Integrasi Lab (Yii/Node.js):** Persistent Outbox/Inbox pattern, exponential backoff retry (1s, 2s, 4s, 8s), dan circuit breaker.
6. **Performa Sistem & Query N+1:** Eager loading `with()`, B-Tree composite indexing, database SQL aggregation untuk dashboard, dan EXPLAIN ANALYZE profiling.
