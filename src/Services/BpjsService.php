<?php

declare(strict_types=1);

namespace App\Services;

use Exception;

/**
 * Service Simulasi Integrasi BPJS Kesehatan (VClaim 2.0 Web Service)
 * Surat Eligibilitas Peserta (SEP) dan Cek Kartu Peserta
 */
class BpjsService
{
    /**
     * Memeriksa status kepesertaan BPJS berdasarkan NIK atau No. Kartu BPJS
     */
    public function checkPeserta(string $identifier): array
    {
        $cleanId = trim($identifier);
        if (strlen($cleanId) < 10) {
            throw new Exception("Nomor kartu BPJS atau NIK minimal 10-16 digit.", 422);
        }

        $isNik = strlen($cleanId) === 16;
        $noKartu = $isNik ? '000' . substr($cleanId, 3, 10) : $cleanId;

        return [
            'peserta' => [
                'noKartu' => $noKartu,
                'nik' => $isNik ? $cleanId : '320101' . rand(1000000000, 9999999999),
                'nama' => 'PESERTA BPJS TERDAFTAR',
                'statusPeserta' => [
                    'kode' => '0',
                    'keterangan' => 'AKTIF',
                ],
                'jenisPeserta' => [
                    'kode' => '1',
                    'keterangan' => 'PEKERJA PENERIMA UPAH (PPU)',
                ],
                'hakKelas' => [
                    'kode' => '1',
                    'keterangan' => 'KELAS 1',
                ],
                'provUmum' => [
                    'kdProvider' => '0101U001',
                    'nmProvider' => 'PUSKESMAS TEBET / KLINIK PRATAMA',
                ],
                'tglLahir' => '1988-06-15',
                'sex' => 'L',
                'tglCetakKartu' => '2019-01-10',
                'umur' => [
                    'umurSekarang' => '37 tahun, 8 bulan',
                    'umurSaatPelayanan' => '37',
                ],
            ],
            'metaData' => [
                'code' => '200',
                'message' => 'Status Kepesertaan BPJS Valid dan Aktif.',
            ],
        ];
    }

    /**
     * Menerbitkan Surat Eligibilitas Peserta (SEP) Rawat Jalan
     */
    public function generateSep(array $data): array
    {
        if (empty($data['no_kartu']) || empty($data['polyclinic_name'])) {
            throw new Exception("No. Kartu BPJS dan Nama Poliklinik wajib diisi untuk penerbitan SEP.", 422);
        }

        $datePart = date('Ymd');
        $seq = sprintf('%06d', mt_rand(1000, 999999));
        $noSep = "0101R001{$datePart}B{$seq}";

        return [
            'sep' => [
                'noSep' => $noSep,
                'tglSep' => date('Y-m-d'),
                'jnsPelayanan' => 'Rawat Jalan',
                'kelasRawat' => $data['kelas_rawat'] ?? 'Kelas 1',
                'noKartu' => $data['no_kartu'],
                'namaPeserta' => $data['patient_name'] ?? 'Peserta BPJS',
                'poli' => $data['polyclinic_name'],
                'diagnosa' => $data['diagnosa_awal'] ?? 'Z00.0 - General medical examination',
                'catatan' => $data['catatan'] ?? 'Pelayanan Rawat Jalan Reguler',
                'penjamin' => 'BPJS Kesehatan',
            ],
            'metaData' => [
                'code' => '200',
                'message' => 'SEP Rawat Jalan Berhasil Diterbitkan Secara Otomatis.',
            ],
        ];
    }
}
