// adobeSign.js — Adobe Sign REST API v6 integration

/**
 * HOW TO GET YOUR ADOBE SIGN API KEY:
 * 1. Acesse https://acrobat.adobe.com/br/pt/sign/developer.html
 * 2. Login com sua conta Adobe
 * 3. Vá em: Conta → API e Webhooks → Chave de integração
 * 4. Crie uma chave com permissões: AGREEMENT_WRITE, AGREEMENT_READ
 * 5. Cole a chave abaixo em VITE_ADOBE_SIGN_API_KEY no arquivo .env
 * 6. O BASE_URI varia por datacenter — verifique no painel (ex: api.na4.adobesign.com)
 *
 * .env:
 *   VITE_ADOBE_SIGN_API_KEY=your_integration_key_here
 *   VITE_ADOBE_SIGN_BASE_URI=https://api.na4.adobesign.com
 *   VITE_SENDER_EMAIL=diogo@dfweb.com.br
 */

const API_KEY  = import.meta.env.VITE_ADOBE_SIGN_API_KEY;
const BASE_URI = import.meta.env.VITE_ADOBE_SIGN_BASE_URI || "https://api.na4.adobesign.com";

function headers() {
  return {
    "Access-Token": API_KEY,
    "Content-Type": "application/json",
  };
}

/**
 * Upload PDF as transient document, then create agreement with reminder
 * @param {Blob}   pdfBlob      - PDF gerado pelo jsPDF
 * @param {string} signerEmail  - E-mail do signatário
 * @param {string} signerName   - Nome do signatário
 * @param {string} contractNum  - Número do contrato (ex: DFW-2026-00001)
 * @param {string} serviceLabel - Tipo de serviço
 * @param {string} message      - Mensagem para o cliente
 * @param {object} reminder     - { frequency: "DAILY_UNTIL_SIGNED"|"WEEKLY_UNTIL_SIGNED", firstReminderDelay: 1, note: "..." }
 */
export async function sendViaAdobeSign({
  pdfBlob,
  signerEmail,
  signerName,
  contractNum,
  serviceLabel,
  message,
  reminder = { frequency: "WEEKLY_UNTIL_SIGNED", firstReminderDelay: 1, note: "" },
}) {
  if (!API_KEY) throw new Error("VITE_ADOBE_SIGN_API_KEY não configurada no .env");

  // 1. Upload transient document
  const formData = new FormData();
  formData.append("File", pdfBlob, `Contrato_DFWeb_${contractNum}.pdf`);
  const uploadRes = await fetch(`${BASE_URI}/api/rest/v6/transientDocuments`, {
    method: "POST",
    headers: { "Access-Token": API_KEY },
    body: formData,
  });
  if (!uploadRes.ok) throw new Error(`Upload falhou: ${uploadRes.status}`);
  const { transientDocumentId } = await uploadRes.json();

  // 2. Create agreement
  const body = {
    fileInfos: [{ transientDocumentId }],
    name: `Contrato ${serviceLabel} – ${contractNum}`,
    participantSetsInfo: [
      {
        memberInfos: [{ email: signerEmail, name: signerName }],
        order: 1,
        role: "SIGNER",
      },
    ],
    signatureType: "ESIGN",
    state: "IN_PROCESS",
    message,
    reminderFrequency: reminder.frequency,
    // reminder note
    ...(reminder.note && { externalId: { id: contractNum, source: "DFWeb" } }),
  };

  const agreeRes = await fetch(`${BASE_URI}/api/rest/v6/agreements`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });
  if (!agreeRes.ok) {
    const err = await agreeRes.text();
    throw new Error(`Criação do acordo falhou: ${agreeRes.status} – ${err}`);
  }
  const { id: agreementId } = await agreeRes.json();

  // 3. Create reminder (separate endpoint for full control)
  if (reminder.firstReminderDelay >= 0) {
    const reminderBody = {
      agreementId,
      comment: reminder.note || `Lembrete: assine o contrato ${contractNum}`,
      status: "ACTIVE",
      firstReminderDelay: reminder.firstReminderDelay,
      frequency: reminder.frequency,
    };
    await fetch(`${BASE_URI}/api/rest/v6/reminders`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(reminderBody),
    }).catch(() => {}); // reminder fail não cancela o envio
  }

  return agreementId;
}
