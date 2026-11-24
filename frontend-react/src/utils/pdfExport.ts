import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Standard Hospital Official Header
 */
export function addHospitalHeader(doc: jsPDF, title: string, subtitle?: string) {
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('RS INOVA MEDIKA SOLUSINDO', 14, 15);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text('Jl. Kesehatan No. 45, Jakarta Selatan 12430 | Telp: (021) 789-0123', 14, 20);
  doc.text('KEMENKES RI NO: 440/123/RS-B/2023 | Akreditasi Paripurna (STARKES)', 14, 24);

  doc.setDrawColor(13, 148, 136); // teal-600
  doc.setLineWidth(1);
  doc.line(14, 27, 196, 27);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 148, 136);
  doc.text(title, 14, 35);

  if (subtitle) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(subtitle, 14, 40);
  }
}

/**
 * Standard Running Footer with Page Numbers
 */
export function addPageNumbers(doc: jsPDF) {
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Dicetak otomatis oleh SIMRS Inova Medika Solusindo pada ${new Date().toLocaleString('id-ID')} | Halaman ${i} dari ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }
}

/**
 * Export generic tabular report data to PDF
 */
export function exportTableToPdf(
  title: string,
  columns: string[],
  rows: (string | number)[][],
  fileName: string,
  subtitle?: string
) {
  const doc = new jsPDF();
  addHospitalHeader(doc, title, subtitle);

  autoTable(doc, {
    startY: subtitle ? 44 : 39,
    head: [columns],
    body: rows,
    theme: 'grid',
    headStyles: {
      fillColor: [13, 148, 136],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      textColor: [51, 65, 85],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  addPageNumbers(doc);
  doc.save(`${fileName}.pdf`);
}

/**
 * Export Official Cashier Payment Receipt PDF (A5 Format)
 */
export function exportReceiptToPdf(receipt: any) {
  const doc = new jsPDF({
    format: [148, 210], // A5 size
  });

  // Header
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(13, 148, 136);
  doc.text('RS INOVA MEDIKA SOLUSINDO', 10, 12);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('Instalasi Rawat Jalan & Kasir Sentral | Telp: (021) 789-0123', 10, 16);
  doc.setDrawColor(203, 213, 225);
  doc.line(10, 19, 138, 19);

  // Title
  doc.setFontSize(10.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('BUKTI PEMBAYARAN RAWAT JALAN (KUITANSI)', 10, 26);
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`No. Kuitansi: ${receipt.receipt_number || receipt.payment_number || '-'}`, 10, 31);
  doc.text(`Waktu Bayar: ${receipt.paid_at || new Date().toLocaleString('id-ID')}`, 10, 35);

  // Patient Info
  autoTable(doc, {
    startY: 38,
    body: [
      ['No. Rekam Medis', `: ${receipt.patient?.mr_number || receipt.mr_number || '-'}`],
      ['Nama Pasien', `: ${receipt.patient?.name || receipt.patient_name || '-'}`],
      ['No. Tagihan (Invoice)', `: ${receipt.invoice?.invoice_number || receipt.invoice_number || '-'}`],
      ['Metode Pembayaran', `: ${receipt.payment_method || 'CASH'}`],
    ],
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1 },
    columnStyles: { 0: { cellWidth: 38, fontStyle: 'bold' } },
  });

  const curY = (doc as any).lastAutoTable.finalY + 3;

  // Breakdown items if available
  const items = receipt.invoice?.items || [];
  if (items.length > 0) {
    autoTable(doc, {
      startY: curY,
      head: [['Komponen Biaya Pelayanan', 'Tarif Subtotal']],
      body: items.map((it: any) => [
        it.item_name,
        `Rp ${(Number(it.subtotal) || 0).toLocaleString('id-ID')}`,
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        fontSize: 7.5,
      },
      styles: { fontSize: 7.5, cellPadding: 2 },
    });
  }

  const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 4 : curY + 4;

  // Total summary
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  const paidVal = Number(receipt.amount_paid || receipt.amount) || 0;
  const cashRcv = Number(receipt.cash_received || receipt.amount_paid || receipt.amount) || 0;
  const changeVal = Number(receipt.change_amount) || 0;

  doc.text(
    `TOTAL DIBAYAR : Rp ${paidVal.toLocaleString('id-ID')}`,
    10,
    finalY
  );
  if (changeVal > 0 || cashRcv > paidVal) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(
      `Nominal Diterima : Rp ${cashRcv.toLocaleString('id-ID')} | Uang Kembalian : Rp ${changeVal.toLocaleString('id-ID')}`,
      10,
      finalY + 4
    );
  }

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(
    `Petugas Kasir: ${receipt.cashier_name || 'Kasir SIMRS'} | Status: LUNAS (SETTLED)`,
    10,
    finalY + 5
  );
  doc.text(
    'Terima kasih atas kepercayaan Anda berobat di RS Inova Medika Solusindo.',
    10,
    finalY + 10
  );

  doc.save(`Kuitansi_${receipt.receipt_number || receipt.payment_number || 'SIMRS'}.pdf`);
}

/**
 * Export Official Resume Medis Rawat Jalan PDF
 */
export function exportResumeMedisToPdf(data: any) {
  const doc = new jsPDF();
  addHospitalHeader(
    doc,
    'RINGKASAN PULANG RAWAT JALAN (RESUME MEDIS)',
    `No. Dokumen: ${data.document_number} | Dicetak: ${data.created_at}`
  );

  // Patient demographic table
  autoTable(doc, {
    startY: 44,
    body: [
      ['No. RM', `: ${data.patient?.mr_number}`, 'Tgl Pelayanan', `: ${data.visit?.visit_date}`],
      ['Nama Pasien', `: ${data.patient?.full_name}`, 'Poliklinik', `: ${data.visit?.polyclinic}`],
      ['NIK', `: ${data.patient?.nik}`, 'Dokter DPJP', `: ${data.visit?.doctor_dpjp}`],
      [
        'Tgl Lahir / Usia',
        `: ${data.patient?.birth_date} (${data.patient?.age_years} Thn)`,
        'No. SIP DPJP',
        `: ${data.visit?.sip_number}`,
      ],
    ],
    theme: 'plain',
    styles: { fontSize: 8, cellPadding: 1 },
    columnStyles: {
      0: { cellWidth: 28, fontStyle: 'bold' },
      2: { cellWidth: 28, fontStyle: 'bold' },
    },
  });

  let curY = (doc as any).lastAutoTable.finalY + 4;

  // Clinical findings / SOAP
  autoTable(doc, {
    startY: curY,
    head: [['RINGKASAN PEMERIKSAAN KLINIS (SOAP)']],
    body: [
      [`Keluhan Utama : ${data.clinical_findings?.chief_complaint || '-'}`],
      [`Anamnesis : ${data.clinical_findings?.anamnesis || '-'}`],
      [
        `Tanda Vital : TD: ${data.clinical_findings?.vital_signs?.blood_pressure || '-'}, HR: ${
          data.clinical_findings?.vital_signs?.heart_rate || '-'
        }, RR: ${data.clinical_findings?.vital_signs?.respiratory_rate || '-'}, Suhu: ${
          data.clinical_findings?.vital_signs?.temperature || '-'
        }`,
      ],
      [`Pemeriksaan Fisik : ${data.clinical_findings?.physical_examination || '-'}`],
      [`Catatan Dokter : ${data.clinical_findings?.doctor_notes || '-'}`],
    ],
    theme: 'grid',
    headStyles: {
      fillColor: [13, 148, 136],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: { fontSize: 8, cellPadding: 2 },
  });

  curY = (doc as any).lastAutoTable.finalY + 4;

  // Diagnoses & Therapy table
  const diagText =
    (data.diagnoses || []).map((d: any) => `[${d.type}] ${d.code} - ${d.name}`).join('\n') || '-';
  const procText =
    (data.procedures || []).map((p: any) => `${p.name} (${p.quantity}x)`).join('\n') || '-';
  const rxText =
    (data.prescriptions || [])
      .map((r: any) => `${r.name} - ${r.dosage} (${r.frequency})`)
      .join('\n') || '-';

  autoTable(doc, {
    startY: curY,
    head: [['Diagnosis ICD-10', 'Tindakan Medis', 'Terapi / Resep Obat']],
    body: [[diagText, procText, rxText]],
    theme: 'grid',
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontStyle: 'bold',
      fontSize: 8,
    },
    styles: { fontSize: 7.5, cellPadding: 2.5 },
  });

  curY = (doc as any).lastAutoTable.finalY + 6;

  // Discharge plan and Digital Signature
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Rencana Tindak Lanjut: ${data.discharge_plan?.condition || 'Membaik / Boleh Pulang'} | Kontrol: ${
      data.discharge_plan?.follow_up_date || '-'
    }`,
    14,
    curY
  );
  doc.text(
    `Edukasi Pasien: ${data.discharge_plan?.education || 'Minum obat teratur dan istirahat cukup.'}`,
    14,
    curY + 4
  );

  doc.setFont('helvetica', 'bold');
  doc.text('Dokter Penanggung Jawab Pelayanan (DPJP)', 130, curY + 12);
  doc.setFont('helvetica', 'normal');
  doc.text('(Tanda Tangan Elektronik Terverifikasi)', 130, curY + 16);
  doc.setFont('helvetica', 'bold');
  doc.text(
    data.digital_signature?.doctor_name || data.visit?.doctor_dpjp || 'dr. DPJP, Sp.PD',
    130,
    curY + 28
  );
  doc.setFont('helvetica', 'normal');
  doc.text(
    `SIP: ${data.digital_signature?.sip_number || data.visit?.sip_number || '-'}`,
    130,
    curY + 32
  );

  addPageNumbers(doc);
  doc.save(`Resume_Medis_${data.patient?.mr_number || 'Pasien'}.pdf`);
}
