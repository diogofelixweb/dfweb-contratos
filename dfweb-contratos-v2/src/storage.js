// storage.js — persistência via localStorage (produção real)

const CONTRACTS_KEY = "dfweb_contracts_v2";
const SEQ_KEY       = "dfweb_seq_2026";

export function loadContracts() {
  try { return JSON.parse(localStorage.getItem(CONTRACTS_KEY) || "[]"); }
  catch { return []; }
}

export function saveContracts(list) {
  localStorage.setItem(CONTRACTS_KEY, JSON.stringify(list));
}

export function nextContractNumber() {
  const year = new Date().getFullYear();
  const seqKey = `dfweb_seq_${year}`;
  const seq = parseInt(localStorage.getItem(seqKey) || "0", 10) + 1;
  localStorage.setItem(seqKey, String(seq));
  return `DFW-${year}-${String(seq).padStart(5, "0")}`;
}

export function addContract(entry) {
  const list = loadContracts();
  const number = nextContractNumber();
  const full = {
    ...entry,
    contractNumber: number,
    id: Date.now(),
    createdAt: new Date().toISOString(),
    status: "ativo", // ativo | cancelado
    cancelReason: null,
    cancelledAt: null,
    adobeStatus: null,
    adobeAgreementId: null,
  };
  list.unshift(full);
  saveContracts(list);
  return full;
}

export function cancelContract(id, reason) {
  const list = loadContracts();
  const idx = list.findIndex(c => c.id === id);
  if (idx === -1) return;
  list[idx].status = "cancelado";
  list[idx].cancelReason = reason;
  list[idx].cancelledAt = new Date().toISOString();
  saveContracts(list);
  return list[idx];
}

export function updateAdobeStatus(id, status, agreementId) {
  const list = loadContracts();
  const idx = list.findIndex(c => c.id === id);
  if (idx === -1) return;
  list[idx].adobeStatus = status;
  if (agreementId) list[idx].adobeAgreementId = agreementId;
  saveContracts(list);
}
