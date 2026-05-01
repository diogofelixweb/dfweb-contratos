import { useState, useEffect } from "react";
import { loadContracts, addContract, cancelContract, updateAdobeStatus } from "./storage.js";
// ── Configurações DFWeb (contratada) ─────────────────────────────────────────
const DFWEB_DEFAULTS = {
  razaoSocial: "DFWeb – Branding e Performance",
  cnpj: "00.000.000/0001-00",
  endereco: "Icaraí, Niterói – RJ",
  responsavel: "Diogo Felix",
  cargo: "CPO",
  email: "contato@dfweb.com.br",
  site: "dfweb.com.br",
};
function loadSettings(){try{return JSON.parse(localStorage.getItem("dfweb_settings")||"null")||DFWEB_DEFAULTS;}catch{return DFWEB_DEFAULTS;}}
function saveSettings(s){localStorage.setItem("dfweb_settings",JSON.stringify(s));}

import { generateContractPDF, pdfToBlob } from "./pdfGenerator.js";
import { sendViaAdobeSign } from "./adobeSign.js";

const C = {
  bg:"#0d0f1c",card:"#131522",border:"#1F2339",border2:"#2a2d45",
  purple:"#9966FF",dark:"#874BFF",light:"#D6AAF8",cyan:"#66D1EF",yellow:"#EBFF70",red:"#e74c3c"
};
const SERVICES=[
  {id:"trafego",label:"Gestao de Trafego",icon:"📈"},
  {id:"social",label:"Social Media / Conteudo",icon:"📱"},
  {id:"branding",label:"Branding / Identidade Visual",icon:"🎨"},
  {id:"web",label:"Desenvolvimento Web",icon:"💻"},
  {id:"consultoria",label:"Consultoria / Estrategia",icon:"🧠"},
];
const STEPS=["Servico","Cliente","Escopo","Financeiro","Revisar"];
const EMPTY={service:"",clientName:"",clientCnpj:"",clientAddress:"",clientEmail:"",clientPhone:"",clientResponsible:"",scope:"",deliverables:"",deadline:"",contractDuration:"12",value:"",paymentDay:"5",paymentMethod:"pix",readjustment:"IGPM",penalty:"20"};
const INP={width:"100%",background:"#0a0c17",border:`1px solid ${C.border2}`,borderRadius:8,padding:"10px 14px",color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};
const LBL={display:"block",fontSize:11,color:C.light,marginBottom:5,fontWeight:700,textTransform:"uppercase",letterSpacing:1};

