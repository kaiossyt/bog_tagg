import { useState, useEffect, useCallback, useRef } from "react";

const ICONS = { Dashboard: "◉", Players: "◈", Shifts: "◇", Maps: "◆", Polls: "◎", "Title Data": "◬", Events: "⚡", Recent: "◷", Bans: "⨂", "PlayFab": "◈", "Catalog": "📦", "Shared Groups": "👥", "PF Title": "📋", "Roles": "⚙", "Lemming": "📬", "Q&A": "❓", "Reports": "⚠️", "Updates": "📢" };
const TABS = ["Dashboard", "Players", "Shifts", "Maps", "Polls", "Title Data", "Events", "Recent", "Bans", "PlayFab", "Catalog", "Shared Groups", "PF Title", "Roles", "Lemming", "Q&A", "Reports", "Updates"];
const PF_TABS = ["Overview","Inventory","Currency","Data","Bans","Progression","Friends","Ghost Games","Bulk Ops"];

let _csrfToken = "";

async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (opts.method && opts.method !== "GET" && _csrfToken) {
    headers["X-CSRF-Token"] = _csrfToken;
  }
  const r = await fetch(path, { headers, ...opts });
  if (r.status === 401) { window.location.href = "/admin/logout"; throw new Error("401"); }
  if (r.status === 403) { alert("Access denied"); throw new Error("403"); }
  if (!r.ok) throw new Error(r.status);
  return r.json().catch(() => null);
}

function Skeleton({ w, h, br }) { return <div className="sk" style={{ width: w||"100%", height: h||16, borderRadius: br||3, marginBottom: 6 }} />; }
function Panel({ children, style }) { return <div className="pn" style={style}>{children}</div>; }
function StatBox({ color, label, value, sub, delay }) {
  return <div className="sb" style={{ "--sbc": color, animationDelay: `${delay||0}ms` }}>
    <div className="sb-v" style={{ color }}>{value!=null?value:"—"}</div>
    <div className="sb-l">{label}</div>{sub && <div className="sb-s">{sub}</div>}
  </div>;
}
function DataTable({ cols, rows, renderRow, empty }) {
  if (!rows||!rows.length) return <Panel><div className="empty">{empty||"No data."}</div></Panel>;
  return <Panel style={{ padding:0, overflow:"hidden" }}><div className="dt-wrap"><table className="dt">
    <thead><tr>{cols.map((c,i)=><th key={i}>{c}</th>)}</tr></thead>
    <tbody>{rows.map((r,i)=><tr key={i} className="dr" style={{animationDelay:`${i*30}ms`}}>{renderRow(r,i)}</tr>)}</tbody>
  </table></div></Panel>;
}

// ═══════════════════ PAGE COMPONENTS ═══════════════════

function Dashboard() {
  const [d,set]=useState(null);
  useEffect(()=>{api("/admin/api/stats").then(set).catch(()=>{});},[]);
  if(!d) return <div className="pg-enter"><h2 className="hdr">Dashboard</h2><Skeleton h={200}/></div>;
  const items=[{color:"#00f0ff",label:"Players",value:d.players},{color:"#39ff14",label:"Online",value:d.online},{color:"#ffd700",label:"Friendships",value:d.friends},{color:"#ff00aa",label:"Shifts Done",value:d.shifts},{color:"#00f0ff",label:"Shared Maps",value:d.maps},{color:"#ffd700",label:"Active Polls",value:d.polls},{color:"#ff3366",label:"Bans",value:d.bans},{color:"#39ff14",label:"Mothership",value:d.mothership}];
  return <div className="pg-enter"><h2 className="hdr">Dashboard</h2><div className="grid-8">{items.map((i,k)=><StatBox key={k} {...i} delay={k*60}/>)}</div></div>;
}

function Players({ navigate }) {
  const [pg,setPg]=useState(1); const [s,setS]=useState(""); const [d,setD]=useState(null);
  const load=useCallback((p)=>{api("/admin/api/players?page="+p+"&search="+encodeURIComponent(s)).then(setD).catch(()=>setD({players:[],total:0,page:1,limit:50}));},[s]);
  useEffect(()=>{load(pg);},[pg,load]);
  return <div className="pg-enter"><h2 className="hdr">Players</h2>
    <input className="inp mb" placeholder="Search by PlayFab ID or name..." value={s} onChange={e=>{setS(e.target.value);setPg(1);load(1);}} style={{maxWidth:360}}/>
    {!d?<Skeleton h={200}/>:<DataTable cols={["PlayFab ID","Name","Platform","Last Login","Friends",""]} rows={d.players}
      renderRow={p=><><td className="mono c-cy"><button className="bt cp" onClick={()=>navigate("PlayFab",p.playfabid)}>{p.playfabid}</button></td><td>{p.displayname||<span className="tag y">No name</span>}</td><td className="mono">{p.platform||"-"}</td><td className="mono">{(p.lastlogin||"").slice(0,16)}</td><td>{p.fc}</td><td><button className="bt bt-d bt-xs" onClick={()=>{const r=prompt("Reason:");if(r)api("/admin/api/players/"+p.playfabid+"/ban",{method:"POST",body:JSON.stringify({reason:r})}).then(()=>load(pg)).catch(()=>{});}}>Ban</button></td></>}/>}
    {d&&<div className="fr mt" style={{justifyContent:"space-between"}}><span className="c-dim">Page {d.page}/{Math.max(1,Math.ceil((d.total||0)/(d.limit||50)))}</span><div className="fr" style={{gap:6}}><button className="bt bt-g bt-xs" disabled={d.page<=1} onClick={()=>setPg(d.page-1)}>‹</button><button className="bt bt-g bt-xs" disabled={d.page>=Math.ceil((d.total||0)/(d.limit||50))} onClick={()=>setPg(d.page+1)}>›</button></div></div>}
  </div>;
}

function Shifts() {
  const [d,set]=useState(null);
  const load=()=>api("/admin/api/shifts").then(set).catch(()=>{});
  useEffect(()=>{load();},[]);
  const complete=(id)=>{api("/admin/api/shifts/"+id+"/complete",{method:"POST"}).then(load).catch(()=>{});};
  const completeAll=()=>{if(confirm("Complete ALL active shifts?"))api("/admin/api/shifts/complete-all",{method:"POST"}).then(load).catch(()=>{});};
  const active=d?d.filter(s=>!s.completed):[];
  return <div className="pg-enter"><h2 className="hdr">Ghost Reactor Shifts {active.length>0&&<button className="bt bt-d bt-xs" onClick={completeAll} style={{marginLeft:12}}>Complete All ({active.length})</button>}</h2>
    {!d?<Skeleton h={200}/>:<DataTable cols={["Shift ID","Player","Depth","Cores","Players","Credits","Started","Status",""]} rows={d}
      renderRow={s=><><td className="mono c-cy">{(s.shiftid||"").slice(0,8)}</td><td className="mono">{(s.mothershipid||"").slice(0,12)}</td><td>{s.depth}</td><td>{s.coresrequired}</td><td>{s.numberofplayers}</td><td>{s.currentcredits||0}</td><td className="mono">{(s.startedat||"").slice(0,16)}</td><td>{s.completed?<span className="tag g">Done</span>:<span className="tag y">Active</span>}</td><td>{!s.completed&&<button className="bt bt-g bt-xs" onClick={()=>complete(s.shiftid)}>Complete</button>}</td></>}/>}
  </div>;
}

function Maps() {
  const [d,set]=useState(null);
  useEffect(()=>{api("/admin/api/maps").then(set).catch(()=>{});},[]);
  return <div className="pg-enter"><h2 className="hdr">Shared Maps</h2>
    {!d?<Skeleton h={200}/>:<DataTable cols={["Map ID","Creator","Name","Votes","Active","Created"]} rows={d}
      renderRow={m=><><td className="mono c-cy">{m.mapid}</td><td className="mono">{(m.mothershipid||"").slice(0,12)}</td><td>{m.nickname}</td><td>{m.votecount}</td><td>{m.isactive?<span className="tag g">Yes</span>:<span className="tag r">No</span>}</td><td className="mono">{(m.createdat||"").slice(0,16)}</td></>}/>}
  </div>;
}

function Polls() {
  const [d,set]=useState(null); const [q,setQ]=useState(""),[o,setO]=useState(""),[h,setH]=useState(24);
  const load=()=>api("/admin/api/polls").then(set).catch(()=>{});
  useEffect(()=>{load();},[]);
  const create=()=>{if(!q||!o)return;api("/admin/api/polls",{method:"POST",body:JSON.stringify({question:q,options:o.split(",").map(x=>x.trim()),hours:h})}).then(()=>{setQ("");setO("");load();}).catch(()=>{});};
  const close=(id)=>{api("/admin/api/polls/"+id+"/close",{method:"POST"}).then(load).catch(()=>{});};
  return <div className="pg-enter"><h2 className="hdr">Polls</h2>
    <Panel><h3 className="sh">Create Poll</h3><input className="inp mb" placeholder="Question" value={q} onChange={e=>setQ(e.target.value)}/>
      <div className="fr mb" style={{flexWrap:"wrap"}}><input className="inp" placeholder="Option A, B, ..." value={o} onChange={e=>setO(e.target.value)} style={{flex:1,minWidth:200}}/><input className="inp" type="number" value={h} onChange={e=>setH(parseInt(e.target.value)||24)} style={{width:80}} placeholder="Hrs"/></div>
      <button className="bt bt-g" onClick={create}>Create Poll</button></Panel>
    {(d||[]).map((p,i)=><Panel key={p.pollid} style={{animationDelay:`${i*60}ms`}}><div className="fr" style={{justifyContent:"space-between"}}><strong>{p.isactive?<span className="dot on"/>:<span className="dot off"/>} {p.question}</strong>{p.isactive&&<button className="bt bt-d bt-xs" onClick={()=>close(p.pollid)}>Close</button>}</div><div className="c-dim fs-xs mt">{(p.voteoptions||[]).map((o,i)=><span key={i}>{o}: <b>{(p.votecount||[])[i]}</b>{i<(p.voteoptions||[]).length-1?"  ·  ":""}</span>)}</div><div className="c-dim2 fs-xxs">Ends {p.endtime||"—"}</div></Panel>)}
  </div>;
}

