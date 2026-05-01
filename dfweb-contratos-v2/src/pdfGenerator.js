// pdfGenerator.js — gera PDF com identidade DFWeb
import { jsPDF } from "jspdf";

export async function generateContractPDF(contractText, form, serviceLabel, contractNumber) {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const W = 210, H = 297, M = 20;
  let y = 0;

  const newPage = () => { doc.addPage(); y = 30; };
  const check = (n = 10) => { if (y + n > H - 20) newPage(); };

  // ── Logo ──────────────────────────────────────────────────────────────────
  const logo = await fetch("/logodfweb.png")
    .then(r => r.blob())
    .then(b => new Promise(res => {
      const reader = new FileReader();
      reader.onload = () => res(reader.result);
      reader.readAsDataURL(b);
    }))
    .catch(() => null);

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFillColor(13, 15, 28);
  doc.rect(0, 0, W, 45, "F");
  doc.setFillColor(135, 75, 255);
  doc.rect(0, 43, W, 2, "F");

  if (logo) {
    try { doc.addImage(logo, "JPEG", M, 8, 52, 28, undefined, "FAST"); } catch {}
  }

  doc.setTextColor(214, 170, 248); doc.setFontSize(8); doc.setFont("helvetica", "normal");
  doc.text("CONTRATO DE PRESTAÇÃO DE SERVIÇOS", W - M, 14, { align: "right" });
  doc.setTextColor(102, 209, 239); doc.setFontSize(9); doc.setFont("helvetica", "bold");
  doc.text(serviceLabel.toUpperCase(), W - M, 22, { align: "right" });
  doc.setTextColor(235, 255, 112); doc.setFontSize(9.5); doc.setFont("helvetica", "bold");
  doc.text(contractNumber, W - M, 30, { align: "right" });
  doc.setTextColor(150, 150, 170); doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
  doc.text(`dfweb.com.br  |  ${new Date().toLocaleDateString("pt-BR")}`, W - M, 38, { align: "right" });

  y = 58;

  // ── Info badge ────────────────────────────────────────────────────────────
  doc.setFillColor(31, 35, 57);
  doc.roundedRect(M, y - 6, W - M * 2, 14, 3, 3, "F");
  doc.setTextColor(235, 255, 112); doc.setFontSize(8); doc.setFont("helvetica", "bold");
  doc.text(`Nº ${contractNumber}`, M + 6, y + 2);
  doc.setTextColor(150, 150, 170); doc.setFont("helvetica", "normal");
  doc.text(
    `Cliente: ${form.clientName}  |  Início: ${form.deadline}  |  R$ ${form.value}`,
    W - M - 4, y + 2, { align: "right" }
  );
  y += 22;

  // ── Body ──────────────────────────────────────────────────────────────────
  doc.setTextColor(40, 40, 60); doc.setFontSize(9.5); doc.setFont("helvetica", "normal");

  for (const line of contractText.split("\n")) {
    check(8);
    const t = line.trim();
    if (!t) { y += 3; continue; }

    const isTitle =
      /^CLÁUSULA|^CONTRATO|^ENTRE AS PARTES/i.test(t) ||
      (t === t.toUpperCase() && t.length > 4 && t.length < 80);

    if (isTitle) {
      check(14);
      doc.setFillColor(245, 244, 255);
      doc.rect(M - 2, y - 5, W - M * 2 + 4, 10, "F");
      doc.setDrawColor(153, 102, 255); doc.setLineWidth(0.5);
      doc.line(M - 2, y - 5, M - 2, y + 5);
      doc.setTextColor(135, 75, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
      const wrapped = doc.splitTextToSize(t, W - M * 2 - 6);
      doc.text(wrapped, M + 4, y);
      y += wrapped.length * 5.5 + 4;
      doc.setTextColor(40, 40, 60); doc.setFont("helvetica", "normal"); doc.setFontSize(9.5);
    } else {
      const wrapped = doc.splitTextToSize(t, W - M * 2);
      check(wrapped.length * 5 + 2);
      doc.text(wrapped, M, y);
      y += wrapped.length * 5 + 2;
    }
  }

  // ── Signature block ───────────────────────────────────────────────────────
  check(80); y += 10;
  doc.setFillColor(13, 15, 28);
  doc.rect(0, y - 4, W, 80, "F");

  doc.setTextColor(214, 170, 248); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
  doc.text("ASSINATURAS", W / 2, y + 4, { align: "center" });
  doc.setFillColor(135, 75, 255); doc.rect(W / 2 - 20, y + 6, 40, 0.5, "F");
  y += 16;

  const sigBox = (x, w, label, name, role) => {
    doc.setFillColor(25, 28, 45); doc.roundedRect(x, y, w, 44, 3, 3, "F");
    doc.setDrawColor(42, 45, 69); doc.setLineWidth(0.3);
    doc.roundedRect(x, y, w, 44, 3, 3, "S");
    doc.line(x + 8, y + 28, x + w - 8, y + 28);
    doc.setTextColor(150, 150, 170); doc.setFontSize(7); doc.setFont("helvetica", "normal");
    doc.text(label, x + w / 2, y + 34, { align: "center" });
    doc.setTextColor(220, 220, 240); doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    doc.text(name, x + w / 2, y + 40, { align: "center" });
    doc.setTextColor(102, 209, 239); doc.setFontSize(7); doc.setFont("helvetica", "normal");
    doc.text(role, x + w / 2, y + 45, { align: "center" });
  };
  const cW = (W - M * 2 - 8) / 2;
  sigBox(M, cW, "Contratante", form.clientName, form.clientResponsible || "Representante Legal");
  sigBox(M + cW + 8, cW, "Contratada", "DFWeb – Branding e Performance", "Diogo Felix – CPO");

  // Testemunhas
  y += 54;
  doc.setTextColor(100, 100, 130); doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
  doc.line(M, y + 10, M + (W - M * 2 - 8) / 2, y + 10);
  doc.text("Testemunha 1 – Nome / CPF", M, y + 15);
  doc.line(M + (W - M * 2 - 8) / 2 + 8, y + 10, W - M, y + 10);
  doc.text("Testemunha 2 – Nome / CPF", M + (W - M * 2 - 8) / 2 + 8, y + 15);

  // ── Footer & page numbers ─────────────────────────────────────────────────
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFillColor(13, 15, 28); doc.rect(0, H - 12, W, 12, "F");
    doc.setFillColor(135, 75, 255); doc.rect(0, H - 12, W, 0.8, "F");
    doc.setTextColor(80, 80, 110); doc.setFontSize(7);
    doc.text("DFWeb – Branding e Performance  |  dfweb.com.br", W / 2, H - 5, { align: "center" });
    doc.text(`Pág. ${i}/${total}`, W - M, H - 5, { align: "right" });
    doc.text(contractNumber, M, H - 5);
  }

  return doc;
}

export function pdfToBlob(doc) {
  return doc.output("blob");
}