function Field({label,value,onChange,placeholder,required,rows,half}){
  return(
    <div style={{marginBottom:14,gridColumn:half?"auto":"1 / -1"}}>
      <label style={LBL}>{label}{required&&<span style={{color:C.purple}}> *</span>}</label>
      {rows?<textarea value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{...INP,resize:"vertical",lineHeight:1.6}} onFocus={e=>e.target.style.borderColor=C.purple} onBlur={e=>e.target.style.borderColor=C.border2}/>:<input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={INP} onFocus={e=>e.target.style.borderColor=C.purple} onBlur={e=>e.target.style.borderColor=C.border2}/>}
    </div>
  );
}
function Sel({label,value,onChange,options,half}){
  return(
    <div style={{marginBottom:14,gridColumn:half?"auto":"1 / -1"}}>
      <label style={LBL}>{label}</label>
      <select value={value} onChange={e=>onChange(e.target.value)} style={{...INP}}>
        {options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}
function StepBar({cur}){
  return(
    <div style={{display:"flex",alignItems:"center",marginBottom:36}}>
      {STEPS.map((s,i)=>(
        <div key={s} style={{display:"flex",alignItems:"center",flex:i<STEPS.length-1?1:"none"}}>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
            <div style={{width:28,height:28,borderRadius:"50%",background:i<cur?C.purple:i===cur?C.dark:C.border,border:`2px solid ${i<=cur?C.purple:C.border2}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:i<=cur?"#fff":"#555",boxShadow:i===cur?`0 0 12px ${C.purple}66`:"none"}}>
              {i<cur?"✓":i+1}
            </div>
            <span style={{fontSize:10,color:i===cur?C.light:"#444",whiteSpace:"nowrap"}}>{s}</span>
          </div>
          {i<STEPS.length-1&&<div style={{flex:1,height:1,background:i<cur?C.purple:C.border2,margin:"0 4px",marginBottom:16}}/>}
        </div>
      ))}
    </div>
  );
}
function Badge({status}){
  const cfg={ativo:{bg:"#1a2a1a",color:"#6fcf6f",border:"#2a4a2a",l:"● Ativo"},cancelado:{bg:"#2a1a1a",color:C.red,border:"#4a2a2a",l:"✕ Cancelado"},pendente:{bg:"#2a2416",color:C.yellow,border:"#4a3a16",l:"◌ Aguardando"}};
  const s=cfg[status]||cfg.ativo;
  return <span style={{fontSize:11,padding:"3px 9px",background:s.bg,borderRadius:6,color:s.color,border:`1px solid ${s.border}`}}>{s.l}</span>;
}

function CancelModal({contract,onClose,onConfirm}){
  const [reason,setReason]=useState("");
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.card,border:"1px solid #4a2a2a",borderRadius:16,padding:28,width:"100%",maxWidth:420}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
          <div style={{width:40,height:40,borderRadius:10,background:"#2a1a1a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>⚠️</div>
          <div>
            <h3 style={{margin:0,fontSize:15,fontWeight:700}}>Cancelar Contrato</h3>
            <p style={{margin:0,fontSize:12,color:"#888"}}>{contract.contractNumber} · {contract.clientName}</p>
          </div>
        </div>
        <p style={{color:"#888",fontSize:13,lineHeight:1.6,marginBottom:16}}>Esta acao e irreversivel. O contrato sera marcado como <strong style={{color:C.red}}>Cancelado</strong>.</p>
        <div style={{marginBottom:18}}>
          <label style={LBL}>Motivo do cancelamento *</label>
          <textarea value={reason} onChange={e=>setReason(e.target.value)} placeholder="Ex: Erro no valor, cliente solicitou revisao..." rows={3} style={{...INP,resize:"vertical",lineHeight:1.6}} onFocus={e=>e.target.style.borderColor=C.red} onBlur={e=>e.target.style.borderColor=C.border2}/>
        </div>
        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{flex:1,background:C.border,border:`1px solid ${C.border2}`,borderRadius:10,padding:12,color:"#888",fontSize:14,cursor:"pointer"}}>Voltar</button>
          <button onClick={()=>reason.trim()&&onConfirm(reason)} disabled={!reason.trim()} style={{flex:1,background:reason.trim()?"linear-gradient(135deg,#c0392b,#e74c3c)":"#2a1a1a",border:"none",borderRadius:10,padding:12,color:reason.trim()?"#fff":"#555",fontSize:14,fontWeight:700,cursor:reason.trim()?"pointer":"default"}}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

function AdobeModal({contract,contractText,form,serviceLabel,onClose,onSent}){
  const [email,setEmail]=useState(form.clientEmail||"");
  const [name,setName]=useState(form.clientName||"");
  const [msg,setMsg]=useState(`Ola ${form.clientName},\n\nSegue o contrato ${contract?.contractNumber||""} para revisao e assinatura.\n\nAbracos,\nDiogo Felix - DFWeb`);
  const [freq,setFreq]=useState("WEEKLY_UNTIL_SIGNED");
  const [delay,setDelay]=useState("1");
  const [note,setNote]=useState("Lembrete: o contrato aguarda sua assinatura.");
  const [loading,setLoad]=useState(false);
  const [done,setDone]=useState(false);
  const [err,setErr]=useState("");
  const send=async()=>{
    setLoad(true);setErr("");
    try{
      const doc=await generateContractPDF(contractText,form,serviceLabel,contract?.contractNumber||"DFW-TEMP");
      const blob=pdfToBlob(doc);
      const agreementId=await sendViaAdobeSign({pdfBlob:blob,signerEmail:email,signerName:name,contractNum:contract?.contractNumber||"",serviceLabel,message:msg,reminder:{frequency:freq,firstReminderDelay:parseInt(delay),note}});
      updateAdobeStatus(contract?.id,"Aguardando assinatura",agreementId);
      setDone(true);
      setTimeout(()=>{onSent();onClose();},1800);
    }catch(e){setErr(e.message||"Erro. Verifique VITE_ADOBE_SIGN_API_KEY no .env");}
    setLoad(false);
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflowY:"auto"}}>
      <div style={{background:C.card,border:`1px solid ${C.border2}`,borderRadius:16,padding:28,width:"100%",maxWidth:500,margin:"auto"}}>
        {!done?<>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:22}}>
            <div style={{width:40,height:40,borderRadius:10,background:"linear-gradient(135deg,#e83e3e,#ff6b35)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>✍</div>
            <div><h3 style={{margin:0,fontSize:15,fontWeight:700}}>Enviar via Adobe Sign</h3><p style={{margin:0,fontSize:12,color:"#555"}}>{contract?.contractNumber}</p></div>
            <button onClick={onClose} style={{marginLeft:"auto",background:"none",border:"none",color:"#555",fontSize:18,cursor:"pointer"}}>✕</button>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
            <Field label="E-mail Signatario *" value={email} onChange={setEmail} placeholder="cliente@empresa.com.br" required/>
            <Field label="Nome Signatario" value={name} onChange={setName} placeholder="Nome completo" half/>
          </div>
          <Field label="Mensagem" value={msg} onChange={setMsg} rows={4}/>
          <div style={{background:"#0a0c17",border:`1px solid ${C.border}`,borderRadius:10,padding:16,marginBottom:16}}>
            <p style={{margin:"0 0 12px",fontSize:12,color:C.light,fontWeight:700,textTransform:"uppercase",letterSpacing:1}}>Lembrete de Assinatura</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
              <Sel label="Frequencia" value={freq} onChange={setFreq} half options={[{v:"DAILY_UNTIL_SIGNED",l:"Diario"},{v:"WEEKLY_UNTIL_SIGNED",l:"Semanal"},{v:"WEEKDAILY_UNTIL_SIGNED",l:"Dias uteis"}]}/>
              <Sel label="1o lembrete apos" value={delay} onChange={setDelay} half options={[{v:"0",l:"Imediato"},{v:"1",l:"1 dia"},{v:"2",l:"2 dias"},{v:"3",l:"3 dias"},{v:"7",l:"1 semana"}]}/>
            </div>
            <Field label="Texto do lembrete" value={note} onChange={setNote} placeholder="Mensagem do lembrete..."/>
          </div>
          {err&&<p style={{color:C.red,fontSize:13,marginBottom:14,background:"#2a1a1a",padding:"10px 14px",borderRadius:8}}>{err}</p>}
          <div style={{background:"#1a1f35",borderRadius:8,padding:10,marginBottom:16,fontSize:12,color:"#555",lineHeight:1.6}}>Configure VITE_ADOBE_SIGN_API_KEY no .env para envio real.</div>
          <button onClick={send} disabled={!email||loading} style={{width:"100%",background:loading?"#333":"linear-gradient(135deg,#c0392b,#e74c3c)",border:"none",borderRadius:10,padding:14,color:"#fff",fontSize:15,fontWeight:700,cursor:email&&!loading?"pointer":"default",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
            {loading?<><span style={{width:16,height:16,borderRadius:"50%",border:"2px solid #666",borderTopColor:"#fff",display:"inline-block",animation:"spin 0.7s linear infinite"}}/>Enviando...</>:"✉ Enviar para Assinatura"}
          </button>
        </>:<div style={{textAlign:"center",padding:"24px 0"}}><div style={{fontSize:52,marginBottom:14}}>✅</div><h3 style={{fontSize:17,fontWeight:700,marginBottom:6}}>Enviado!</h3><p style={{color:"#555",fontSize:13}}>{email} recebera o contrato e lembretes.</p></div>}
      </div>
    </div>
  );
}

function ContractDetail({contract,onClose,onCancel,onAdobeOpen}){
  const svc=SERVICES.find(s=>s.id===contract.service);
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:200,display:"flex",justifyContent:"flex-end"}}>
      <div style={{width:"min(520px,100vw)",background:C.card,borderLeft:`1px solid ${C.border2}`,display:"flex",flexDirection:"column",height:"100%",overflowY:"auto"}}>
        <div style={{padding:"22px 22px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:12,color:C.cyan,fontWeight:700,marginBottom:4}}>{contract.contractNumber}</div>
            <h2 style={{margin:"0 0 6px",fontSize:17,fontWeight:800}}>{contract.clientName}</h2>
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <Badge status={contract.status}/>
              <span style={{fontSize:12,color:"#555"}}>{svc?.icon} {svc?.label}</span>
            </div>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#555",fontSize:20,cursor:"pointer",flexShrink:0}}>✕</button>
        </div>
        <div style={{padding:"18px 22px",flex:1}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:20}}>
            {[["Valor",`R$ ${contract.value}`],["Duracao",`${contract.contractDuration} meses`],["Vencimento",`Dia ${contract.paymentDay}`],["Pagamento",contract.paymentMethod?.toUpperCase()],["Inicio",contract.deadline],["Emitido",new Date(contract.createdAt).toLocaleDateString("pt-BR")]].map(([k,v])=>(
              <div key={k} style={{background:C.bg,borderRadius:8,padding:"10px 12px"}}>
                <div style={{fontSize:10,color:"#555",textTransform:"uppercase",letterSpacing:1,marginBottom:3}}>{k}</div>
                <div style={{fontSize:14,fontWeight:700,color:"#fff"}}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{marginBottom:16}}>
            <div style={{fontSize:11,color:C.light,textTransform:"uppercase",letterSpacing:1,marginBottom:6,fontWeight:700}}>Escopo</div>
            <div style={{background:C.bg,borderRadius:8,padding:"12px 14px",fontSize:13,color:"#bbb",lineHeight:1.7}}>{contract.scope}</div>
          </div>
          {contract.status==="cancelado"&&(
            <div style={{background:"#2a1a1a",border:"1px solid #4a2a2a",borderRadius:10,padding:"12px 14px",marginBottom:16}}>
              <div style={{fontSize:11,color:C.red,textTransform:"uppercase",letterSpacing:1,fontWeight:700,marginBottom:6}}>Motivo do Cancelamento</div>
              <div style={{fontSize:13,color:"#e88"}}>{contract.cancelReason}</div>
              <div style={{fontSize:11,color:"#555",marginTop:6}}>{new Date(contract.cancelledAt).toLocaleString("pt-BR")}</div>
            </div>
          )}
          {contract.adobeStatus&&(
            <div style={{background:"#1a2a1a",border:"1px solid #2a4a2a",borderRadius:10,padding:"12px 14px",marginBottom:16}}>
              <div style={{fontSize:11,color:"#6fcf6f",textTransform:"uppercase",letterSpacing:1,fontWeight:700,marginBottom:4}}>Adobe Sign</div>
              <div style={{fontSize:13,color:"#aaa"}}>{contract.adobeStatus}</div>
            </div>
          )}
          {contract.status==="ativo"&&(
            <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:8}}>
              <button onClick={onAdobeOpen} style={{flex:"1 1 160px",background:"linear-gradient(135deg,#c0392b,#e74c3c)",border:"none",borderRadius:10,padding:"12px",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>✍ Adobe Sign</button>
              <button onClick={onCancel} style={{flex:"1 1 120px",background:"#2a1a1a",border:"1px solid #4a2a2a",borderRadius:10,padding:"12px",color:C.red,fontSize:14,cursor:"pointer"}}>Cancelar Contrato</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


function SettingsPanel({onClose}){
  const [s,setS]=useState(loadSettings());
  const upd=k=>v=>setS(p=>({...p,[k]:v}));
  const save=()=>{saveSettings(s);onClose();};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:C.card,border:`1px solid ${C.border2}`,borderRadius:16,padding:28,width:"100%",maxWidth:500,maxHeight:"90vh",overflowY:"auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:24}}>
          <div style={{width:40,height:40,borderRadius:10,background:`linear-gradient(135deg,${C.dark},${C.purple})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>⚙️</div>
          <div><h3 style={{margin:0,fontSize:16,fontWeight:700}}>Dados da Contratada</h3><p style={{margin:0,fontSize:12,color:"#555"}}>Informações da DFWeb no contrato</p></div>
          <button onClick={onClose} style={{marginLeft:"auto",background:"none",border:"none",color:"#555",fontSize:18,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
          <Field label="Razão Social" value={s.razaoSocial} onChange={upd("razaoSocial")} placeholder="DFWeb – Branding e Performance"/>
          <Field label="CNPJ" value={s.cnpj} onChange={upd("cnpj")} placeholder="00.000.000/0001-00" half/>
          <Field label="Endereço" value={s.endereco} onChange={upd("endereco")} placeholder="Icaraí, Niterói – RJ"/>
          <Field label="Responsável" value={s.responsavel} onChange={upd("responsavel")} placeholder="Diogo Felix" half/>
          <Field label="Cargo" value={s.cargo} onChange={upd("cargo")} placeholder="CPO" half/>
          <Field label="E-mail" value={s.email} onChange={upd("email")} placeholder="contato@dfweb.com.br"/>
          <Field label="Site" value={s.site} onChange={upd("site")} placeholder="dfweb.com.br"/>
        </div>
        <button onClick={save} style={{width:"100%",background:`linear-gradient(135deg,${C.dark},${C.purple})`,border:"none",borderRadius:10,padding:14,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",marginTop:8}}>
          Salvar Configurações
        </button>
      </div>
    </div>
  );
}

function HistoryPanel({onClose,onNewContract}){
  const [contracts,setContracts]=useState([]);
  const [q,setQ]=useState("");
  const [filter,setFilter]=useState("todos");
  const [selected,setSelected]=useState(null);
  const [showCancel,setShowCancel]=useState(false);
  const [showAdobe,setShowAdobe]=useState(false);
  const reload=()=>setContracts(loadContracts());
  useEffect(reload,[]);
  const filtered=contracts.filter(c=>{
    const m=(c.clientName||"").toLowerCase().includes(q.toLowerCase())||(c.contractNumber||"").toLowerCase().includes(q.toLowerCase())||(c.serviceLabel||"").toLowerCase().includes(q.toLowerCase());
    return m&&(filter==="todos"||c.status===filter);
  });
  const handleCancel=(reason)=>{cancelContract(selected.id,reason);reload();setShowCancel(false);setSelected(p=>({...p,status:"cancelado",cancelReason:reason}));};
  return(
    <div style={{position:"fixed",inset:0,background:C.bg,zIndex:100,display:"flex",flexDirection:"column"}}>
      {showCancel&&selected&&<CancelModal contract={selected} onClose={()=>setShowCancel(false)} onConfirm={handleCancel}/>}
      {showAdobe&&selected&&<AdobeModal contract={selected} contractText={selected.contractText||""} form={selected} serviceLabel={selected.serviceLabel||""} onClose={()=>setShowAdobe(false)} onSent={()=>{reload();setShowAdobe(false);}}/>}
      {selected&&!showCancel&&!showAdobe&&<ContractDetail contract={selected} onClose={()=>setSelected(null)} onCancel={()=>setShowCancel(true)} onAdobeOpen={()=>setShowAdobe(true)}/>}
      <div style={{padding:"18px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:14,background:C.card}}>
        <img src="/logodfweb.png" alt="DFWeb" style={{height:28,objectFit:"contain"}}/>
        <h2 style={{margin:0,fontSize:16,fontWeight:800,flex:1}}>Contratos DFWeb</h2>
        <button onClick={onNewContract} style={{background:`linear-gradient(135deg,${C.dark},${C.purple})`,border:"none",borderRadius:8,padding:"8px 16px",color:"#fff",fontSize:13,fontWeight:700,cursor:"pointer"}}>+ Novo</button>
        <button onClick={onClose} style={{background:"none",border:"none",color:"#555",fontSize:20,cursor:"pointer"}}>✕</button>
      </div>
      <div style={{padding:"14px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:10,flexWrap:"wrap",background:C.card}}>
        <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Buscar cliente, numero ou servico..." style={{...INP,flex:1,minWidth:200,fontSize:13}}/>
        {["todos","ativo","cancelado"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{background:filter===f?C.purple:C.border,border:`1px solid ${filter===f?C.purple:C.border2}`,borderRadius:8,padding:"8px 14px",color:filter===f?"#fff":"#666",fontSize:13,cursor:"pointer",textTransform:"capitalize"}}>{f}</button>
        ))}
      </div>
      <div style={{flex:1,overflowY:"auto",padding:20}}>
        {filtered.length===0?<div style={{textAlign:"center",padding:60,color:"#444"}}><div style={{fontSize:40,marginBottom:12}}>📄</div><p style={{margin:0,fontSize:14}}>{q?"Nenhum resultado":"Nenhum contrato ainda"}</p></div>:(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
            {filtered.map(c=>(
              <div key={c.id} onClick={()=>setSelected(c)} style={{background:C.card,border:`1px solid ${c.status==="cancelado"?"#4a2a2a":C.border}`,borderRadius:12,padding:16,cursor:"pointer",transition:"border-color 0.2s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=c.status==="cancelado"?"#6a3a3a":C.purple} onMouseLeave={e=>e.currentTarget.style.borderColor=c.status==="cancelado"?"#4a2a2a":C.border}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                  <div><div style={{fontSize:11,color:C.cyan,fontWeight:700,marginBottom:3}}>{c.contractNumber}</div><div style={{fontSize:15,fontWeight:700}}>{c.clientName}</div></div>
                  <Badge status={c.status}/>
                </div>
                <div style={{fontSize:12,color:"#555",marginBottom:10}}>{SERVICES.find(s=>s.id===c.service)?.icon} {c.serviceLabel}</div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:14,color:C.yellow,fontWeight:700}}>R$ {c.value}</span>
                  <span style={{fontSize:11,color:"#444"}}>{new Date(c.createdAt).toLocaleDateString("pt-BR")}</span>
                </div>
                {c.adobeStatus&&<div style={{marginTop:8,fontSize:11,color:"#6fcf6f"}}>✉ {c.adobeStatus}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Chama via Netlify Function (resolve CORS)
async function callClaudeAPI(prompt){
  const r=await fetch("/.netlify/functions/generate-contract",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({prompt})
  });
  const d=await r.json();
  if(d.error)throw new Error(d.error);
  if(!d.text)throw new Error("Sem resposta da IA");
  return d.text;
}

export default function App(){
  const [view,setView]=useState("form");
  const [step,setStep]=useState(0);
  const [form,setForm]=useState(EMPTY);
  const [text,setText]=useState("");
  const [saved,setSaved]=useState(null);
  const [loading,setLoad]=useState(false);
  const [pdfBusy,setPdf]=useState(false);
  const [error,setError]=useState("");
  const [showAdobe,setShowAdobe]=useState(false);
  const [contractCount,setCount]=useState(loadContracts().length);
  const [showSettings,setShowSettings]=useState(false);
  const set=k=>v=>setForm(f=>({...f,[k]:v}));
  const svc=SERVICES.find(s=>s.id===form.service);
  const canNext=()=>{if(step===0)return!!form.service;if(step===1)return!!(form.clientName&&form.clientCnpj&&form.clientEmail);if(step===2)return!!(form.scope&&form.deadline);if(step===3)return!!form.value;return true;};
  const generate=async()=>{
    setLoad(true);setError("");
    try{
      const cfg=loadSettings();
      const prompt=`Voce e especialista juridico em contratos de marketing digital no Brasil.

Gere um contrato de prestacao de servicos COMPLETO, formal e juridicamente solido.

CONTRATANTE (CLIENTE):
- Razao Social: ${form.clientName}
- CNPJ/CPF: ${form.clientCnpj}
- Endereco: ${form.clientAddress||"A definir"}
- E-mail: ${form.clientEmail}
- Responsavel: ${form.clientResponsible||"A definir"}

CONTRATADA:
- Razao Social: ${cfg.razaoSocial}
- CNPJ: ${cfg.cnpj}
- Endereco: ${cfg.endereco}
- Responsavel: ${cfg.responsavel} (${cfg.cargo})
- Site: ${cfg.site}

OBJETO DO CONTRATO:
- Servico: ${svc?.label}
- Descricao: ${form.scope}
- Entregaveis: ${form.deliverables||"Conforme descricao acima"}
- Data de inicio: ${form.deadline}
- Duracao: ${form.contractDuration} meses

FINANCEIRO:
- Valor: R$ ${form.value}
- Vencimento: todo dia ${form.paymentDay}
- Forma de pagamento: ${form.paymentMethod.toUpperCase()}
- Reajuste anual pelo: ${form.readjustment}
- Multa rescisoria: ${form.penalty}%

INSTRUCOES: portugues BR formal. Clausulas: objeto, obrigacoes das partes, valor e pagamento, vigencia e rescisao, propriedade intelectual, confidencialidade, limitacao de responsabilidade, foro competente. Para o servico ${svc?.label} inclua clausulas especificas. Numeracao CLAUSULA 1a, 2a, 3a... NAO incluir assinaturas. Retornar SOMENTE o texto do contrato.`
      const contractText=await callClaudeAPI(prompt);
      setText(contractText);
      const entry=addContract({...form,serviceLabel:svc?.label,contractText});
      setSaved(entry);
      setCount(loadContracts().length);
      setStep(4);
    }catch(e){setError(e.message||"Erro ao gerar.");}
    setLoad(false);
  };
  const downloadPDF=async()=>{
    if(!saved)return;
    setPdf(true);
    try{const doc=await generateContractPDF(text,form,svc?.label||"",saved.contractNumber);doc.save(`${saved.contractNumber}_${form.clientName.replace(/\s+/g,"_")}.pdf`);}
    catch(e){alert("Erro PDF: "+e.message);}
    setPdf(false);
  };
  const reset=()=>{setStep(0);setForm(EMPTY);setText("");setError("");setSaved(null);};
  if(view==="history")return<HistoryPanel onClose={()=>setView("form")} onNewContract={()=>{reset();setView("form");}}/>;
  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'Segoe UI',system-ui,sans-serif",padding:"20px 14px",color:"#fff"}}>
      <style>{`*{box-sizing:border-box}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1}}`}</style>
      {showSettings&&<SettingsPanel onClose={()=>setShowSettings(false)}/>}
      {showAdobe&&saved&&<AdobeModal contract={saved} contractText={text} form={form} serviceLabel={svc?.label||""} onClose={()=>setShowAdobe(false)} onSent={()=>{setSaved(p=>({...p,adobeStatus:"Aguardando assinatura"}));setShowAdobe(false);}}/>}
      <div style={{maxWidth:660,margin:"0 auto",animation:"fadeIn 0.35s ease"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
          <img src="/logodfweb.png" alt="DFWeb" style={{height:32,objectFit:"contain"}}/>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>setShowSettings(true)} style={{background:C.card,border:`1px solid ${C.border2}`,borderRadius:8,padding:"7px 12px",color:"#555",fontSize:13,cursor:"pointer"}}>⚙️</button>
            <button onClick={()=>setView("history")} style={{background:C.card,border:`1px solid ${C.border2}`,borderRadius:8,padding:"7px 14px",color:C.light,fontSize:13,cursor:"pointer",display:"flex",alignItems:"center",gap:8}}>
              📋 Contratos{contractCount>0&&<span style={{background:C.purple,color:"#fff",borderRadius:10,padding:"1px 7px",fontSize:11,fontWeight:700}}>{contractCount}</span>}
            </button>
          </div>
        </div>
        <div style={{textAlign:"center",marginBottom:32}}>
          <h1 style={{fontSize:24,fontWeight:800,margin:"0 0 4px",background:`linear-gradient(135deg,#fff 30%,${C.light})`,WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Gerador de Contratos</h1>
          <p style={{color:"#444",fontSize:13,margin:0}}>Numeracao automatica · PDF com logo · Adobe Sign + Lembretes</p>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"28px 24px",boxShadow:"0 24px 80px rgba(0,0,0,0.5)"}}>
          {step<4&&!loading&&<StepBar cur={step}/>}
          {step===0&&!loading&&<div>
            <h2 style={{fontSize:18,fontWeight:700,marginBottom:4,marginTop:0}}>Qual servico sera contratado?</h2>
            <p style={{color:"#555",fontSize:13,marginBottom:20,marginTop:0}}>Cada servico gera clausulas especificas.</p>
            {SERVICES.map(s=><button key={s.id} onClick={()=>set("service")(s.id)} style={{width:"100%",background:form.service===s.id?`linear-gradient(135deg,#874BFF22,#9966FF33)`:"#0a0c17",border:`1px solid ${form.service===s.id?C.purple:C.border2}`,borderRadius:10,padding:"12px 14px",color:form.service===s.id?C.light:"#777",fontSize:14,fontWeight:form.service===s.id?700:400,cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:12,marginBottom:8,transition:"all 0.2s"}}><span style={{fontSize:17}}>{s.icon}</span>{s.label}{form.service===s.id&&<span style={{marginLeft:"auto",color:C.purple}}>✓</span>}</button>)}
          </div>}
          {step===1&&!loading&&<div>
            <h2 style={{fontSize:18,fontWeight:700,marginBottom:4,marginTop:0}}>Dados do Cliente</h2>
            <p style={{color:"#555",fontSize:13,marginBottom:20,marginTop:0}}>Qualificacao das partes no contrato.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
              <Field label="Razao Social / Nome" value={form.clientName} onChange={set("clientName")} placeholder="Clinica Saude Total Ltda" required/>
              <Field label="CNPJ / CPF" value={form.clientCnpj} onChange={set("clientCnpj")} placeholder="00.000.000/0001-00" required half/>
              <Field label="Telefone" value={form.clientPhone} onChange={set("clientPhone")} placeholder="(21) 99999-0000" half/>
              <Field label="Email" value={form.clientEmail} onChange={set("clientEmail")} placeholder="contato@empresa.com.br" required/>
              <Field label="Endereco" value={form.clientAddress} onChange={set("clientAddress")} placeholder="Rua, numero, bairro, cidade - UF"/>
              <Field label="Representante Legal" value={form.clientResponsible} onChange={set("clientResponsible")} placeholder="Nome do responsavel"/>
            </div>
          </div>}
          {step===2&&!loading&&<div>
            <h2 style={{fontSize:18,fontWeight:700,marginBottom:4,marginTop:0}}>Escopo do Servico</h2>
            <p style={{color:"#555",fontSize:13,marginBottom:20,marginTop:0}}>Quanto mais claro, melhor o contrato.</p>
            <Field label="Descricao dos Servicos *" value={form.scope} onChange={set("scope")} placeholder="Descreva o que sera realizado..." rows={4} required/>
            <Field label="Entregaveis" value={form.deliverables} onChange={set("deliverables")} placeholder="Ex: 4 campanhas, 2 relatorios mensais..." rows={3}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
              <Field label="Data de Inicio *" value={form.deadline} onChange={set("deadline")} placeholder="10/06/2026" required half/>
              <Sel label="Duracao" value={form.contractDuration} onChange={set("contractDuration")} half options={[{v:"3",l:"3 meses"},{v:"6",l:"6 meses"},{v:"12",l:"12 meses"},{v:"24",l:"24 meses"},{v:"indeterminado",l:"Indeterminado"}]}/>
            </div>
          </div>}
          {step===3&&!loading&&<div>
            <h2 style={{fontSize:18,fontWeight:700,marginBottom:4,marginTop:0}}>Condicoes Financeiras</h2>
            <p style={{color:"#555",fontSize:13,marginBottom:20,marginTop:0}}>Defina valores e condicoes de rescisao.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0 14px"}}>
              <Field label="Valor (R$) *" value={form.value} onChange={set("value")} placeholder="2.500,00" required half/>
              <Field label="Dia Vencimento" value={form.paymentDay} onChange={set("paymentDay")} placeholder="5" half/>
              <Sel label="Pagamento" value={form.paymentMethod} onChange={set("paymentMethod")} half options={[{v:"pix",l:"PIX"},{v:"transferencia",l:"Transferencia"},{v:"boleto",l:"Boleto"},{v:"cartao",l:"Cartao"}]}/>
              <Sel label="Reajuste Anual" value={form.readjustment} onChange={set("readjustment")} half options={[{v:"IGPM",l:"IGP-M"},{v:"IPCA",l:"IPCA"},{v:"INPC",l:"INPC"},{v:"10%",l:"10% fixo"}]}/>
              <Sel label="Multa Rescisoria" value={form.penalty} onChange={set("penalty")} options={[{v:"10",l:"10% do valor restante"},{v:"20",l:"20% do valor restante"},{v:"30",l:"30% do valor restante"},{v:"1_mes",l:"1 mes de honorarios"},{v:"3_meses",l:"3 meses de honorarios"}]}/>
            </div>
            <div style={{background:"#0a0c17",borderRadius:10,padding:12,border:`1px solid ${C.border}`,marginTop:4,fontSize:13,color:"#555",lineHeight:1.7}}>
              📋 <strong style={{color:C.light}}>{svc?.label}</strong> · <strong style={{color:"#fff"}}>{form.clientName||"—"}</strong> · <strong style={{color:C.yellow}}>R$ {form.value||"—"}</strong> · {form.contractDuration} meses
            </div>
          </div>}
          {loading&&<div style={{textAlign:"center",padding:"50px 0"}}><div style={{width:48,height:48,borderRadius:"50%",border:`3px solid ${C.border}`,borderTopColor:C.purple,margin:"0 auto 18px",animation:"spin 0.8s linear infinite"}}/><p style={{color:C.light,fontWeight:700,fontSize:16,marginBottom:4}}>Gerando contrato com IA...</p><p style={{color:"#444",fontSize:13,margin:0}}>Aplicando clausulas para {svc?.label}</p></div>}
          {step===4&&text&&!loading&&<div style={{animation:"fadeIn 0.35s ease"}}>
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
              <div style={{width:42,height:42,borderRadius:12,background:`linear-gradient(135deg,${C.dark},${C.cyan})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>✓</div>
              <div>
                <div style={{fontSize:11,color:C.cyan,fontWeight:700}}>{saved?.contractNumber}</div>
                <h2 style={{fontSize:15,fontWeight:700,margin:0}}>{svc?.label} · {form.clientName}</h2>
                <p style={{color:"#555",fontSize:12,margin:0}}>R$ {form.value} · {form.contractDuration} meses</p>
              </div>
              <Badge status="ativo"/>
            </div>
            <div style={{background:"#0a0c17",border:`1px solid ${C.border2}`,borderRadius:10,padding:18,maxHeight:260,overflowY:"auto",fontSize:12,lineHeight:1.9,color:"#bbb",fontFamily:"Georgia,serif",whiteSpace:"pre-wrap",marginBottom:16}}>{text}</div>
            <div style={{display:"flex",gap:10,marginBottom:10,flexWrap:"wrap"}}>
              <button onClick={downloadPDF} disabled={pdfBusy} style={{flex:"1 1 150px",background:pdfBusy?"#222":`linear-gradient(135deg,${C.dark},${C.purple})`,border:"none",borderRadius:10,padding:"12px",color:"#fff",fontSize:14,fontWeight:700,cursor:pdfBusy?"default":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
                {pdfBusy?<><span style={{width:14,height:14,borderRadius:"50%",border:"2px solid #555",borderTopColor:"#fff",display:"inline-block",animation:"spin 0.6s linear infinite"}}/>Gerando...</>:"↓ Baixar PDF"}
              </button>
              <button onClick={()=>setShowAdobe(true)} style={{flex:"1 1 150px",background:"linear-gradient(135deg,#c0392b,#e74c3c)",border:"none",borderRadius:10,padding:"12px",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>✍ Adobe Sign</button>
            </div>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>navigator.clipboard.writeText(text)} style={{flex:1,background:C.border,border:`1px solid ${C.border2}`,borderRadius:10,padding:"10px",color:C.light,fontSize:13,cursor:"pointer"}}>Copiar texto</button>
              <button onClick={reset} style={{flex:1,background:"none",border:`1px solid ${C.border2}`,borderRadius:10,padding:"10px",color:"#444",fontSize:13,cursor:"pointer"}}>Novo contrato</button>
            </div>
            <p style={{color:"#1F2339",fontSize:11,textAlign:"center",marginTop:12,marginBottom:0}}>Revise com um profissional juridico antes de assinar.</p>
          </div>}
          {error&&<p style={{color:"#ff6b6b",fontSize:13,textAlign:"center",marginTop:14,background:"#2a1a1a",padding:"10px 14px",borderRadius:8}}>{error}</p>}
          {step<4&&!loading&&<div style={{display:"flex",justifyContent:"space-between",marginTop:24,gap:12}}>
            {step>0?<button onClick={()=>setStep(s=>s-1)} style={{background:"transparent",border:`1px solid ${C.border2}`,borderRadius:10,padding:"10px 20px",color:"#555",fontSize:14,cursor:"pointer"}}>← Voltar</button>:<div/>}
            {step<3?<button onClick={()=>setStep(s=>s+1)} disabled={!canNext()} style={{background:canNext()?`linear-gradient(135deg,${C.dark},${C.purple})`:C.border,border:"none",borderRadius:10,padding:"10px 24px",color:canNext()?"#fff":"#444",fontSize:14,fontWeight:700,cursor:canNext()?"pointer":"default",transition:"all 0.2s"}}>Continuar →</button>:<button onClick={generate} disabled={!canNext()} style={{background:canNext()?`linear-gradient(135deg,${C.dark},${C.cyan})`:C.border,border:"none",borderRadius:10,padding:"10px 24px",color:canNext()?"#fff":"#444",fontSize:14,fontWeight:700,cursor:canNext()?"pointer":"default"}}>✦ Gerar com IA</button>}
          </div>}
        </div>
        <p style={{textAlign:"center",color:"#1F2339",fontSize:11,marginTop:18}}>DFWeb - Branding e Performance · dfweb.com.br</p>
      </div>
    </div>
  );
}