function TitleData() {
  const [d,set]=useState(null); const [k,setK]=useState(""),[v,setV]=useState("");
  const load=()=>api("/admin/api/titledata").then(set).catch(()=>{});
  useEffect(()=>{load();},[]);
  const save=()=>{if(!k)return;api("/admin/api/titledata",{method:"POST",body:JSON.stringify({key:k,value:v})}).then(()=>{setK("");setV("");load();}).catch(()=>{});};
  const del=(key)=>{api("/admin/api/titledata/"+encodeURIComponent(key),{method:"DELETE"}).then(load).catch(()=>{});};
  return <div className="pg-enter"><h2 className="hdr">Title Data Overrides</h2>
    <Panel><h3 className="sh">Add / Edit</h3><input className="inp mb" placeholder="Key" value={k} onChange={e=>setK(e.target.value)} style={{maxWidth:400}}/><textarea className="inp mb" placeholder="Value" value={v} onChange={e=>setV(e.target.value)} rows={2} style={{maxWidth:400}}/><button className="bt bt-g" onClick={save}>Save</button></Panel>
    <DataTable cols={["Key","Value","Updated",""]} rows={d||[]} renderRow={t=><><td className="c-cy fw-b">{t.datakey}</td><td className="mono">{(t.datavalue||"").slice(0,80)}{t.datavalue&&t.datavalue.length>80?"…":""}</td><td className="mono">{(t.updatedat||"").slice(0,16)}</td><td><button className="bt bt-d bt-xs" onClick={()=>del(t.datakey)}>×</button></td></>}/>
  </div>;
}

function Events() {
  const [d,set]=useState(null); const [saving,setSaving]=useState(false); const [toast,setToast]=useState(null);
  const [motd,setMotd]=useState(""); const [savingMotd,setSavingMotd]=useState(false);
  const load=()=>{api("/admin/api/events").then(set).catch(()=>{});api("/admin/api/motd").then(r=>setMotd(r.motd||"")).catch(()=>{});};
  useEffect(()=>{load();},[]);
  const saveKey=async(key,raw)=>{setSaving(true);try{await api("/admin/api/events/save",{method:"POST",body:JSON.stringify({key,value:raw})});setToast("Saved "+key+"!");load();}catch(e){setToast("Error: "+e.message);}setSaving(false);};
  const saveMotd=async()=>{setSavingMotd(true);try{await api("/admin/api/motd",{method:"POST",body:JSON.stringify({message:motd})});setToast("MOTD saved!");}catch(e){setToast("Error: "+e.message);}setSavingMotd(false);};
  if(!d) return <div className="pg-enter"><h2 className="hdr">Event Control</h2><Skeleton h={400}/></div>;
  const {current}=d;
  const eventKeys=Object.entries(current).filter(([k])=>!k.startsWith("_"));
  const refDate=current._referenceDate;
  const simpleDates=current._simpleDates||{};
  return <div className="pg-enter"><h2 className="hdr">⚡ Event Control</h2>
    {toast&&<div className="toast" style={{position:"fixed",top:20,right:20,background:"var(--accent)",color:"#000",padding:"8px 16px",borderRadius:6,zIndex:999}}>{toast}</div>}
    <Panel style={{marginBottom:12}}><h3 className="sh">📢 Message of the Day</h3>
      <textarea className="inp mb" rows={2} value={motd} onChange={e=>setMotd(e.target.value)} style={{maxWidth:"100%"}}/>
      <button className="bt bt-g" disabled={savingMotd} onClick={saveMotd}>{savingMotd?"Saving...":"Save MOTD"}</button>
    </Panel>
    {eventKeys.map(([key,ev])=><EventEditor key={key} name={key} ev={ev} saving={saving} onSave={saveKey}/>)}
    {refDate&&<Panel style={{marginTop:16}}><h3 className="sh">📅 Reference Date</h3>
      <div className="c-dim fs-xs mb">Key: <code className="mono">{refDate.keyFound||"(not set)"}</code></div>
      <textarea className="inp mb" rows={2} defaultValue={refDate.raw} data-ref-key style={{maxWidth:400,fontFamily:"monospace"}}/>
      <button className="bt bt-g" disabled={saving} onClick={()=>{const el=document.querySelector('[data-ref-key]');saveKey(refDate.keyFound, el?.value||"");}}>Save</button>
    </Panel>}
    {Object.keys(simpleDates).length>0&&<Panel style={{marginTop:16}}><h3 className="sh">📅 Date Keys</h3>
      {Object.entries(simpleDates).map(([k,v])=><div key={k} className="fr mb" style={{flexWrap:"wrap",gap:4,alignItems:"center"}}>
        <span className="fw-b mono" style={{minWidth:200}}>{k}:</span>
        <input className="inp" defaultValue={v} data-simple-date={k} style={{width:260,fontSize:12}}/>
        <button className="bt bt-g bt-xs" disabled={saving} onClick={()=>{const el=document.querySelector(`[data-simple-date="${k}"]`);saveKey(k,el?.value||"");}}>Save</button>
      </div>)}
    </Panel>}
  </div>;
}
function EventEditor({name,ev,saving,onSave}){
  const [raw,setRaw]=useState(()=>{try{return JSON.stringify(ev.parsed||{},null,2)}catch{return ev.raw||""}});
  const [expanded,setExpanded]=useState(false);
  const parsed=ev.parsed;
  return <Panel style={{marginTop:8}}><div className="fr" style={{justifyContent:"space-between",cursor:"pointer"}} onClick={()=>setExpanded(!expanded)}>
    <h3 className="sh" style={{margin:0}}>⚡ {name}</h3><span className="c-dim fs-xs">{ev.objects?.length||0} objects · <span className="mono">{expanded?"▲":"▼"}</span></span>
  </div>
    <div className="c-dim fs-xs mb">{ev.desc}</div>
    {expanded&&parsed&&<div style={{marginBottom:8}}>{parsed.Data?.map((obj,i)=><div key={i} className="pn" style={{padding:"8px 12px",marginBottom:6}}>
      <div className="fw-b mb" style={{color:"var(--accent)"}}>#{obj.TitleDataObjectID}</div>
      {obj.AbsoluteDateTimeWindow?.map((w,j)=><div key={j} className="fr mb" style={{flexWrap:"wrap",gap:4,alignItems:"center"}}>
        <span className="c-dim fs-xs">Window [{j}] Start:</span>
        <input className="inp" defaultValue={w.StartDateTime} style={{width:220,fontSize:12}} data-win-start={`${i}:${j}`}/>
        <span className="c-dim fs-xs">End:</span>
        <input className="inp" defaultValue={w.EndDateTime} style={{width:220,fontSize:12}} data-win-end={`${i}:${j}`}/>
      </div>)}
      {(!obj.AbsoluteDateTimeWindow||obj.AbsoluteDateTimeWindow.length===0)&&<div className="c-dim2 fs-xs">No absolute windows</div>}
      {obj.RelativeDateTimeWindow?.map((w,r)=><div key={'r'+r} className="fr mb" style={{flexWrap:"wrap",gap:4,alignItems:"center"}}>
        <span className="c-dim2 fs-xs">RelWindow [{r}] Days={w.StartDateTime?.DaysPast} Start={w.StartDateTime?.Hours}h{w.StartDateTime?.Minutes}m End={w.EndDateTime?.Hours}h{w.EndDateTime?.Minutes}m</span>
      </div>)}
    </div>)}</div>}
    <textarea className="inp mb" rows={4} value={raw} onChange={e=>setRaw(e.target.value)} style={{maxWidth:"100%",fontFamily:"monospace",fontSize:12}}/>
    <button className="bt bt-g" disabled={saving} onClick={()=>onSave(name,raw)}>{saving?"Saving...":"Save to PlayFab"}</button>
  </Panel>;
}

function Recent() {
  const [d,set]=useState(null);
  useEffect(()=>{api("/admin/api/recent").then(set).catch(()=>{});},[]);
  return <div className="pg-enter"><h2 className="hdr">Recent Activity</h2>
    {!d?<Skeleton h={200}/>:<><h3 className="sh" style={{marginTop:0}}>Recent Logins</h3><DataTable cols={["PlayFab ID","Name","Platform","Last Login"]} rows={d.players||[]} renderRow={p=><><td className="mono c-cy">{p.playfabid}</td><td>{p.displayname||"-"}</td><td>{p.platform}</td><td className="mono">{(p.lastlogin||"").slice(0,16)}</td></>}/>
    <h3 className="sh">Recent Grants</h3><DataTable cols={["PlayFab ID","Granted At"]} rows={d.grants||[]} renderRow={g=><><td className="mono c-cy">{g.playfabid}</td><td className="mono">{(g.grantedat||"").slice(0,16)}</td></>}/></>}
  </div>;
}

function Bans() {
  const [d,set]=useState(null);
  const load=()=>api("/admin/api/recent").then(set).catch(()=>{});
  useEffect(()=>{load();},[]);
  return <div className="pg-enter"><h2 className="hdr">Bans</h2>
    {!d?<Skeleton h={120}/>:<DataTable cols={["PlayFab ID","Reason","Banned At",""]} rows={(d&&d.bans)||[]} renderRow={b=><><td className="mono c-cy">{b.playfabid}</td><td>{b.reason}</td><td className="mono">{(b.bannedat||"").slice(0,16)}</td><td><button className="bt bt-g bt-xs" onClick={()=>{api("/admin/api/players/"+b.playfabid+"/unban",{method:"POST"}).then(load).catch(()=>{});}}>Unban</button></td></>}/>}
  </div>;
}

// ═══════════════════ PLAYFAB CONSOLE ═══════════════════

function PlayFabConsole({ searchId, navigate }) {
  const [searchQ,setSearchQ]=useState(searchId||""); const [hits,setHits]=useState(null); const [searching,setSearching]=useState(false);
  const [selected,setSelected]=useState(null); const [fullData,setFullData]=useState(null); const [fullLoading,setFullLoading]=useState(false);
  const [pfTab,setPfTab]=useState("Overview"); const [toast,setToast]=useState(null); const timer=useRef(null);
  const t=(msg)=>{setToast(msg);setTimeout(()=>setToast(null),3500);};

  // Auto-search if navigated with an ID
  useEffect(()=>{
    if (searchId && searchId.trim()) {
      setSearchQ(searchId.trim());
      api("/admin/api/pf/search?q="+encodeURIComponent(searchId.trim())).then(d=>{
        const hits = d.hits || [];
        setHits(hits);
        if (hits.length === 1) selectPlayer(hits[0]);
      }).catch(()=>{});
    }
  },[]);

  const [oculusInfo,setOculusInfo]=useState(null);
  useEffect(()=>{if(selected&&selected.oculusid){api("/admin/api/oculus/"+selected.oculusid).then(d=>{if(d&&d.username)setOculusInfo(d);}).catch(()=>{});} else setOculusInfo(null);},[selected]);

  const doSearch=(q)=>{const val=(q||searchQ).trim();if(!val){setHits(null);return;}setSearching(true);api("/admin/api/pf/search?q="+encodeURIComponent(val)).then(d=>{setHits(d.hits||[]);setSearching(false);}).catch(()=>{setHits([]);setSearching(false);});};
  const selectPlayer=(hit)=>{setSelected(hit);setFullLoading(true);setFullData(null);setPfTab("Overview");const lid=hit.playfabid||hit.mothershipid;if(lid)api("/admin/api/pf/player/"+lid+"/full").then(d=>{setFullData(d);setFullLoading(false);}).catch(()=>{setFullData({error:"Failed to load"});setFullLoading(false);});else setFullLoading(false);};
  useEffect(()=>{if(searchQ.length>=2){clearTimeout(timer.current);timer.current=setTimeout(()=>doSearch(searchQ),400);}else setHits(null);return ()=>clearTimeout(timer.current);},[searchQ]);

  return <div className="pg-enter pf-console">
    {toast&&<div className="tst ok">{toast}</div>}
    <h2 className="hdr">PlayFab Console</h2>

    <div className="pf-search-bar"><div className="pf-search-inner"><span className="pf-search-icon">⌕</span><input className="pf-search-inp" placeholder="Search by PlayFab ID, Oculus ID, Mothership ID, or name..." value={searchQ} onChange={e=>setSearchQ(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")doSearch();}}/>{searching&&<div className="spinner-sm"/>}<button className="bt bt-g" onClick={()=>doSearch()}>Search</button></div></div>

    {hits&&!selected&&<Panel style={{marginTop:16}}><h3 className="sh" style={{marginBottom:12}}>Results ({hits.length})</h3>{hits.length===0&&<div className="empty">No players found.</div>}<div style={{display:"flex",flexDirection:"column",gap:6}}>{hits.map((h,i)=><div key={i} className="pf-hit dr" style={{animationDelay:`${i*50}ms`}} onClick={()=>selectPlayer(h)}><div className="pf-hit-main"><div className="pf-hit-name">{h.displayname||"Unknown"}</div><div className="pf-hit-ids">{h.playfabid&&<span className="pf-id-tag pf">PF: {h.playfabid}</span>}{h.oculusid&&<span className="pf-id-tag oc">OC: {h.oculusid.slice(0,16)}</span>}{h.mothershipid&&<span className="pf-id-tag ms">MS: {h.mothershipid.slice(0,8)}</span>}</div></div><div className="pf-hit-meta"><span className="tag g">{h.platform||"?"}</span><span className="tag y">{h.source}</span><span className="c-dim fs-xs mono">{(h.lastlogin||"").slice(0,16)}</span></div></div>)}</div></Panel>}

    {selected&&<>
      <Panel className="pf-id-card" style={{marginTop:16}}><button className="bt bt-d bt-xs pf-back" onClick={()=>{setSelected(null);setFullData(null);setHits(null);setSearchQ("");}}>← Back</button>
        <div className="pf-id-body">
          <div className="pf-id-avatar">
            {oculusInfo?.avatarUrl ? <img src={oculusInfo.avatarUrl} alt="" style={{width:56,height:56,borderRadius:12,objectFit:"cover"}} /> : (selected.displayname||"?")[0].toUpperCase()}
          </div>
          <div className="pf-id-info">
            <div className="pf-id-name">{selected.displayname||"Unknown Player"}</div>
            <div className="pf-id-ids">
              {selected.playfabid&&<div className="pf-id-row"><span className="pf-id-label">PlayFab ID</span><code>{selected.playfabid}</code><button className="bt bt-xs cp" onClick={()=>{navigator.clipboard.writeText(selected.playfabid);t("Copied!");}}>Copy</button></div>}
              {selected.oculusid&&<div className="pf-id-row"><span className="pf-id-label">Oculus ID</span><code>{selected.oculusid}</code>{oculusInfo?.username&&<span className="tag g">{oculusInfo.username}</span>}<button className="bt bt-xs cp" onClick={()=>{navigator.clipboard.writeText(selected.oculusid);t("Copied!");}}>Copy</button></div>}
              {selected.mothershipid&&<div className="pf-id-row"><span className="pf-id-label">Mothership ID</span><code>{selected.mothershipid}</code><button className="bt bt-xs cp" onClick={()=>{navigator.clipboard.writeText(selected.mothershipid);t("Copied!");}}>Copy</button></div>}
            </div>
          </div>
          <div className="pf-id-stats"><StatBox color="#00f0ff" label="Platform" value={selected.platform||"?"}/><StatBox color="#39ff14" label="Source" value={selected.source||"?"}/><StatBox color="#ffd700" label="Last Login" value={(selected.lastlogin||"").slice(0,16)}/></div>
        </div>
      </Panel>
      <div className="pf-subtabs" style={{marginTop:12}}>{PF_TABS.map(t=><button key={t} className={`pf-subtab ${pfTab===t?"on":""}`} onClick={()=>setPfTab(t)}>{t}</button>)}</div>
      {fullLoading?<Panel style={{marginTop:12}}><Skeleton h={300}/><div className="c-dim fs-xs mt">Loading from PlayFab...</div></Panel>:fullData&&fullData.error?<Panel style={{marginTop:12}}><div className="err">{fullData.error}</div></Panel>:fullData&&<>
        {pfTab==="Overview"&&<PfOverview data={fullData} selected={selected} toast={t}/>}
        {pfTab==="Inventory"&&<PfInventory data={fullData} selected={selected} toast={t}/>}
        {pfTab==="Currency"&&<PfCurrency data={fullData} selected={selected} toast={t}/>}
        {pfTab==="Data"&&<PfData data={fullData} selected={selected} toast={t}/>}
        {pfTab==="Bans"&&<PfBans data={fullData} selected={selected} toast={t}/>}
        {pfTab==="Progression"&&<PfProgression data={fullData} selected={selected} toast={t}/>}
        {pfTab==="Friends"&&<PfFriends selected={selected} toast={t} navigate={navigate}/>}
        {pfTab==="Ghost Games"&&<PfGhostGames selected={selected} toast={t}/>}
        {pfTab==="Bulk Ops"&&<PfBulkOps selected={selected} toast={t}/>}
      </>}
    </>}
  </div>;
}

// ─── PlayFab Sub-Components ───

function PfOverview({ data, selected, toast }) {
  const pf=data.playfab, ms=data.mothership, info=pf?.data?.InfoResultPayload||{}, acct=info.AccountInfo||{}, inv=info.UserInventory||[], vc=info.UserVirtualCurrency||{}, stats=info.PlayerStatistics||[], prof=info.PlayerProfile||{};
  return <div className="pf-sub-content">
    <div className="grid-8" style={{marginTop:12}}><StatBox color="#00f0ff" label="Inv Items" value={inv.length}/><StatBox color="#39ff14" label="SI (VC)" value={vc.SI||0}/><StatBox color="#ffd700" label="Stats" value={stats.length}/><StatBox color="#ff00aa" label="Prog Nodes" value={(ms?.progressionnodes||[]).length}/><StatBox color="#00f0ff" label="Shift Credits" value={ms?.shiftcredits?.currentcredits||0}/><StatBox color="#39ff14" label="Friends" value={data.friendsCount||0}/><StatBox color="#ff3366" label="Bans" value={data.bans?.length||0}/><StatBox color="#ffd700" label="Max Depth" value={ms?.reactorstats?.maxdepthreached||0}/></div>
    <Panel style={{marginTop:12}}><h3 className="sh">Account Info</h3><div className="pf-kv-grid"><div><span>Origination</span><b>{acct.TitleInfo?.Origination||"—"}</b></div><div><span>Created</span><b>{acct.TitleInfo?.Created||"—"}</b></div><div><span>Last Login</span><b>{acct.TitleInfo?.LastLogin||"—"}</b></div><div><span>Banned</span><b>{acct.TitleInfo?.isBanned?<span className="tag r">Yes</span>:<span className="tag g">No</span>}</b></div><div><span>Email</span><b>{acct.PrivateInfo?.Email||"—"}</b></div><div><span>Player ID</span><b className="mono">{selected.playfabid||"—"}</b></div></div></Panel>
    {prof.DisplayName&&<Panel style={{marginTop:12}}><h3 className="sh">Profile</h3><div className="pf-kv-grid"><div><span>Display Name</span><b>{prof.DisplayName}</b></div>{prof.AvatarUrl&&<div><span>Avatar</span><img src={prof.AvatarUrl} alt="" style={{width:40,height:40,borderRadius:"50%",border:"1px solid rgba(0,240,255,0.2)"}}/></div>}</div></Panel>}
    {stats.length>0&&<Panel style={{marginTop:12}}><h3 className="sh">Statistics</h3><DataTable cols={["Name","Value","Version"]} rows={stats} renderRow={s=><><td className="c-cy">{s.StatisticName}</td><td>{s.Value}</td><td>{s.Version}</td></>}/></Panel>}
    <Panel style={{marginTop:12}}><h3 className="sh">Virtual Currencies</h3><div className="grid-8">{Object.entries(vc).map(([k,v])=><StatBox key={k} color="#ffd700" label={k} value={v}/>)}</div></Panel>
  </div>;
}

function PfInventory({ data, selected, toast }) {
  const [inv,setInv]=useState(null); const [grantIds,setGrantIds]=useState(""); const [revokeIds,setRevokeIds]=useState(""); const [catVer,setCatVer]=useState("DLC"); const [catalog,setCatalog]=useState([]); const [suggestions,setSuggestions]=useState([]); const [showSuggest,setShowSuggest]=useState(false); const pfid=selected.playfabid;
  const loadInv=()=>{if(pfid)api("/admin/api/pf/player/"+pfid+"/inventory").then(d=>setInv(d.data||d)).catch(()=>{});};
  useEffect(()=>{loadInv();},[pfid]);
  useEffect(()=>{api("/admin/api/pf/catalog?version="+catVer).then(d=>setCatalog((d.data||d).Catalog||[])).catch(()=>setCatalog([]));},[catVer]);
  const handleGrant=(val)=>{setGrantIds(val);const last=val.split(",").pop().trim();if(last&&catalog.length){const q=last.toLowerCase();const m=catalog.filter(c=>(c.ItemId&&c.ItemId.toLowerCase().includes(q))||(c.DisplayName&&c.DisplayName.toLowerCase().includes(q))).slice(0,8);setSuggestions(m);setShowSuggest(m.length>0);}else setShowSuggest(false);};
  const pick=(item)=>{const p=grantIds.split(",");p.pop();p.push(item.ItemId);setGrantIds(p.map(s=>s.trim()).filter(Boolean).join(", ")+", ");setShowSuggest(false);};
  const grant=()=>{const ids=grantIds.split(",").map(s=>s.trim()).filter(Boolean);if(!ids.length)return;api("/admin/api/pf/player/"+pfid+"/grant-items",{method:"POST",body:JSON.stringify({itemIds:ids,catalogVersion:catVer})}).then(()=>{toast("Granted!");setGrantIds("");loadInv();}).catch(e=>toast("Error: "+e.message));};
  const revoke=()=>{const ids=revokeIds.split(",").map(s=>s.trim()).filter(Boolean);if(!ids.length)return;if(!confirm("Revoke "+ids.length+" items?"))return;api("/admin/api/pf/player/"+pfid+"/revoke-items",{method:"POST",body:JSON.stringify({instanceIds:ids})}).then(()=>{toast("Revoked!");setRevokeIds("");loadInv();}).catch(e=>toast("Error: "+e.message));};
  return <div className="pf-sub-content">
    <Panel style={{marginTop:12}}><h3 className="sh">Grant Items <span className="c-dim">({catalog.length} in {catVer})</span></h3><div className="fr mb" style={{flexWrap:"wrap"}}><div style={{flex:1,minWidth:220,position:"relative"}}><input className="inp" placeholder="Type item ID or name..." value={grantIds} onChange={e=>handleGrant(e.target.value)} onFocus={()=>grantIds&&handleGrant(grantIds)} onBlur={()=>setTimeout(()=>setShowSuggest(false),200)} style={{width:"100%"}}/>{showSuggest&&suggestions.length>0&&<div className="ac-dropdown">{suggestions.map(s=><div key={s.ItemId} className="ac-item" onMouseDown={()=>pick(s)}><span className="mono c-cy">{s.ItemId}</span><span className="c-dim">{s.DisplayName||""}</span></div>)}</div>}</div><input className="inp" placeholder="Catalog" value={catVer} onChange={e=>setCatVer(e.target.value)} style={{width:100}}/><button className="bt bt-g" onClick={grant}>Grant</button></div></Panel>
    <Panel style={{marginTop:12}}><h3 className="sh">Revoke Items</h3><div className="fr mb" style={{flexWrap:"wrap"}}><input className="inp" placeholder="Instance IDs" value={revokeIds} onChange={e=>setRevokeIds(e.target.value)} style={{flex:1,minWidth:220}}/><button className="bt bt-d" onClick={revoke}>Revoke</button></div></Panel>
    {!inv?<Skeleton h={200}/>:<DataTable cols={["Name","Item ID","Instance ID","Uses","Class","Catalog"]} rows={inv.Inventory||[]} renderRow={i=><><td>{i.DisplayName||"—"}</td><td className="mono">{i.ItemId}</td><td className="mono">{(i.ItemInstanceId||"").slice(0,16)}</td><td>{i.RemainingUses!=null?i.RemainingUses:"∞"}</td><td>{i.ItemClass||"—"}</td><td className="mono">{i.CatalogVersion||"—"}</td></>}/>}
    {inv&&<div className="c-dim fs-xs mt">{(inv.Inventory||[]).length} items</div>}
  </div>;
}

function PfCurrency({ data, selected, toast }) {
  const pfid=selected.playfabid; const vc=data?.playfab?.data?.InfoResultPayload?.UserVirtualCurrency||{}; const vcKeys=Object.keys(vc); const defaultCur=vcKeys.length>0?vcKeys[0]:"SI"; const [amt,setAmt]=useState(100),[cur,setCur]=useState(defaultCur);
  useEffect(()=>{setCur(defaultCur);},[pfid,defaultCur]);
  const addVc=()=>{api("/admin/api/pf/player/"+pfid+"/add-vc",{method:"POST",body:JSON.stringify({amount:amt,currency:cur})}).then(d=>toast("Added! New: "+(d.Balance||"?"))).catch(e=>toast("Error: "+e.message));};
  const subVc=()=>{if(!confirm("Subtract "+amt+" "+cur+"?"))return;api("/admin/api/pf/player/"+pfid+"/sub-vc",{method:"POST",body:JSON.stringify({amount:amt,currency:cur})}).then(d=>toast("Subtracted! New: "+(d.Balance||"?"))).catch(e=>toast("Error: "+e.message));};
  return <div className="pf-sub-content">
    <Panel style={{marginTop:12}}><h3 className="sh">Balances</h3><div className="grid-8">{vcKeys.length===0?<div className="c-dim fs-xs">No currencies</div>:Object.entries(vc).map(([k,v])=><StatBox key={k} color="#ffd700" label={k} value={v}/>)}</div></Panel>
    <Panel style={{marginTop:12}}><h3 className="sh">Modify</h3><div className="fr mb" style={{flexWrap:"wrap"}}><input className="inp" type="number" value={amt} onChange={e=>setAmt(parseInt(e.target.value)||0)} style={{width:120}}/><div style={{position:"relative",width:160}}><select className="inp pf-select" value={cur} onChange={e=>setCur(e.target.value)} style={{width:"100%",cursor:"pointer",appearance:"none",paddingRight:28}}>{vcKeys.map(k=><option key={k} value={k}>{k} ({vc[k]||0})</option>)}{!vcKeys.includes(cur)&&<option value={cur}>{cur}</option>}<option value="SI">SI</option><option value="GN">GN</option><option value="RM">RM</option></select><span className="pf-select-arrow">▾</span></div><button className="bt bt-g" onClick={addVc}>Add</button><button className="bt bt-d" onClick={subVc}>Sub</button></div><input className="inp mt" placeholder="Or type custom code..." value={cur} onChange={e=>setCur(e.target.value)} style={{maxWidth:160}}/></Panel>
  </div>;
}

function PfData({ data, selected, toast }) {
  const pfid=selected.playfabid; const [ud,setUd]=useState(null); const [dk,setDk]=useState(""),[dv,setDv]=useState(""); const [ik,setIk]=useState(""),[iv,setIv]=useState(""); const [sn,setSn]=useState(""),[sv,setSv]=useState(0);
  const load=()=>{if(pfid)api("/admin/api/pf/player/"+pfid+"/data").then(setUd).catch(()=>{});};
  useEffect(()=>{load();},[pfid]);
  const sp=()=>{if(!dk)return;api("/admin/api/pf/player/"+pfid+"/data",{method:"POST",body:JSON.stringify({key:dk,value:dv})}).then(()=>{toast("Saved!");setDk("");setDv("");load();}).catch(e=>toast("Error: "+e.message));};
  const si=()=>{if(!ik)return;api("/admin/api/pf/player/"+pfid+"/internal-data",{method:"POST",body:JSON.stringify({key:ik,value:iv})}).then(()=>{toast("Saved!");setIk("");setIv("");load();}).catch(e=>toast("Error: "+e.message));};
  const ss=()=>{if(!sn)return;api("/admin/api/pf/player/"+pfid+"/statistics",{method:"POST",body:JSON.stringify({name:sn,value:sv})}).then(()=>{toast("Updated!");setSn("");setSv(0);}).catch(e=>toast("Error: "+e.message));};
  const pd=ud?.public?.Data?.Data||{}, rd=ud?.readOnly?.Data?.Data||{}, id=ud?.internal?.Data?.Data||{};
  return <div className="pf-sub-content">
    <Panel style={{marginTop:12}}><h3 className="sh">Set Public Data</h3><div className="fr mb" style={{flexWrap:"wrap"}}><input className="inp" placeholder="Key" value={dk} onChange={e=>setDk(e.target.value)} style={{width:180}}/><input className="inp" placeholder="Value" value={dv} onChange={e=>setDv(e.target.value)} style={{flex:1,minWidth:180}}/><button className="bt bt-g" onClick={sp}>Save</button></div></Panel>
    <Panel style={{marginTop:12}}><h3 className="sh">Set Internal Data</h3><div className="fr mb" style={{flexWrap:"wrap"}}><input className="inp" placeholder="Key" value={ik} onChange={e=>setIk(e.target.value)} style={{width:180}}/><input className="inp" placeholder="Value" value={iv} onChange={e=>setIv(e.target.value)} style={{flex:1,minWidth:180}}/><button className="bt bt-d" onClick={si}>Save</button></div></Panel>
    <Panel style={{marginTop:12}}><h3 className="sh">Update Statistic</h3><div className="fr mb" style={{flexWrap:"wrap"}}><input className="inp" placeholder="Stat name" value={sn} onChange={e=>setSn(e.target.value)} style={{width:200}}/><input className="inp" type="number" value={sv} onChange={e=>setSv(parseInt(e.target.value)||0)} style={{width:120}}/><button className="bt bt-g" onClick={ss}>Update</button></div></Panel>
    {!ud?<Skeleton h={200}/>:<>{[{label:"Public",data:pd,color:"#00f0ff"},{label:"Read-Only",data:rd,color:"#39ff14"},{label:"Internal",data:id,color:"#ff00aa"}].map(g=><div key={g.label} style={{marginTop:8}}><h3 className="sh" style={{color:g.color}}>{g.label} Data ({Object.keys(g.data).length})</h3><DataTable cols={["Key","Value","Permission","Updated"]} rows={Object.entries(g.data).map(([k,v])=>({key:k,...v}))} renderRow={d=><><td style={{color:g.color}}>{d.key}</td><td className="mono">{(d.Value||"").slice(0,120)}</td><td>{d.Permission||"—"}</td><td className="mono">{d.LastUpdated||"—"}</td></>}/></div>)}</>}
  </div>;
}

function PfBans({ data, selected, toast }) {
  const pfid=selected.playfabid; const [bans,setBans]=useState(null); const [reason,setReason]=useState(""),[hours,setHours]=useState(0);
  const load=()=>{if(pfid)api("/admin/api/pf/player/"+pfid+"/bans").then(d=>setBans(d.data||d)).catch(()=>{});};
  useEffect(()=>{load();},[pfid]);
  const doBan=()=>{if(!reason)return;api("/admin/api/pf/player/"+pfid+"/ban",{method:"POST",body:JSON.stringify({reason,hours})}).then(()=>{toast("Banned!");setReason("");load();}).catch(e=>toast("Error: "+e.message));};
  const doUnban=()=>{api("/admin/api/pf/player/"+pfid+"/unban",{method:"POST"}).then(()=>{toast("Unbanned!");load();}).catch(e=>toast("Error: "+e.message));};
  return <div className="pf-sub-content">
    <Panel style={{marginTop:12}}><h3 className="sh">Ban Actions</h3><div className="fr mb" style={{flexWrap:"wrap"}}><input className="inp" placeholder="Reason" value={reason} onChange={e=>setReason(e.target.value)} style={{flex:1,minWidth:180}}/><input className="inp" type="number" placeholder="Hours (0=perm)" value={hours} onChange={e=>setHours(parseInt(e.target.value)||0)} style={{width:140}}/><button className="bt bt-d" onClick={doBan}>Ban</button><button className="bt bt-g" onClick={doUnban}>Unban All</button></div></Panel>
    {!bans?<Skeleton h={120}/>:<DataTable cols={["Ban ID","Active","Reason","Created","Expires"]} rows={bans.BanData||[]} renderRow={b=><><td className="mono">{b.BanId||"—"}</td><td>{b.Active?<span className="tag r">Yes</span>:<span className="tag g">No</span>}</td><td>{b.Reason||"—"}</td><td className="mono">{b.Created||"—"}</td><td>{b.Expires||"Never"}</td></>}/>}
  </div>;
}

function PfProgression({ data, selected, toast }) {
  const ms=data.mothership||{};
  const rows=[{label:"Shift Credits",value:ms.shiftcredits?.currentcredits,sub:"Cap: "+(ms.shiftcredits?.capincreasesmax||0)},{label:"Cores",value:ms.juicerstatus?.corecount,sub:"Proc: "+(ms.juicerstatus?.processingpercent||0)+"%"},{label:"Overdrive",value:ms.juicerstatus?.overdrivesupply,sub:"Cap: "+(ms.juicerstatus?.overdrivecap||600)},{label:"Max Depth",value:ms.reactorstats?.maxdepthreached},{label:"Drill Lvl",value:ms.drillupgrades?.upgradelevel},{label:"Dock Wrist",value:"U1:"+(ms.dockwrist?.upgrade1level||0)+" U2:"+(ms.dockwrist?.upgrade2level||0)+" U3:"+(ms.dockwrist?.upgrade3level||0)},{label:"Prog Nodes",value:(ms.progressionnodes||[]).length},{label:"SI Inv",value:ms.siquests?"Active":"—"}];
  return <div className="pf-sub-content">
    <Panel style={{marginTop:12}}><h3 className="sh">Mothership Progression</h3><div className="grid-8">{rows.map((r,i)=><StatBox key={i} color="#00f0ff" label={r.label} value={r.value} sub={r.sub} delay={i*60}/>)}</div></Panel>
    {(ms.progressionnodes||[]).length>0&&<Panel style={{marginTop:12}}><h3 className="sh">Progression Nodes ({(ms.progressionnodes||[]).length})</h3><DataTable cols={["Tree ID","Node ID","Unlocked"]} rows={ms.progressionnodes||[]} renderRow={n=><><td className="c-cy">{n.treeid}</td><td className="mono">{n.nodeid}</td><td className="mono">{n.unlockedat||"—"}</td></>}/></Panel>}
    {(ms.mothershipuserdata||[]).length>0&&<Panel style={{marginTop:12}}><h3 className="sh">User Data ({(ms.mothershipuserdata||[]).length})</h3><DataTable cols={["Key","Value","Updated"]} rows={ms.mothershipuserdata||[]} renderRow={d=><><td className="c-cy">{d.keyname}</td><td className="mono">{(d.datavalue||"").slice(0,100)}</td><td className="mono">{d.updatedat||"—"}</td></>}/></Panel>}
  </div>;
}

function PfFriends({ selected, toast, navigate }) {
  const pfid=selected.playfabid; const [data,setData]=useState(null);
  const load=()=>{if(pfid)api("/admin/api/player/"+pfid+"/friends").then(setData).catch(()=>{});};
  useEffect(()=>{load();},[pfid]);
  return <div className="pf-sub-content">
    <Panel style={{marginTop:12}}><h3 className="sh">Friends {data&&<span className="c-dim">({data.count||0})</span>}</h3></Panel>
    {!data?<Skeleton h={200}/>:<DataTable cols={["PlayFab ID","Name","Platform","Online","Zone","Last Login"]} rows={data.friends||[]} empty="No friends."
      renderRow={f=><><td className="mono"><button className="bt cp" onClick={()=>navigate("PlayFab",f.playfabid)}>{f.playfabid}</button></td><td>{f.nickname||f.displayname||"—"}</td><td>{f.platform||"—"}</td><td>{f.online?<span className="dot on"/>:<span className="dot off"/>}{f.online?"Online":"Offline"}</td><td className="mono">{f.zone||"—"}</td><td className="mono">{(f.lastlogin||"").slice(0,16)}</td></>}/>}
  </div>;
}

function PfGhostGames({ selected, toast }) {
  const msid=selected.mothershipid; const [data,setData]=useState(null);
  const load=()=>{if(msid)api("/admin/api/ghostgames?mothershipid="+encodeURIComponent(msid)+"&limit=100").then(setData).catch(()=>{});};
  useEffect(()=>{load();},[msid]);
  return <div className="pf-sub-content">
    <Panel style={{marginTop:12}}><h3 className="sh">Ghost Game Sessions {data&&<span className="c-dim">({data.sessions?.length||0})</span>}</h3></Panel>
    {data?.stats&&<div className="grid-8"><StatBox color="#00f0ff" label="Total Sessions" value={data.stats.total||0}/><StatBox color="#39ff14" label="Unique Players" value={data.stats.uniquePlayers||0}/><StatBox color="#ffd700" label="Avg Cores" value={data.stats.avgCores||0}/><StatBox color="#ff00aa" label="Deaths" value={data.stats.totalDeaths||0}/></div>}
    {!data?null:<DataTable cols={["Time","Result","Cores","Collected","Spent","Gates","Deaths","Revives","Play Time","Version"]} rows={data.sessions||[]} empty="No sessions."
      renderRow={g=><><td className="mono c-cy">{(g.createdat||"").slice(0,16)}</td><td>{g.reason==="complete"?<span className="tag g">Complete</span>:<span className="tag r">{g.reason||"?"}</span>}</td><td>{g.final_cores_balance}</td><td>{g.total_cores_collected_by_player}</td><td>{g.total_cores_spent_by_player}</td><td>{g.gates_unlocked}</td><td>{g.died}</td><td>{g.revives}</td><td>{g.play_duration?(Math.round(g.play_duration/10000000/60*100)/100)+"m":"—"}</td><td className="mono">{(g.game_version||"").slice(0,20)}</td></>}/>}
  </div>;
}

function PfBulkOps({ selected, toast }) {
  const [ids,setIds]=useState(selected?.playfabid||""); const [itemIds,setItemIds]=useState(""); const [reason,setReason]=useState(""); const [vcAmt,setVcAmt]=useState(100),[vcCur,setVcCur]=useState("SI"); const [catVer,setCatVer]=useState("DLC");
  const targets=()=>ids.split(/[\n,]/).map(s=>s.trim()).filter(Boolean);
  const grant=()=>{const t=targets();const it=itemIds.split(",").map(s=>s.trim()).filter(Boolean);if(!t.length||!it.length)return;Promise.all(t.map(pfid=>api("/admin/api/pf/player/"+pfid+"/grant-items",{method:"POST",body:JSON.stringify({itemIds:it,catalogVersion:catVer})}).catch(e=>({error:e.message})))).then(rs=>{const ok=rs.filter(r=>!r.error).length;toast(`Granted to ${ok}/${t.length}`);});};
  const addVc=()=>{const t=targets();if(!t.length)return;Promise.all(t.map(pfid=>api("/admin/api/pf/player/"+pfid+"/add-vc",{method:"POST",body:JSON.stringify({amount:vcAmt,currency:vcCur})}).catch(()=>null))).then(()=>toast(`Added ${vcAmt} ${vcCur} to ${t.length}`));};
  const massBan=()=>{const t=targets();if(!t.length||!reason)return;if(!confirm(`Ban ${t.length} players?`))return;Promise.all(t.map(pfid=>api("/admin/api/pf/player/"+pfid+"/ban",{method:"POST",body:JSON.stringify({reason})}).catch(()=>null))).then(()=>toast(`Banned ${t.length}`));};
  return <div className="pf-sub-content"><Panel style={{marginTop:12}}><h3 className="sh">Bulk Operations</h3><div className="err fs-xs mb">WARNING: Irreversible.</div>
    <div className="mb"><label className="c-dim fs-xs" style={{display:"block",marginBottom:4}}>PlayFab IDs (one per line)</label><textarea className="inp" rows={4} value={ids} onChange={e=>setIds(e.target.value)}/></div>
    <h4 className="sh" style={{fontSize:13}}>Grant Items</h4><div className="fr mb" style={{flexWrap:"wrap"}}><input className="inp" placeholder="Item IDs" value={itemIds} onChange={e=>setItemIds(e.target.value)} style={{flex:1,minWidth:180}}/><input className="inp" placeholder="Catalog" value={catVer} onChange={e=>setCatVer(e.target.value)} style={{width:100}}/><button className="bt bt-g" onClick={grant}>Grant</button></div>
    <h4 className="sh" style={{fontSize:13}}>Add VC</h4><div className="fr mb" style={{flexWrap:"wrap"}}><input className="inp" type="number" value={vcAmt} onChange={e=>setVcAmt(parseInt(e.target.value)||0)} style={{width:120}}/><input className="inp" value={vcCur} onChange={e=>setVcCur(e.target.value)} style={{width:100}}/><button className="bt bt-g" onClick={addVc}>Add</button></div>
    <h4 className="sh" style={{fontSize:13}}>Mass Ban</h4><div className="fr mb"><input className="inp" placeholder="Reason" value={reason} onChange={e=>setReason(e.target.value)} style={{flex:1,minWidth:200}}/><button className="bt bt-d" onClick={massBan}>Ban All</button></div></Panel></div>;
}

// ═══════════════════ STANDALONE TABS ═══════════════════

function CatalogStandalone({ toast }) {
  const t=(msg)=>{if(toast)toast(msg);};
  const [cat,setCat]=useState(null); const [ver,setVer]=useState("DLC");
  const load=()=>api("/admin/api/pf/catalog?version="+ver).then(d=>setCat(d.data||d)).catch(()=>{});
  useEffect(()=>{load();},[]);
  return <div className="pg-enter"><h2 className="hdr">Catalog</h2>
    <div className="card fade-in" style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",padding:16,background:"var(--bg-panel)",border:"1px solid var(--border)",borderRadius:8}}><input className="inp" placeholder="Catalog version" value={ver} onChange={e=>setVer(e.target.value)} style={{maxWidth:200}}/><button className="bt bt-g" onClick={load}>Load</button></div>
    {!cat?<Skeleton h={200}/>:<><div className="c-dim fs-xs" style={{marginTop:8}}>{(cat.Catalog||[]).length} items in "{ver}"</div><DataTable cols={["Item ID","Display Name","Class","Container","Can B. Purchased"]} rows={(cat.Catalog||[]).slice(0,100)} renderRow={it=><><td className="mono">{it.ItemId}</td><td>{it.DisplayName||"—"}</td><td>{it.ItemClass||"—"}</td><td>{it.Container?.ItemId||"—"}</td><td>{it.CanBecomeCharacter?<span className="tag g">Yes</span>:"No"}</td></>}/></>}
  </div>;
}

function SharedGroupsStandalone({ toast }) {
  const t=(msg)=>{if(toast)toast(msg);};
  const [gid,setGid]=useState(""); const [group,setGroup]=useState(null); const [loading,setLoading]=useState(false); const [ek,setEk]=useState(""),[ev,setEv]=useState("");
  const lookup=()=>{if(!gid.trim())return;setLoading(true);api("/admin/api/pf/sharedgroup/"+gid.trim()).then(d=>setGroup(d.data||d)).catch(e=>t("Error: "+e.message)).finally(()=>setLoading(false));};
  const save=()=>{if(!ek)return;api("/admin/api/pf/sharedgroup/"+gid+"/data",{method:"POST",body:JSON.stringify({data:{[ek]:ev}})}).then(()=>{t("Updated!");setEk("");setEv("");lookup();}).catch(e=>t("Error: "+e.message));};
  return <div className="pg-enter"><h2 className="hdr">Shared Groups</h2>
    <Panel style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}><input className="inp" placeholder="Shared Group ID..." value={gid} onChange={e=>setGid(e.target.value)} onKeyDown={e=>e.key==="Enter"&&lookup()} style={{maxWidth:300,flex:1}}/><button className="bt bt-g" onClick={lookup}>Lookup</button></Panel>
    {loading&&<Skeleton h={160}/>}
    {group&&<>
      <Panel style={{marginTop:12}}><h3 className="sh">Members</h3><div className="mono" style={{wordBreak:"break-all"}}>{(group.Members||[]).join(", ")||"None"}</div></Panel>
      <Panel style={{marginTop:12}}><h3 className="sh">Set Data</h3><div className="fr mb" style={{flexWrap:"wrap"}}><input className="inp" placeholder="Key" value={ek} onChange={e=>setEk(e.target.value)} style={{width:200}}/><input className="inp" placeholder="Value" value={ev} onChange={e=>setEv(e.target.value)} style={{flex:1,minWidth:200}}/><button className="bt bt-g" onClick={save}>Save</button></div></Panel>
      <DataTable cols={["Key","Value","Permission","Updated"]} rows={Object.entries(group.Data||{}).map(([k,v])=>({key:k,value:v.Value,perm:v.Permission,updated:v.LastUpdated}))} renderRow={d=><><td className="c-cy">{d.key}</td><td className="mono">{(d.value||"").slice(0,120)}</td><td>{d.perm}</td><td className="mono">{d.updated}</td></>}/>
    </>}
  </div>;
}

function PfTitleStandalone({ toast }) {
  const t=(msg)=>{if(toast)toast(msg);};
  const [td,setTd]=useState(null); const [ti,setTi]=useState(null); const [tdk,setTdk]=useState(""),[tdv,setTdv]=useState(""); const [tik,setTik]=useState(""),[tiv,setTiv]=useState("");
  const load=()=>{api("/admin/api/pf/title/data").then(d=>setTd(d.data||d)).catch(()=>{});api("/admin/api/pf/title/internal").then(d=>setTi(d.data||d)).catch(()=>{});};
  useEffect(()=>{load();},[]);
  const sTd=()=>{if(!tdk)return;api("/admin/api/pf/title/data",{method:"POST",body:JSON.stringify({key:tdk,value:tdv})}).then(()=>{t("Saved!");setTdk("");setTdv("");load();}).catch(e=>t("Error: "+e.message));};
  const sTi=()=>{if(!tik)return;api("/admin/api/pf/title/internal-data",{method:"POST",body:JSON.stringify({key:tik,value:tiv})}).then(()=>{t("Saved!");setTik("");setTiv("");load();}).catch(e=>t("Error: "+e.message));};
  return <div className="pg-enter"><h2 className="hdr">PlayFab Title Data</h2>
    <Panel><h3 className="sh">Set Title Data</h3><div className="fr mb" style={{flexWrap:"wrap"}}><input className="inp" placeholder="Key" value={tdk} onChange={e=>setTdk(e.target.value)} style={{width:220}}/><input className="inp" placeholder="Value" value={tdv} onChange={e=>setTdv(e.target.value)} style={{flex:1,minWidth:220}}/><button className="bt bt-g" onClick={sTd}>Save</button></div></Panel>
    <Panel><h3 className="sh">Set Internal Data</h3><div className="fr mb" style={{flexWrap:"wrap"}}><input className="inp" placeholder="Key" value={tik} onChange={e=>setTik(e.target.value)} style={{width:220}}/><input className="inp" placeholder="Value" value={tiv} onChange={e=>setTiv(e.target.value)} style={{flex:1,minWidth:220}}/><button className="bt bt-d" onClick={sTi}>Save</button></div></Panel>
    {td&&<DataTable cols={["Key","Value"]} rows={Object.entries(td.Data||{}).map(([k,v])=>({key:k,value:v})).slice(0,50)} renderRow={d=><><td className="c-cy">{d.key}</td><td className="mono">{(d.value||"").slice(0,120)}</td></>}/>}
    {ti&&<Panel style={{marginTop:12}}><h3 className="sh">Internal Data ({Object.keys(ti.Data||{}).length})</h3><DataTable cols={["Key","Value"]} rows={Object.entries(ti.Data||{}).map(([k,v])=>({key:k,value:v})).slice(0,50)} renderRow={d=><><td className="c-mg">{d.key}</td><td className="mono">{(d.value||"").slice(0,120)}</td></>}/></Panel>}
  </div>;
}

// ═══════════════════ ROLE MANAGEMENT ═══════════════════

function RoleManager() {
  const [roles,setRoles]=useState(null); const [roleId,setRoleId]=useState(""); const [roleName,setRoleName]=useState(""); const [pPanel,setPPanel]=useState(false); const [pBan,setPBan]=useState(false); const [pPf,setPPf]=useState(false); const [editing,setEditing]=useState(false);
  const load=()=>api("/admin/api/roles").then(d=>setRoles(d.roles||[])).catch(()=>{});
  useEffect(()=>{load();},[]);
  const save=()=>{if(!roleId.trim()||!roleName.trim())return;api("/admin/api/roles",{method:"POST",body:JSON.stringify({role_id:roleId.trim(),name:roleName.trim(),perm_panel:pPanel,perm_ban:pBan,perm_playfab:pPf})}).then(()=>{setRoleId("");setRoleName("");setPPanel(false);setPBan(false);setPPf(false);setEditing(false);load();}).catch(()=>{});};
  const del=(id)=>{if(confirm("Delete role "+id+"?"))api("/admin/api/roles/"+encodeURIComponent(id),{method:"DELETE"}).then(load).catch(()=>{});};
  const edit=(r)=>{setRoleId(r.role_id);setRoleName(r.name);setPPanel(!!r.perm_panel);setPBan(!!r.perm_ban);setPPf(!!r.perm_playfab);setEditing(true);};
  return <div className="pg-enter"><h2 className="hdr">Role Management</h2>
    <Panel><h3 className="sh">{editing?"Edit":"Add New"} Role</h3><p className="c-dim fs-xs mb">Map a Discord role ID to panel permissions. Paste the role ID from Discord (Developer Mode → Right-click role → Copy ID).</p>
      <div className="fr mb" style={{flexWrap:"wrap"}}><input className="inp" placeholder="Discord Role ID" value={roleId} onChange={e=>setRoleId(e.target.value)} disabled={editing} style={{maxWidth:260}}/><input className="inp" placeholder="Name (e.g. Forest Helper)" value={roleName} onChange={e=>setRoleName(e.target.value)} style={{flex:1,minWidth:200}}/></div>
      <div className="fr mb" style={{gap:16,flexWrap:"wrap"}}><label className="pf-chk"><input type="checkbox" checked={pPanel} onChange={e=>setPPanel(e.target.checked)}/> Panel Access</label><label className="pf-chk"><input type="checkbox" checked={pBan} onChange={e=>setPBan(e.target.checked)}/> Ban Perms</label><label className="pf-chk"><input type="checkbox" checked={pPf} onChange={e=>setPPf(e.target.checked)}/> PlayFab Admin</label></div>
      <div className="fr" style={{gap:6}}><button className="bt bt-g" onClick={save}>{editing?"Update":"Add"}</button>{editing&&<button className="bt bt-d" onClick={()=>{setRoleId("");setRoleName("");setPPanel(false);setPBan(false);setPPf(false);setEditing(false);}}>Cancel</button>}</div></Panel>
    {!roles?<Skeleton h={160}/>:<DataTable cols={["Role ID","Name","Panel","Ban","PlayFab",""]} rows={roles} empty="No custom roles."
      renderRow={r=><><td className="mono c-cy">{r.role_id}</td><td style={{fontWeight:600}}>{r.name}</td><td>{r.perm_panel?<span className="tag g">Yes</span>:<span className="tag r">No</span>}</td><td>{r.perm_ban?<span className="tag g">Yes</span>:<span className="tag r">No</span>}</td><td>{r.perm_playfab?<span className="tag g">Yes</span>:<span className="tag r">No</span>}</td><td><button className="bt bt-g bt-xs" onClick={()=>edit(r)} style={{marginRight:4}}>Edit</button><button className="bt bt-d bt-xs" onClick={()=>del(r.role_id)}>×</button></td></>}/>}
  </div>;
}

// ─── Q&A Management ────────────────────────────────────────
function QAManager() {
  const [d,set]=useState(null); const [detail,setDetail]=useState(null); const [filter,setFilter]=useState("all"); const [answer,setAnswer]=useState({}); const [page,setPage]=useState(1);
  const load=()=>{const f=filter==="all"?"":filter;api("/admin/api/qa/questions?page="+page+"&limit=50"+(f?"&status="+f:"")).then(set).catch(()=>{});};
  useEffect(()=>{load();},[page,filter]);
  const view=(id)=>{api("/admin/api/qa/questions/"+id).then(setDetail).catch(()=>{});};
  const doAnswer=async(qid)=>{const t=answer[qid];if(!t||!t.trim())return;await api("/admin/api/qa/questions/"+qid+"/answer",{method:"POST",body:JSON.stringify({answer:t})});setAnswer(s=>({...s,[qid]:""}));load();if(detail&&detail.question&&detail.question.id==qid)view(qid);};
  const setStatus=(id,st)=>{api("/admin/api/qa/questions/"+id+"/status",{method:"POST",body:JSON.stringify({status:st})}).then(load).catch(()=>{});};
  const del=(id)=>{if(confirm("Delete this question and all answers?"))api("/admin/api/qa/questions/"+id,{method:"DELETE"}).then(()=>{setDetail(null);load();}).catch(()=>{});};
  return <div className="pg-enter"><h2 className="hdr">Q&A Management</h2>
    <div className="fr mb" style={{gap:6,flexWrap:"wrap"}}>
      {["all","pending","answered","closed"].map(f=><button key={f} className={`tab ${filter===f?"on":""}`} onClick={()=>{setFilter(f);setPage(1);}}>{f.charAt(0).toUpperCase()+f.slice(1)}</button>)}
    </div>
    {detail?<div><button className="bt bt-g bt-xs mb" onClick={()=>setDetail(null)}>&larr; Back</button>
      <Panel><h3 className="sh">#{detail.question.id}: {detail.question.question_text}</h3>
        <div className="c-dim fs-xs mb">By {detail.question.author_name} &middot; {detail.question.createdat?.slice(0,16)} &middot; Status: <span className={`tag ${detail.question.status==="answered"?"g":detail.question.status==="closed"?"r":"y"}`}>{detail.question.status}</span></div>
        <div className="fr mb" style={{gap:6,flexWrap:"wrap"}}>
          <button className="bt bt-g bt-xs" onClick={()=>setStatus(detail.question.id,"answered")}>Mark Answered</button>
          <button className="bt bt-y bt-xs" onClick={()=>setStatus(detail.question.id,"pending")}>Reopen</button>
          <button className="bt bt-d bt-xs" onClick={()=>setStatus(detail.question.id,"closed")}>Close</button>
          <button className="bt bt-d bt-xs" onClick={()=>del(detail.question.id)}>Delete</button>
        </div>
        <h3 className="sh" style={{marginTop:16}}>Answers ({(detail.answers||[]).length})</h3>
        {(detail.answers||[]).map(a=><div key={a.id} className="pn" style={{padding:"10px 14px",marginBottom:8,borderLeft:"3px solid var(--accent)"}}>
          <div className="c-dim fs-xs">{a.answered_by} &middot; {a.createdat?.slice(0,16)}</div>
          <div style={{marginTop:4}}>{a.answer_text}</div>
        </div>)}
        <div className="fr mt" style={{flexWrap:"wrap",gap:6}}>
          <textarea className="inp" rows={2} placeholder="Write an answer..." value={answer[detail.question.id]||""} onChange={e=>setAnswer(s=>({...s,[detail.question.id]:e.target.value}))} style={{flex:1,minWidth:200}}/>
          <button className="bt bt-g" onClick={()=>doAnswer(detail.question.id)}>Answer</button>
        </div>
      </Panel>
    </div>:
    !d?<Skeleton h={200}/>:<DataTable cols={["ID","Question","Author","Status","Answers","Created",""]} rows={d.questions||[]} empty="No questions."
      renderRow={q=><><td className="mono c-cy">{q.id}</td><td style={{maxWidth:300,overflow:"hidden",textOverflow:"ellipsis"}}>{q.question_text}</td><td>{q.author_name}</td><td><span className={`tag ${q.status==="answered"?"g":q.status==="closed"?"r":"y"}`}>{q.status}</span></td><td>{q.answer_count}</td><td className="mono">{(q.createdat||"").slice(0,10)}</td><td><button className="bt bt-g bt-xs" onClick={()=>view(q.id)}>View</button></td></>}/>}
    {d&&<div className="fr mt" style={{justifyContent:"space-between"}}><span className="c-dim">Page {d.page}/{Math.max(1,Math.ceil((d.total||0)/(d.limit||50)))}</span><div className="fr" style={{gap:6}}><button className="bt bt-g bt-xs" disabled={d.page<=1} onClick={()=>setPage(d.page-1)}>‹</button><button className="bt bt-g bt-xs" disabled={d.page>=Math.ceil((d.total||0)/(d.limit||50))} onClick={()=>setPage(d.page+1)}>›</button></div></div>}
  </div>;
}

// ─── Reports ─────────────────────────────────────────
function Reports() {
  const [d, set] = useState(null);
  const load = () => api("/admin/api/reports?limit=200").then(set).catch(() => {});
  useEffect(() => { load(); }, []);
  const del = (id) => { if (confirm("Delete?")) api("/admin/api/reports/" + id, { method: "DELETE" }).then(load).catch(() => {}); };
  return <div className="pg-enter"><h2 className="hdr">Player Reports {d && <span className="c-dim fs-sm">({d.total || 0})</span>}</h2>
    {!d ? <Skeleton h={200} /> : (
      <DataTable cols={["Time", "Reporter", "Reported", "Reason", "Room", ""]} rows={d.reports || []} empty="No reports yet."
        renderRow={r => <>
          <td className="mono c-cy">{(r.createdat || "").slice(0, 16)}</td>
          <td><div>{r.reporter_name || "—"}</div><div className="mono c-dim fs-xxs">{(r.reporter_playfabid || "").slice(0, 16)}</div></td>
          <td><div style={{ fontWeight: 600 }}>{r.reported_name || "—"}</div><div className="mono c-dim fs-xxs">{(r.reported_playfabid || "").slice(0, 16)}</div></td>
          <td><span className="tag r">{r.reason || "—"}</span></td>
          <td className="mono">{r.room_code || "—"}</td>
          <td><button className="bt bt-d bt-xs" onClick={() => del(r.id)}>×</button></td>
        </>} />
    )}
  </div>;
}

// ─── Dear Lemming ────────────────────────────────────────
function DearLemmings() {
  const [d,set]=useState(null);
  const load=()=>api("/admin/api/dearlemmings?limit=200").then(set).catch(()=>{});
  useEffect(()=>{load();},[]);
  const del=(id)=>{if(confirm("Delete?"))api("/admin/api/dearlemmings/"+id,{method:"DELETE"}).then(load).catch(()=>{});};
  return <div className="pg-enter"><h2 className="hdr">Dear Lemming {d&&<span className="c-dim fs-sm">({d.total||0})</span>}</h2>
    {!d?<Skeleton h={200}/>:<DataTable cols={["Time","Player","Message",""]} rows={d.messages||[]} empty="No submissions yet."
      renderRow={m=><><td className="mono c-cy">{(m.createdat||"").slice(0,16)}</td><td className="mono">{m.display_name||(m.mothershipid||"").slice(0,12)}</td><td>{m.message_text}</td><td><button className="bt bt-d bt-xs" onClick={()=>del(m.id)}>×</button></td></>}/>}
  </div>;
}

// ─── Game Updates ─────────────────────────────────────────
function Updates() {
  const [updated, setUpdated] = useState("");
  const [bugged, setBugged] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const send = async () => {
    if (!updated.trim() && !bugged.trim()) return;
    setSending(true);
    setDone(false);
    try {
      await api("/admin/api/updates", {
        method: "POST",
        body: JSON.stringify({ updated: updated.trim(), bugged: bugged.trim() }),
      });
      setDone(true);
      setUpdated("");
      setBugged("");
    } catch {}
    setSending(false);
  };

  return <div className="pg-enter">
    <h2 className="hdr">Post Game Update</h2>
    <Panel>
      <h3 className="sh"># __**UPDATED**__</h3>
      <textarea className="inp mb" rows={6} placeholder="List what was updated/fixed..." value={updated} onChange={e => setUpdated(e.target.value)} style={{ maxWidth: 600 }} />
      <h3 className="sh"># BUGGED:</h3>
      <textarea className="inp mb" rows={4} placeholder="List known bugs..." value={bugged} onChange={e => setBugged(e.target.value)} style={{ maxWidth: 600 }} />
      <button className="bt bt-g" onClick={send} disabled={sending}>
        {sending ? "Posting..." : done ? "✅ Posted!" : "Post to #updates"}
      </button>
    </Panel>
    {(updated || bugged) && <Panel style={{ marginTop: 16 }}>
      <h3 className="sh">Preview</h3>
      <div style={{ background: "var(--bg)", padding: 16, borderRadius: 8, border: "1px solid var(--border)", maxWidth: 600 }}>
        {updated && <><div style={{ color: "#00f0ff", fontWeight: 700, fontSize: 18, marginBottom: 4 }}># __**UPDATED**__</div><div style={{ whiteSpace: "pre-wrap", marginBottom: 16 }}>{updated}</div></>}
        {bugged && <><div style={{ color: "#ff3366", fontWeight: 700, fontSize: 18, marginBottom: 4 }}># BUGGED:</div><div style={{ whiteSpace: "pre-wrap" }}>{bugged}</div></>}
      </div>
    </Panel>}
  </div>;
}

// ═══════════════════ APP ═══════════════════
const PAGES = { Dashboard, Players, Shifts, Maps, Polls, "Title Data": TitleData, Events, Recent, Bans, PlayFab: PlayFabConsole, Catalog: CatalogStandalone, "Shared Groups": SharedGroupsStandalone, "PF Title": PfTitleStandalone, Roles: RoleManager, Lemming: DearLemmings, "Q&A": QAManager, Reports, Updates };

export default function App() {
  const tabFromHash = () => {
    const hash = window.location.hash.replace("#/", "").replace("#", "");
    const [t, ...rest] = hash.split(":");
    if (TABS.includes(t)) return { tab: t, param: rest.join(":") || "" };
    return { tab: "Dashboard", param: "" };
  };
  const init = tabFromHash();
  const [tab,setTab]=useState(init.tab); const [tabParam,setTabParam]=useState(init.param); const [user,setUser]=useState(null); const [userErr,setUserErr]=useState(false); const [perms,setPerms]=useState({panel:true,ban:false,playfab:false,owner:false}); const [light,setLight]=useState(()=>localStorage.getItem("gt-theme")==="light"); const Page=PAGES[tab];

  const navigate = (t, param) => {
    setTab(t);
    setTabParam(param || "");
    history.pushState(null, "", "#/" + t + (param ? ":" + param : ""));
  };

  const toggleTheme = () => {
    const next = !light;
    setLight(next);
    localStorage.setItem("gt-theme", next ? "light" : "dark");
  };

  useEffect(()=>{fetch("/admin/api/me").then(r=>r.json()).then(d=>{if(d.username){setUser(d);setPerms(d.permissions||{panel:true,ban:false,playfab:false,owner:false});_csrfToken=d.csrfToken||"";}else setUserErr(true);}).catch(()=>setUserErr(true));},[]);
  const visibleTabs=TABS.filter(t=>{if(t==="PlayFab"&&!perms.playfab)return false;if(t==="Bans"&&!perms.ban)return false;if(t==="Roles"&&!perms.owner)return false;if(t==="Updates"&&!perms.owner)return false;return true;});
  return <div id="app" data-theme={light?"light":"dark"}><div className="bg-grid"/><div className="bg-glow"/>
    <div className="sidebar">
      <div className="brand"><div className="brand-icon">◆</div><div className="brand-name">PROJECT RS</div><div className="brand-sub">MOTHERSHIP PANEL</div></div><div className="brand-line"/>
      <nav>{visibleTabs.map(t=><button key={t} className={`nav-item ${tab===t?"on":""}`} onClick={()=>navigate(t)}><span className="nav-icon">{ICONS[t]}</span>{t}{tab===t&&<span className="nav-mark"/>}</button>)}</nav>
      <div className="spacer"/>
      <button className="nav-item theme-toggle" onClick={toggleTheme} title="Toggle theme">
        <span className="nav-icon">{light ? "☀" : "☾"}</span>{light ? "Light Mode" : "Dark Mode"}
      </button>
      <div className="user-box">
        <div className="user-avatar-wrap">{user?<img src={user.avatarUrl} alt="" className="user-avatar" onError={e=>{e.target.style.display="none";}}/>:<div className="user-avatar" style={{background:"rgba(0,240,255,0.1)"}}/>}<div className="user-status"/></div>
        <div className="user-info"><div className="user-name">{user?user.username:"..."}</div><div className="user-role">{perms.owner?"OWNER":(perms.ban||perms.playfab)?"MODERATOR":"ADMINISTRATOR"}</div>{perms.owner&&<div className="user-badge" style={{color:"#ffd700",borderColor:"rgba(255,215,0,0.3)"}}>OWNER</div>}{perms.playfab&&<div className="user-badge">PF ADMIN</div>}{perms.ban&&!perms.playfab&&!perms.owner&&<div className="user-badge">BAN PERMS</div>}</div>
        <a href="/admin/logout" className="user-logout">⎋ Sign Out</a>
      </div>
    </div>
    <div className="main"><div className="scanline-left"/>        {!user&&!userErr?<div className="app-load"><div className="spinner-lg"/><p className="c-dim fs-sm">Initializing console...</p></div>:(
          tab === "Players" ? <Players key={tab} navigate={navigate} /> :
          tab === "PlayFab" ? <PlayFabConsole key={`${tab}:${tabParam}`} searchId={tabParam} navigate={navigate} /> :
          <Page key={tab} />
        )}</div>
  </div>;
}
