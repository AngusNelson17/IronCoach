import React, { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DEFAULT_PLANNER, plannerToCalendarEvents, APP_TIMEZONE } from "./data/planner.js";

// ─── THEME ───────────────────────────────────────────────────────────────────
// Wahoo-SYSTM-ish dark palette: deep near-black bases, brighter saturated
// accents, refined neutrals between them.
const T = {
  bg:"#08080a", bg2:"#101013", bg3:"#16161b", bg4:"#1f1f25",
  border:"#22222a", border2:"#33333d",
  text:"#fafafa", text2:"#a8a8b3", text3:"#646470",
  teal:"#00d4aa", tealDim:"#003832",
  blue:"#3b82f6", blueDim:"#0a1e3a",
  amber:"#f59e0b", amberDim:"#2a1f00",
  red:"#ef4444", redDim:"#2a0f0f",
  purple:"#a78bfa", purpleDim:"#1a1030",
  green:"#22c55e", greenDim:"#0a2010",
  strava:"#fc4c02",
};

// ─── SPORT ICONS (line art, scale to currentColor) ──────────────────────────
const SPORT_ICON_PATHS = {
  Swim: "M2 16c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 10c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2",
  Bike: "M5.5 17.5a3 3 0 100-6 3 3 0 000 6zM18.5 17.5a3 3 0 100-6 3 3 0 000 6zM14.5 14.5l-3-7-3 3 3 3M11 4h3M8 7h4",
  Run:  "M13 4a2 2 0 11-4 0 2 2 0 014 0zM6.5 18l2-4 2-1 1-4 3 1 3 3-2 2-2-1M11 22l-2-5",
  Gym:  "M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12",
  Row:  "M3 17l3-1 4 4 12-8-3-3-5 3-3-3-5 3-3 5z",
  Walk: "M13 4a2 2 0 11-4 0 2 2 0 014 0zM9 22l-1-7 2-3-1-5 3-1 3 3-1 4 3 4",
  Football: "M12 2a10 10 0 100 20 10 10 0 000-20zM12 7l-3 3 1 4 4 1 3-3-1-4z",
  Mobility: "M12 6a2 2 0 100-4 2 2 0 000 4zM7 22l3-9 4 4 3-1M11 13l-2-5",
  Brick: "M3 6h18v4H3zM3 14h18v4H3z",
  Other: "M12 2v20M2 12h20",
};
function SportIcon({ type, size = 18, style }) {
  const d = SPORT_ICON_PATHS[type] || SPORT_ICON_PATHS.Other;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d={d}/>
    </svg>
  );
}

const RACE_DATE = new Date("2027-12-05");
const STORAGE_KEY = "gus-ironman-dashboard";

// ─── REAL STRAVA SEED DATA (synced 10 Jun 2026) ─────────────────────────────
const SEED_ACTIVITIES = [
  {id:"18857263927",name:"Upper B Variation (Wednesday)",type:"Gym",date:"2026-06-10",dist:0,mins:17,cal:247,src:"strava"},
  {id:"18847921298",name:"Lower A Variation (Tuesday PM)",type:"Gym",date:"2026-06-09",dist:0,mins:59,cal:284,src:"strava"},
  {id:"18843337297",name:"Morning Row",type:"Row",date:"2026-06-09",dist:0,mins:17,cal:241,src:"strava"},
  {id:"18843111437",name:"Core / Push-Up Challenge",type:"Gym",date:"2026-06-09",dist:0,mins:27,cal:156,src:"strava"},
  {id:"18831470325",name:"Morning Swim",type:"Swim",date:"2026-06-08",dist:2100,mins:43,cal:706,src:"strava"},
  {id:"18803816589",name:"Morning Ride",type:"Bike",date:"2026-06-06",dist:38977,mins:87,cal:1340,elev:488,src:"strava"},
  {id:"18776235292",name:"Morning Swim",type:"Swim",date:"2026-06-04",dist:1900,mins:41,cal:680,src:"strava"},
  {id:"18767252554",name:"Evening Row",type:"Row",date:"2026-06-03",dist:0,mins:11,cal:134,src:"strava"},
  {id:"18740028962",name:"Evening Swim",type:"Swim",date:"2026-06-01",dist:2175,mins:43,cal:704,src:"strava"},
  {id:"18710209358",name:"Afternoon Swim",type:"Swim",date:"2026-05-30",dist:2050,mins:43,cal:789,src:"strava"},
  {id:"18653857378",name:"Morning Ride (Commute)",type:"Bike",date:"2026-05-26",dist:8145,mins:22,cal:262,src:"strava"},
  {id:"18646315782",name:"Evening Swim",type:"Swim",date:"2026-05-25",dist:2225,mins:44,cal:733,src:"strava"},
  {id:"18616004586",name:"Lunch Ride",type:"Bike",date:"2026-05-23",dist:44635,mins:108,cal:1412,elev:478,src:"strava"},
  {id:"18592315752",name:"Evening Run (test)",type:"Run",date:"2026-05-21",dist:616,mins:7,cal:76,src:"strava"},
  {id:"18592315763",name:"Afternoon Run (test)",type:"Run",date:"2026-05-21",dist:2508,mins:18,cal:394,src:"strava"},
  {id:"18536550885",name:"GOR 44KM MARA 2026",type:"Run",date:"2026-05-17",dist:44571,mins:218,cal:4728,note:"Marathon — injury trigger",src:"strava"},
  {id:"18524335318",name:"Shake Out",type:"Run",date:"2026-05-16",dist:5429,mins:26,cal:578,src:"strava"},
];

// DEFAULT_PLANNER + plannerToCalendarEvents live in ./data/planner.js so the
// Vercel cron sync (web/api/google/cron-sync.js) can import the same data.

const PHASES = [
  {id:"recovery",name:"Recovery",start:"2026-06-03",end:"2026-08-09",color:T.teal},
  {id:"travel",name:"Europe",start:"2026-08-10",end:"2026-11-15",color:T.amber},
  {id:"base",name:"Base",start:"2026-11-16",end:"2027-06-30",color:T.blue},
  {id:"build",name:"Build",start:"2027-07-01",end:"2027-10-10",color:T.purple},
  {id:"peak",name:"Peak",start:"2027-10-11",end:"2027-11-14",color:"#ec4899"},
  {id:"taper",name:"Taper",start:"2027-11-15",end:"2027-12-04",color:T.red},
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const todayStr = () => new Date().toISOString().split("T")[0];
const daysToRace = () => Math.max(0, Math.floor((RACE_DATE - new Date()) / 86400000));
const currentPhase = () => PHASES.find(p => { const n = new Date(); return n >= new Date(p.start) && n <= new Date(p.end); }) || PHASES[0];
const weekStartOf = (ds) => { const d = new Date(ds); const day = d.getDay(); d.setDate(d.getDate() - day + (day === 0 ? -6 : 1)); return d.toISOString().split("T")[0]; };

const typeColor = (t) => ({Swim:T.blue,Bike:T.teal,Run:T.purple,Gym:T.amber,Row:T.green,Walk:T.text3,Football:"#14b8a6",Brick:T.red,Mobility:T.text3}[t] || T.text2);
const typeDim = (t) => ({Swim:T.blueDim,Bike:T.tealDim,Run:T.purpleDim,Gym:T.amberDim,Row:T.greenDim,Brick:T.redDim}[t] || T.bg3);

const fmtDist = (m, type) => {
  if (!m) return null;
  if (type === "Swim") return `${m}m`;
  return `${(m/1000).toFixed(1)}km`;
};

// ─── STORAGE (artifact-safe persistent storage) ──────────────────────────────
async function loadState() {
  try {
    const r = await window.storage.get(STORAGE_KEY);
    return r ? JSON.parse(r.value) : null;
  } catch { return null; }
}
async function saveState(state) {
  try { await window.storage.set(STORAGE_KEY, JSON.stringify(state)); } catch (e) { console.error("save failed", e); }
}

// ─── STRAVA LIVE SYNC via our /api/strava/sync serverless function ──────────
async function syncStrava() {
  const r = await fetch("/api/strava/sync");
  if (!r.ok) {
    let detail = "";
    try { detail = (await r.json()).error || ""; } catch {}
    throw new Error(detail || `HTTP ${r.status}`);
  }
  return await r.json();
}

// ─── SMALL COMPONENTS ────────────────────────────────────────────────────────
const Card = ({ title, children, accent, style, hoverable = true, eyebrow }) => (
  <div className={hoverable ? "card-hover" : ""} style={{
    background:T.bg2,
    border:`1px solid ${T.border}`,
    borderLeft:accent?`3px solid ${accent}`:`1px solid ${T.border}`,
    borderRadius:12,
    padding:"18px 20px",
    boxShadow:"0 1px 0 rgba(255,255,255,0.02) inset, 0 8px 24px -16px rgba(0,0,0,0.6)",
    ...style
  }}>
    {(title || eyebrow) && (
      <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:14}}>
        {title && <div className="eyebrow">{title}</div>}
        {eyebrow && <div style={{fontSize:11,color:T.text3,fontWeight:500}}>{eyebrow}</div>}
      </div>
    )}
    {children}
  </div>
);

const Badge = ({ children, color, dim }) => (
  <span style={{
    display:"inline-flex",alignItems:"center",gap:4,
    padding:"3px 10px",borderRadius:999,
    fontSize:10.5,fontWeight:700,letterSpacing:".02em",
    background:dim,color,
    border:`1px solid ${color}22`,
  }}>{children}</span>
);

const Btn = ({ children, onClick, primary, small, disabled, style }) => (
  <button onClick={onClick} disabled={disabled} style={{
    display:"inline-flex",alignItems:"center",justifyContent:"center",gap:7,
    padding:small?"6px 12px":"9px 18px",borderRadius:8,
    fontSize:small?12:13,fontWeight:600,letterSpacing:".01em",
    cursor:disabled?"default":"pointer",
    border:`1px solid ${primary?T.teal:T.border}`,
    background:primary?T.teal:T.bg3,color:primary?"#000":T.text,
    opacity:disabled?0.45:1,
    boxShadow:primary?`0 6px 16px -8px ${T.teal}99`:"none",
    ...style
  }}>{children}</button>
);

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function IronmanDashboard() {
  const [tab, setTab] = useState("dashboard");
  const [activities, setActivities] = useState(SEED_ACTIVITIES);
  const [planner, setPlanner] = useState(DEFAULT_PLANNER);
  const [checked, setChecked] = useState({});   // {weekStart: {sessionId: true}}
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [lastSync, setLastSync] = useState("2026-06-10 (seed)");
  const [diary, setDiary] = useState({});          // {dateStr: {mood, sleep, rpe, body, fuel, reflection, injury}}
  const [loaded, setLoaded] = useState(false);

  // load persisted state
  useEffect(() => {
    (async () => {
      const s = await loadState();
      if (s) {
        if (s.activities?.length) setActivities(s.activities);
        if (s.checked) setChecked(s.checked);
        if (s.lastSync) setLastSync(s.lastSync);
        if (s.planner) setPlanner(s.planner);
        if (s.diary) setDiary(s.diary);
      }
      setLoaded(true);
    })();
  }, []);

  // persist on change
  useEffect(() => {
    if (!loaded) return;
    saveState({ activities, checked, lastSync, planner, diary });
  }, [activities, checked, lastSync, planner, diary, loaded]);

  const doSync = useCallback(async () => {
    setSyncing(true);
    setSyncMsg("Calling Strava via Claude…");
    try {
      const fresh = await syncStrava();
      const known = new Set(activities.map(a => String(a.id)));
      const newOnes = fresh.filter(a => !known.has(String(a.id))).map(a => ({...a, src:"strava"}));
      if (newOnes.length) {
        setActivities(prev => [...newOnes, ...prev].sort((a,b)=>b.date.localeCompare(a.date)));
        setSyncMsg(`✓ ${newOnes.length} new ${newOnes.length===1?"activity":"activities"} synced`);
      } else {
        setSyncMsg("✓ Up to date — no new activities");
      }
      setLastSync(new Date().toLocaleString());
    } catch (e) {
      setSyncMsg(`Sync failed: ${e.message}. Ask Claude in chat to sync instead.`);
    }
    setSyncing(false);
    setTimeout(() => setSyncMsg(""), 6000);
  }, [activities]);

  const allSessions = [...activities].sort((a,b)=>b.date.localeCompare(a.date));
  const thisWeekStart = weekStartOf(todayStr());
  const thisWeek = allSessions.filter(s => weekStartOf(s.date) === thisWeekStart);
  const phase = currentPhase();
  const wkChecked = checked[thisWeekStart] || {};

  // weekly aggregates for charts
  const weeklyData = (() => {
    const map = {};
    allSessions.forEach(s => {
      const ws = weekStartOf(s.date);
      if (!map[ws]) map[ws] = {week:ws, Swim:0, Bike:0, Run:0, Gym:0, hrs:0};
      if (s.type === "Swim") map[ws].Swim += (s.dist||0)/1000;
      if (s.type === "Bike") map[ws].Bike += (s.dist||0)/1000;
      if (s.type === "Run") map[ws].Run += (s.dist||0)/1000;
      if (s.type === "Gym" || s.type === "Row") map[ws].Gym += 1;
      map[ws].hrs += (s.mins||0)/60;
    });
    return Object.values(map).sort((a,b)=>a.week.localeCompare(b.week)).slice(-8)
      .map(w => ({...w, label: new Date(w.week).toLocaleDateString("default",{month:"short",day:"numeric"}),
        Swim:+w.Swim.toFixed(1), Bike:+w.Bike.toFixed(1), Run:+w.Run.toFixed(1), hrs:+w.hrs.toFixed(1)}));
  })();

  const cd = (() => { const d = daysToRace(); return {months:Math.floor(d/30.44), weeks:Math.floor((d%30.44)/7), days:Math.floor(d%7), total:d}; })();

  // ── TABS ──
  const tabs = [
    {id:"dashboard",label:"Dashboard"},
    {id:"planner",label:"Planner"},
    {id:"diary",label:"Diary"},
    {id:"feed",label:"Activity feed"},
    {id:"analytics",label:"Analytics"},
    {id:"plan",label:"Race plan"},
    {id:"settings",label:"Settings"},
  ];

  return (
    <div style={{color:T.text,minHeight:"100vh",fontSize:14}}>
      {/* Header */}
      <div className="header-hero" style={{
        borderBottom:`1px solid ${T.border}`,
        padding:"22px 28px 18px",
        display:"flex",alignItems:"center",justifyContent:"space-between",
        flexWrap:"wrap",gap:16,
        background:`linear-gradient(180deg, ${T.bg2} 0%, ${T.bg} 100%)`,
        position:"sticky",top:0,zIndex:50,
        backdropFilter:"blur(8px)",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:16}}>
          <div style={{
            width:52,height:52,borderRadius:14,
            background:`linear-gradient(135deg, ${T.teal} 0%, ${T.blue} 100%)`,
            display:"flex",alignItems:"center",justifyContent:"center",
            fontSize:20,fontWeight:800,color:"#000",flexShrink:0,
            boxShadow:`0 8px 22px -8px ${T.teal}77`,
            letterSpacing:"-.02em",
          }}>IC</div>
          <div>
            <div className="eyebrow" style={{color:T.text3}}>Ironman 70.3 Western Australia · 5 Dec 2027</div>
            <div style={{fontSize:22,fontWeight:800,marginTop:3,letterSpacing:"-.02em",color:T.text}}>Angus Nelson</div>
            <div style={{fontSize:12.5,color:T.text2,marginTop:4,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <span>Sub 5:00 target</span>
              <span style={{color:T.border2}}>·</span>
              <span className="tabular" style={{color:T.teal,fontWeight:700,fontSize:13.5}}>{cd.total} days</span>
              <span style={{color:T.border2}}>·</span>
              <span>Phase <span style={{color:phase.color,fontWeight:700}}>{phase.name}</span></span>
            </div>
          </div>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          {syncMsg && <span style={{fontSize:12,color:syncMsg.startsWith("✓")?T.green:T.amber}}>{syncMsg}</span>}
          <Btn onClick={doSync} disabled={syncing} style={{borderColor:T.strava,color:T.strava,background:"transparent"}}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
            {syncing ? "Syncing…" : "Sync Strava"}
          </Btn>
        </div>
      </div>

      {/* Tab nav — pill style, sticky under header */}
      <div style={{
        display:"flex",gap:4,padding:"10px 28px",
        borderBottom:`1px solid ${T.border}`,
        overflowX:"auto",alignItems:"center",
        background:`${T.bg}cc`,
        backdropFilter:"blur(6px)",
        position:"sticky",top:104,zIndex:40,
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} className="tab-pill" style={{
            padding:"8px 14px",fontSize:13,cursor:"pointer",
            background:tab===t.id?`${T.teal}1a`:"transparent",
            border:`1px solid ${tab===t.id?`${T.teal}44`:"transparent"}`,
            borderRadius:8,
            color:tab===t.id?T.teal:T.text2,
            fontWeight:tab===t.id?700:500,whiteSpace:"nowrap",letterSpacing:".01em",
          }}>{t.label}</button>
        ))}
        <div className="hide-mobile" style={{marginLeft:"auto",fontSize:11,color:T.text3,padding:"8px 0",whiteSpace:"nowrap"}}>
          Last sync: <span className="tabular">{lastSync}</span>
        </div>
      </div>

      <div className="content-pad" style={{padding:"24px 28px",maxWidth:1200,margin:"0 auto"}}>

        {/* ═══ DASHBOARD ═══ */}
        {tab === "dashboard" && (
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {/* Countdown + phase bar */}
            <Card title="Race countdown" eyebrow="Busselton WA · 5 Dec 2027">
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:18}}>
                {[[cd.months,"Months"],[cd.weeks,"Weeks"],[cd.days,"Days"],[cd.total,"Total days"]].map(([v,l],i)=>(
                  <div key={l} style={{
                    background:`linear-gradient(160deg, ${T.bg3} 0%, ${T.bg2} 100%)`,
                    border:`1px solid ${T.border}`,
                    borderRadius:10,padding:"16px 10px",textAlign:"center",
                  }}>
                    <div className="tabular metric-num" style={{
                      fontSize:i===3?36:32,fontWeight:800,
                      color:i===3?T.teal:T.text,lineHeight:1,letterSpacing:"-.02em",
                    }}>{v}</div>
                    <div className="eyebrow" style={{marginTop:6,color:T.text3}}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",height:6,borderRadius:3,overflow:"hidden"}}>
                {PHASES.map(p=>{
                  const n=new Date(),s=new Date(p.start),e=new Date(p.end);
                  const total=new Date(PHASES[PHASES.length-1].end)-new Date(PHASES[0].start);
                  return <div key={p.id} style={{flex:`0 0 ${(e-s)/total*100}%`,background:n>e?T.border2:(n>=s&&n<=e)?p.color:T.bg3}}/>;
                })}
              </div>
              <div style={{display:"flex",gap:12,marginTop:8,flexWrap:"wrap"}}>
                {PHASES.map(p=><span key={p.id} style={{fontSize:11,color:T.text3,display:"flex",alignItems:"center",gap:4}}><span style={{width:8,height:8,borderRadius:"50%",background:p.color}}/>{p.name}</span>)}
              </div>
            </Card>

            {/* This week + injury */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(300px,1fr))",gap:16}}>
              <Card title={`This week (${thisWeek.length} sessions)`}>
                {(() => {
                  const counts = {Swim:0,Bike:0,Run:0,Gym:0};
                  thisWeek.forEach(s => { if (s.type in counts) counts[s.type]++; if (s.type==="Row") counts.Gym++; });
                  const targets = {Swim:3,Bike:3,Run:0,Gym:3}; // recovery phase, run per physio
                  return (
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                      {Object.entries(counts).map(([k,v])=>(
                        <div key={k} style={{background:T.bg3,borderRadius:6,padding:"10px 12px"}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                            <span style={{fontSize:12,color:T.text2}}>{k}{k==="Run"&&<span style={{color:T.amber}}> ⚠</span>}</span>
                            <span style={{fontSize:13,fontWeight:600,color:v>=targets[k]&&targets[k]>0?T.green:T.text2}}>{v}{targets[k]>0?`/${targets[k]}`:""}</span>
                          </div>
                          <div style={{height:3,background:T.bg4,borderRadius:2}}>
                            <div style={{height:"100%",width:targets[k]>0?`${Math.min(v/targets[k],1)*100}%`:"0%",background:typeColor(k),borderRadius:2}}/>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <div style={{fontSize:11,color:T.text3,marginTop:10}}>Run target is 0 until physio clears running (~Jun 17, brace + grass only)</div>
              </Card>

              <Card title="Injury — peroneal tendon" accent={T.amber}>
                <div style={{fontSize:13,color:T.text2,lineHeight:1.7,marginBottom:10}}>
                  Marathon May 17 → tendon split confirmed. Boot phase done. Next milestone: <strong style={{color:T.amber}}>first runs ~Jun 17</strong> (10km/wk max, ankle brace, grass/treadmill).
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  <Badge color={T.green} dim={T.greenDim}>✓ Swim OK</Badge>
                  <Badge color={T.green} dim={T.greenDim}>✓ Bike OK</Badge>
                  <Badge color={T.green} dim={T.greenDim}>✓ Gym OK</Badge>
                  <Badge color={T.amber} dim={T.amberDim}>⚠ Run — wait</Badge>
                </div>
              </Card>
            </div>

            {/* Recent activity */}
            <Card title="Recent activity (live from Strava)">
              {allSessions.slice(0,6).map(a => <ActivityRow key={a.id} a={a}/>)}
            </Card>
          </div>
        )}

        {/* ═══ WEEKLY PLANNER ═══ */}
        {tab === "planner" && (
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <Card>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:8}}>
                <div>
                  <div style={{fontSize:15,fontWeight:600}}>2026 weekly training template</div>
                  <div style={{fontSize:12,color:T.text3,marginTop:3}}>Week of {new Date(thisWeekStart).toLocaleDateString("default",{day:"numeric",month:"long"})} · tick sessions as you complete them · ⚠ = wait for physio clearance</div>
                </div>
                <div style={{fontSize:12,color:T.text2}}>
                  {Object.values(wkChecked).filter(Boolean).length} / {planner.reduce((a,d)=>a+d.sessions.length,0)} done
                </div>
              </div>
            </Card>

            {planner.map(day => {
              const doneCount = day.sessions.filter(s => wkChecked[s.id]).length;
              return (
                <Card key={day.day} style={{padding:"14px 18px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <span style={{fontSize:14,fontWeight:600}}>{day.day}</span>
                    <span style={{fontSize:12,color:doneCount===day.sessions.length?T.green:T.text3}}>{doneCount}/{day.sessions.length}</span>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {day.sessions.map(s => {
                      const done = !!wkChecked[s.id];
                      return (
                        <label key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:6,background:done?typeDim(s.type):T.bg3,cursor:"pointer",opacity:done?0.75:1,border:`1px solid ${done?typeColor(s.type)+"44":"transparent"}`}}>
                          <input type="checkbox" checked={done} onChange={() => setChecked(c => ({...c,[thisWeekStart]:{...(c[thisWeekStart]||{}),[s.id]:!done}}))}
                            style={{accentColor:typeColor(s.type),width:15,height:15,cursor:"pointer"}}/>
                          {s.time && (
                            <span style={{fontFamily:"ui-monospace,SFMono-Regular,Menlo,monospace",fontSize:12,color:T.text3,minWidth:46,textAlign:"right"}}>{s.time}</span>
                          )}
                          <span style={{flex:1,fontSize:13,color:done?T.text2:T.text,textDecoration:done?"line-through":"none"}}>
                            {s.label}
                            {s.mins && <span style={{color:T.text3,fontSize:11,marginLeft:6}}>· {s.mins}min</span>}
                            {s.caution && <span style={{color:T.amber,marginLeft:6,fontSize:11}}>⚠ physio</span>}
                          </span>
                          <Badge color={typeColor(s.type)} dim={typeDim(s.type)}>{s.type}</Badge>
                        </label>
                      );
                    })}
                  </div>
                </Card>
              );
            })}

            <Card accent={T.amber}>
              <div style={{fontSize:12,color:T.text2,lineHeight:1.7}}>
                <strong style={{color:T.amber}}>Coach's note:</strong> This template is your full-fitness week. Right now (recovery phase), skip the ⚠ run and football sessions until each physio milestone clears. The Wednesday tempo run becomes a walk or extra swim; football skills return Week 6 (Jul 1) with brace.
              </div>
            </Card>
          </div>
        )}

        {/* ═══ ACTIVITY FEED ═══ */}
        {tab === "feed" && (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <div style={{fontSize:13,color:T.text2}}>{allSessions.length} activities · Strava</div>
              <Btn small onClick={doSync} disabled={syncing} style={{borderColor:T.strava,color:T.strava,background:"transparent"}}>
                {syncing ? "Syncing…" : "↻ Sync Strava"}
              </Btn>
            </div>
            {allSessions.map(a => <ActivityRow key={a.id} a={a} detailed/>)}
          </div>
        )}

        {/* ═══ ANALYTICS ═══ */}
        {tab === "analytics" && (
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
              {(() => {
                const tot = {Swim:0,Bike:0,Run:0,sessions:allSessions.length,hrs:0};
                allSessions.forEach(s => {
                  if (s.type==="Swim") tot.Swim += (s.dist||0);
                  if (s.type==="Bike") tot.Bike += (s.dist||0)/1000;
                  if (s.type==="Run") tot.Run += (s.dist||0)/1000;
                  tot.hrs += (s.mins||0)/60;
                });
                return [
                  {l:"Sessions",v:tot.sessions,u:"",c:T.teal},
                  {l:"Hours",v:tot.hrs.toFixed(0),u:"h",c:T.text},
                  {l:"Swim",v:(tot.Swim/1000).toFixed(1),u:"km",c:T.blue},
                  {l:"Bike",v:tot.Bike.toFixed(0),u:"km",c:T.teal},
                  {l:"Run",v:tot.Run.toFixed(0),u:"km",c:T.purple},
                ].map(m=>(
                  <div key={m.l} className="card-hover" style={{
                    background:`linear-gradient(160deg, ${T.bg2} 0%, ${T.bg3} 100%)`,
                    border:`1px solid ${T.border}`,borderRadius:12,padding:"16px 18px",
                    boxShadow:"0 1px 0 rgba(255,255,255,0.02) inset",
                  }}>
                    <div className="eyebrow" style={{color:T.text3,marginBottom:8}}>{m.l}</div>
                    <div className="tabular metric-num" style={{fontSize:28,fontWeight:800,color:m.c,letterSpacing:"-.02em",lineHeight:1}}>
                      {m.v}<span style={{fontSize:13,color:T.text3,fontWeight:600,marginLeft:3}}>{m.u}</span>
                    </div>
                  </div>
                ));
              })()}
            </div>

            <Card title="Weekly distance by discipline (km)">
              <div style={{width:"100%",height:220}}>
                <ResponsiveContainer>
                  <BarChart data={weeklyData}>
                    <CartesianGrid stroke={T.border} strokeDasharray="2 4" vertical={false}/>
                    <XAxis dataKey="label" tick={{fill:T.text3,fontSize:11}} stroke="transparent" tickLine={false}/>
                    <YAxis tick={{fill:T.text3,fontSize:11}} stroke="transparent" tickLine={false} width={32}/>
                    <Tooltip contentStyle={{background:T.bg2,border:`1px solid ${T.border2}`,borderRadius:8,fontSize:12,boxShadow:"0 8px 24px rgba(0,0,0,0.5)"}} labelStyle={{color:T.text,fontWeight:600,marginBottom:4}} cursor={{fill:`${T.text}08`}}/>
                    <Bar dataKey="Swim" fill={T.blue} radius={[2,2,0,0]}/>
                    <Bar dataKey="Bike" fill={T.teal} radius={[2,2,0,0]}/>
                    <Bar dataKey="Run" fill={T.purple} radius={[2,2,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{display:"flex",gap:14,marginTop:8}}>
                {[["Swim",T.blue],["Bike",T.teal],["Run",T.purple]].map(([t,c])=>(
                  <span key={t} style={{display:"flex",alignItems:"center",gap:5,fontSize:12,color:T.text2}}>
                    <span style={{width:10,height:10,borderRadius:2,background:c}}/>{t}
                  </span>
                ))}
              </div>
            </Card>

            <Card title="Weekly hours">
              <div style={{width:"100%",height:200}}>
                <ResponsiveContainer>
                  <LineChart data={weeklyData}>
                    <CartesianGrid stroke={T.border} strokeDasharray="2 4" vertical={false}/>
                    <XAxis dataKey="label" tick={{fill:T.text3,fontSize:11}} stroke="transparent" tickLine={false}/>
                    <YAxis tick={{fill:T.text3,fontSize:11}} stroke="transparent" tickLine={false} width={32}/>
                    <Tooltip contentStyle={{background:T.bg2,border:`1px solid ${T.border2}`,borderRadius:8,fontSize:12,boxShadow:"0 8px 24px rgba(0,0,0,0.5)"}} labelStyle={{color:T.text,fontWeight:600,marginBottom:4}} cursor={{fill:`${T.text}08`}}/>
                    <Line type="monotone" dataKey="hrs" stroke={T.teal} strokeWidth={2} dot={{fill:T.teal,r:4}}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={{fontSize:11,color:T.text3,marginTop:6}}>The May 17 spike is the marathon week — the load pattern that built the injury. Watch for gradual ramps, not spikes.</div>
            </Card>
          </div>
        )}

        {/* ═══ RACE PLAN ═══ */}
        {tab === "plan" && <RacePlanTab/>}

        {/* ═══ DIARY ═══ */}
        {tab === "diary" && <DiaryTab diary={diary} setDiary={setDiary} />}

        {/* ═══ SETTINGS ═══ */}
        {tab === "settings" && <SettingsTab
          lastSync={lastSync}
          allSessions={allSessions}
          diary={diary}
          phase={phase}
          daysToRace={cd.total}
          planner={planner}
          thisWeekStart={thisWeekStart}
        />}
      </div>
    </div>
  );
}

// ─── ACTIVITY ROW ────────────────────────────────────────────────────────────
function ActivityRow({ a, detailed }) {
  return (
    <div className="card-hover" style={{
      display:"flex",alignItems:"center",gap:14,
      padding:"14px 16px",
      background:T.bg2,
      border:`1px solid ${T.border}`,
      borderLeft:a.src==="strava"?`3px solid ${T.strava}`:`3px solid ${T.border2}`,
      borderRadius:10,marginBottom:8,
    }}>
      <div style={{
        width:40,height:40,borderRadius:10,
        display:"flex",alignItems:"center",justifyContent:"center",
        background:typeDim(a.type),color:typeColor(a.type),
        border:`1px solid ${typeColor(a.type)}33`,flexShrink:0,
      }}>
        <SportIcon type={a.type} size={20}/>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13.5,fontWeight:600,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",letterSpacing:"-.005em"}}>
          {a.name}
          {a.note && <span style={{color:T.red,fontSize:11,marginLeft:8,fontWeight:500}}>· {a.note}</span>}
        </div>
        <div className="tabular" style={{fontSize:12,color:T.text3,display:"flex",gap:12,flexWrap:"wrap",marginTop:3}}>
          <span>{a.date}</span>
          {a.mins ? <span>{a.mins} min</span> : null}
          {fmtDist(a.dist, a.type) && <span>{fmtDist(a.dist, a.type)}</span>}
          {detailed && a.cal ? <span>{a.cal} cal</span> : null}
          {detailed && a.elev ? <span>{a.elev}m ↑</span> : null}
        </div>
      </div>
      <Badge color={typeColor(a.type)} dim={typeDim(a.type)}>{a.type}</Badge>
    </div>
  );
}


// ─── RACE PLAN TAB ───────────────────────────────────────────────────────────
function RacePlanTab() {
  const [ap, setAp] = useState("recovery");
  const plans = {
    recovery:{c:T.teal,goal:"Bank swim + bike fitness. Follow physio run return exactly. Depart for Europe Aug 10 in good shape.",rows:[
      ["Now – Jun 17","3x swim (~2km)","3x bike incl. commutes","No running","3x gym (Hevy split)","Calf raises + ankle mobility daily"],
      ["Jun 17 – Jul 1","3x swim","3–4x bike","10km/wk max, brace, grass","3x gym","First runs — straight lines only"],
      ["Jul 1 – Aug 5","3x swim","Long Sunday ride 35km+","Build to 30–40km/wk","2–3x gym","Football returns per plan"],
    ]},
    travel:{c:T.amber,goal:"Run base across Europe. Calisthenics. Swim opportunistically. No bike — accept it, run more. No race pressure: it's 13 months out.",rows:[
      ["Aug Greece/Albania","Open water (Ios)","—","5x/wk, 8–10km","Hostel calisthenics","Valbone→Theth hike = long session"],
      ["Sep Balkans/Italy","Beach swims","—","Long run 15km+ weekends","2x/wk","Kotor hill, Split Marjan"],
      ["Oct Iberia","Pool if avail","—","5x/wk, 12–15km","2x/wk","Lisbon + Porto = best run block"],
      ["Nov final leg","—","—","Easy maintenance","2x/wk","Travel-heavy. Arrive home healthy."],
    ]},
    base:{c:T.blue,goal:"The luxury phase — 7.5 months of aerobic base. This is where sub-5 is actually built. All disciplines, no rush, total consistency. Summer = open water season; winter = pool. Includes a winter strength block.",rows:[
      ["Nov 15 – Dec (re-entry)","3x pool","Commutes + Sunday long","4x/wk, 40km easy","2x Hevy","Rebuild routine. Easy paces only."],
      ["Jan – Feb (summer base)","2x pool + 1x open water","4x incl. 3hr Sunday","5x, 50km","2x","Open water weekly — wherever you are, beach or bay."],
      ["Mar – Apr (uni starts)","3x pool, 1x OW while warm","4x, commutes + long","4–5x, 50km","2x","New schedule: 1 day uni, 4 days work. Uni day = swim."],
      ["May – Jun (winter strength)","3x pool — technique focus","3x + trainer if cold","4x, maintain 45km","3x — push strength","Winter block: gym priority, FTP work indoors."],
    ]},
    build:{c:T.purple,goal:"Race-specific build through winter into spring. Volume climbs to 14–16 hrs/wk. Bricks become weekly. This is the big push.",rows:[
      ["Jul – Aug","3–4x, race sets","4x, 170km/wk","5x, 55km","2x","Weekly brick starts. Winter discipline."],
      ["Sep","4x + open water","4x, 180–190km/wk","5x, 60km","2x","Spring: OW swims resume. 2x bricks/wk."],
      ["Oct 1–10","4x","Race-pace intervals","60km + tempo","1–2x","Transition into peak."],
    ]},
    peak:{c:"#ec4899",goal:"Race simulation block. Spring/summer = open water season again, which lines up perfectly with race prep. Practise everything: pacing, nutrition, transitions, heat.",rows:[
      ["Oct 11 – 25","Pool race-pace 400s + 1x open water","90km race-sim rides","Long run 18km off bike","1x","Full 70.3 sim: 1.9km OW + 90km + 15km run"],
      ["Oct 26 – Nov 14","2x pool sharp + 1x open water","Race-pace focus","Tempo + long","1x","Heat adaptation: midday sessions. Lock nutrition plan."],
    ]},
    taper:{c:T.red,goal:"Three weeks. Volume -40% then -60%. Keep sharpness. Fly to WA early December. Execute.",rows:[
      ["Nov 15 – 21","2x short sharp","3x reduced","40km","1x","No new anything"],
      ["Nov 22 – 28","2x race-pace 400s","2x easy + short pace","25km","1x","Pack. Book everything. Bike serviced."],
      ["Race week (Dec 5)","Course recce","30min spin","20min easy","—","Carb load. Sleep. Trust 18 months of work."],
    ]},
  };
  const p = plans[ap];
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        {Object.entries(plans).map(([id,pl],i)=>(
          <button key={id} onClick={()=>setAp(id)} style={{padding:"7px 14px",borderRadius:6,fontSize:13,cursor:"pointer",
            border:`1px solid ${ap===id?pl.c:T.border}`,background:ap===id?pl.c+"18":"transparent",color:ap===id?pl.c:T.text2}}>
            {i+1}. {id.charAt(0).toUpperCase()+id.slice(1)}
          </button>
        ))}
      </div>
      <Card accent={p.c}>
        <div style={{fontSize:13,color:T.text2,lineHeight:1.7}}>{p.goal}</div>
      </Card>
      <Card title="Weekly structure">
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
            <thead><tr>
              {["Block","Swim","Bike","Run","Gym","Note"].map(h=>(
                <th key={h} style={{textAlign:"left",padding:"8px 10px",fontSize:11,color:T.text3,textTransform:"uppercase",letterSpacing:".05em",borderBottom:`1px solid ${T.border}`}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {p.rows.map((r,i)=>(
                <tr key={i}>
                  {r.map((c,j)=>(
                    <td key={j} style={{padding:"10px",borderBottom:`1px solid ${T.border}`,color:j===0?T.text:j===5?T.text3:T.text2,fontWeight:j===0?500:400,fontSize:j===5?12:13}}>{c}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card title="Race day — Busselton, Dec 5 2027 — splits for sub 5:00">
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(110px,1fr))",gap:8}}>
          {[["Swim 1.9km","38:00","2:00/100m",T.blue],["T1","1:00","Wetsuit",T.text3],["Bike 90km","2:35:00","34.8 km/h",T.teal],["T2","1:00","Rack+lace",T.text3],["Run 21.1km","1:45:00","4:59/km",T.purple]].map(([l,t,d,c])=>(
            <div key={l} style={{background:T.bg3,borderRadius:8,padding:12,textAlign:"center"}}>
              <div style={{fontSize:11,color:T.text3,marginBottom:4}}>{l}</div>
              <div style={{fontSize:15,fontWeight:600,color:c}}>{t}</div>
              <div style={{fontSize:11,color:T.text3,marginTop:3}}>{d}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── DIARY TAB ───────────────────────────────────────────────────────────────
function DiaryTab({ diary, setDiary }) {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [monthOffset, setMonthOffset] = useState(0);

  const inputStyle = {width:"100%",background:T.bg3,border:`1px solid ${T.border}`,color:T.text,borderRadius:6,padding:"8px 12px",fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};
  const labelStyle = {fontSize:11,color:T.text3,textTransform:"uppercase",letterSpacing:".05em",marginBottom:6,fontWeight:600};

  const entry = diary[selectedDate] || {};
  const setField = (k, v) => setDiary(d => ({...d, [selectedDate]: {...(d[selectedDate]||{}), [k]: v, updatedAt: new Date().toISOString()}}));
  const clearEntry = () => setDiary(d => { const c = {...d}; delete c[selectedDate]; return c; });

  // Build a 6-week calendar grid ending at the end of the current month-view
  const viewMonth = (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + monthOffset); return d; })();
  const monthLabel = viewMonth.toLocaleDateString("default",{month:"long",year:"numeric"});
  const firstOfMonth = new Date(viewMonth);
  const startCol = (firstOfMonth.getDay() + 6) % 7; // Monday=0
  const daysInMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth()+1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startCol; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d);
    cells.push(dt.toISOString().split("T")[0]);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const entries = Object.entries(diary).sort((a,b) => b[0].localeCompare(a[0]));

  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:16}}>
      {/* Calendar */}
      <Card title="Calendar">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <button onClick={()=>setMonthOffset(m=>m-1)} style={{background:T.bg3,border:`1px solid ${T.border}`,color:T.text,borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:13}}>‹</button>
          <span style={{fontSize:14,fontWeight:600}}>{monthLabel}</span>
          <button onClick={()=>setMonthOffset(m=>m+1)} style={{background:T.bg3,border:`1px solid ${T.border}`,color:T.text,borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:13}}>›</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,fontSize:11,color:T.text3,marginBottom:6}}>
          {["Mo","Tu","We","Th","Fr","Sa","Su"].map(d=><div key={d} style={{textAlign:"center"}}>{d}</div>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4}}>
          {cells.map((c,i) => {
            if (!c) return <div key={i}/>;
            const hasEntry = !!diary[c];
            const isSelected = c === selectedDate;
            const isToday = c === todayStr();
            const day = parseInt(c.split("-")[2], 10);
            return (
              <button key={i} onClick={()=>setSelectedDate(c)} style={{
                aspectRatio:"1",borderRadius:6,
                background:isSelected?T.teal:hasEntry?T.tealDim:T.bg3,
                border:isToday?`1px solid ${T.teal}`:`1px solid ${T.border}`,
                color:isSelected?"#000":T.text,fontSize:13,fontWeight:isSelected?700:500,cursor:"pointer",
                position:"relative",display:"flex",alignItems:"center",justifyContent:"center",
              }}>
                {day}
                {hasEntry && !isSelected && <span style={{position:"absolute",bottom:3,width:4,height:4,borderRadius:"50%",background:T.teal}}/>}
              </button>
            );
          })}
        </div>
        <div style={{marginTop:14,fontSize:11,color:T.text3}}>
          {Object.keys(diary).length} entries total · click any day to add or edit
        </div>
      </Card>

      {/* Entry editor */}
      <Card title={`Entry · ${selectedDate}`} accent={T.teal}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div>
            <div style={labelStyle}>Mood (1-5)</div>
            <div style={{display:"flex",gap:6}}>
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={()=>setField("mood",n)} style={{
                  flex:1,padding:"8px 0",borderRadius:6,fontSize:13,
                  background:entry.mood===n?T.teal:T.bg3,color:entry.mood===n?"#000":T.text,
                  border:`1px solid ${entry.mood===n?T.teal:T.border}`,cursor:"pointer",fontWeight:600,
                }}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={labelStyle}>RPE today (1-10)</div>
            <input type="number" min="1" max="10" value={entry.rpe || ""} onChange={e=>setField("rpe", e.target.value ? +e.target.value : null)} style={inputStyle} placeholder="6"/>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div>
            <div style={labelStyle}>Sleep (hrs)</div>
            <input type="number" step="0.5" value={entry.sleep || ""} onChange={e=>setField("sleep", e.target.value ? +e.target.value : null)} style={inputStyle} placeholder="7.5"/>
          </div>
          <div style={{display:"flex",alignItems:"flex-end",paddingBottom:4}}>
            <label style={{display:"flex",alignItems:"center",gap:8,fontSize:13,color:T.text2,cursor:"pointer"}}>
              <input type="checkbox" checked={!!entry.injury} onChange={e=>setField("injury", e.target.checked)} style={{accentColor:T.amber,width:16,height:16}}/>
              <span>Injury flag {entry.injury && <span style={{color:T.amber}}>⚠</span>}</span>
            </label>
          </div>
        </div>
        <div style={{marginBottom:10}}>
          <div style={labelStyle}>Body check</div>
          <input value={entry.body || ""} onChange={e=>setField("body", e.target.value)} style={inputStyle} placeholder="e.g. tight calves, ankle OK, hip mobility good"/>
        </div>
        <div style={{marginBottom:10}}>
          <div style={labelStyle}>Fuel / nutrition</div>
          <input value={entry.fuel || ""} onChange={e=>setField("fuel", e.target.value)} style={inputStyle} placeholder="e.g. pre-swim oats + banana, 2x gel on bike"/>
        </div>
        <div style={{marginBottom:14}}>
          <div style={labelStyle}>Reflection</div>
          <textarea rows={4} value={entry.reflection || ""} onChange={e=>setField("reflection", e.target.value)} style={{...inputStyle,resize:"vertical",fontFamily:"inherit"}} placeholder="How did training feel? What surprised you? Anything to flag for next week?"/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:11,color:T.text3}}>{entry.updatedAt ? `Saved ${new Date(entry.updatedAt).toLocaleString()}` : "Auto-saves as you type"}</span>
          {Object.keys(entry).filter(k=>k!=="updatedAt").length > 0 && (
            <button onClick={()=>{ if (confirm(`Delete entry for ${selectedDate}?`)) clearEntry(); }} style={{background:"transparent",border:"none",color:T.text3,fontSize:12,cursor:"pointer",textDecoration:"underline"}}>Delete entry</button>
          )}
        </div>
      </Card>

      {/* Recent entries list */}
      {entries.length > 0 && (
        <Card title={`Recent entries (${entries.length})`} style={{gridColumn:"1 / -1"}}>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {entries.slice(0,8).map(([date,e]) => (
              <button key={date} onClick={()=>setSelectedDate(date)} style={{
                display:"flex",gap:12,alignItems:"center",padding:"10px 12px",background:T.bg3,
                border:`1px solid ${T.border}`,borderRadius:8,cursor:"pointer",textAlign:"left",color:T.text,
              }}>
                <div style={{fontSize:12,color:T.text2,minWidth:90}}>{date}</div>
                <div style={{display:"flex",gap:8,fontSize:12,color:T.text2,flexWrap:"wrap",flex:1}}>
                  {e.mood && <span>Mood {e.mood}/5</span>}
                  {e.sleep && <span>· {e.sleep}h sleep</span>}
                  {e.rpe && <span>· RPE {e.rpe}</span>}
                  {e.injury && <span style={{color:T.amber}}>· ⚠ injury</span>}
                  {e.reflection && <span style={{color:T.text3,fontStyle:"italic",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:240}}>"{e.reflection.slice(0,60)}{e.reflection.length>60?"…":""}"</span>}
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─── SETTINGS TAB ────────────────────────────────────────────────────────────
function SettingsTab({ lastSync, allSessions, diary, phase, daysToRace, planner, thisWeekStart }) {
  const [stravaStatus, setStravaStatus] = useState("checking");
  const [copyMsg, setCopyMsg] = useState("");
  const [googleStatus, setGoogleStatus] = useState({ state: "checking" });
  const [pushing, setPushing] = useState(false);
  const [pushMsg, setPushMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/strava/sync");
        setStravaStatus(r.ok ? "connected" : "needs-setup");
      } catch { setStravaStatus("error"); }
      try {
        const r = await fetch("/api/google/status");
        const d = await r.json();
        if (d.connected) setGoogleStatus({ state: "connected" });
        else if (d.oauthConfigured) setGoogleStatus({ state: "needs-token", missing: d.missing });
        else setGoogleStatus({ state: "needs-setup", missing: d.missing });
      } catch { setGoogleStatus({ state: "error" }); }
    })();
  }, []);

  const [syncTarget, setSyncTarget] = useState("this"); // "this" | "next"

  // Convert a given week's planner into tagged calendar events.
  // Uses the shared helper so manual sync and cron sync produce identical
  // events for the same planner + weekStart.
  const plannerToEvents = (weekStartISO) => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || APP_TIMEZONE;
    return plannerToCalendarEvents(planner, weekStartISO, tz);
  };

  const targetWeekStart = (() => {
    if (syncTarget === "next") {
      const d = new Date(`${thisWeekStart}T00:00:00`);
      d.setDate(d.getDate() + 7);
      return d.toISOString().split("T")[0];
    }
    return thisWeekStart;
  })();

  const pushToCalendar = async () => {
    setPushing(true);
    setPushMsg("Syncing planner → Calendar…");
    try {
      const events = plannerToEvents(targetWeekStart);
      const r = await fetch("/api/google/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ calendarId: "primary", weekStart: targetWeekStart, events }),
      });
      const data = await r.json();
      if (r.ok) {
        const parts = [];
        if (data.created) parts.push(`${data.created} created`);
        if (data.updated) parts.push(`${data.updated} updated`);
        if (data.deleted) parts.push(`${data.deleted} deleted`);
        if (data.sweptLegacy) parts.push(`${data.sweptLegacy} legacy removed`);
        setPushMsg(parts.length ? `✓ ${parts.join(", ")}` : "✓ Already in sync");
      } else {
        setPushMsg(`Failed: ${data.error || r.status}`);
      }
    } catch (e) {
      setPushMsg(`Failed: ${e.message}`);
    }
    setPushing(false);
    setTimeout(() => setPushMsg(""), 10000);
  };

  // Build a paste-ready summary for Claude conversations
  const buildClaudeSummary = () => {
    const today = todayStr();
    const wkStart = weekStartOf(today);
    const thisWk = allSessions.filter(s => weekStartOf(s.date) === wkStart);
    const last7 = allSessions.filter(s => {
      const d = new Date(s.date);
      const diff = (new Date(today) - d) / 86400000;
      return diff >= 0 && diff < 7;
    });
    const byType = {};
    last7.forEach(s => { byType[s.type] = (byType[s.type] || 0) + 1; });
    const recentDiary = Object.entries(diary).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,5);

    let out = `=== IRONCOACH SUMMARY · ${today} ===\n`;
    out += `Race: Ironman 70.3 WA, 5 Dec 2027 (${daysToRace} days away)\n`;
    out += `Current phase: ${phase.name}\n\n`;
    out += `LAST 7 DAYS (${last7.length} sessions, ${last7.reduce((a,s)=>a+(s.mins||0),0)} min total)\n`;
    Object.entries(byType).forEach(([t,n]) => { out += `  ${t}: ${n}\n`; });
    if (!last7.length) out += `  (no sessions logged)\n`;
    out += `\nTHIS WEEK SO FAR (${thisWk.length} sessions)\n`;
    thisWk.slice(0,10).forEach(s => {
      out += `  ${s.date} · ${s.type} · ${s.name}`;
      if (s.dist) out += ` · ${s.type==="Swim"?s.dist+"m":(s.dist/1000).toFixed(1)+"km"}`;
      if (s.mins) out += ` · ${s.mins}min`;
      out += `\n`;
    });
    if (recentDiary.length) {
      out += `\nDIARY (last ${recentDiary.length})\n`;
      recentDiary.forEach(([d,e]) => {
        out += `  ${d}: `;
        const bits = [];
        if (e.mood) bits.push(`mood ${e.mood}/5`);
        if (e.sleep) bits.push(`sleep ${e.sleep}h`);
        if (e.rpe) bits.push(`RPE ${e.rpe}/10`);
        if (e.injury) bits.push(`INJURY FLAG`);
        out += bits.join(", ");
        if (e.body) out += `\n    body: ${e.body}`;
        if (e.reflection) out += `\n    "${e.reflection}"`;
        out += `\n`;
      });
    }
    return out;
  };

  const copySummary = async () => {
    try {
      await navigator.clipboard.writeText(buildClaudeSummary());
      setCopyMsg("✓ Copied — paste into Claude");
      setTimeout(() => setCopyMsg(""), 4000);
    } catch (e) {
      setCopyMsg("Copy failed: " + e.message);
    }
  };

  const Section = ({ title, status, statusColor, statusLabel, children }) => (
    <Card title={title}>
      {status && (
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
          <span style={{width:8,height:8,borderRadius:"50%",background:statusColor,display:"inline-block"}}/>
          <span style={{fontSize:13,color:T.text,fontWeight:500}}>{statusLabel}</span>
        </div>
      )}
      {children}
    </Card>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Claude bridge */}
      <Section title="Bridge to Claude">
        <div style={{fontSize:13,color:T.text2,lineHeight:1.6,marginBottom:12}}>
          One-click copy a summary of your training state — last 7 days of sessions, this week's plan, and recent diary entries — ready to paste into Claude for coaching feedback.
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <Btn primary onClick={copySummary}>📋 Copy summary for Claude</Btn>
          {copyMsg && <span style={{fontSize:12,color:copyMsg.startsWith("✓")?T.green:T.amber}}>{copyMsg}</span>}
        </div>
        <details style={{marginTop:14}}>
          <summary style={{fontSize:12,color:T.text3,cursor:"pointer"}}>Preview what gets copied</summary>
          <pre style={{background:T.bg3,padding:12,borderRadius:8,fontSize:11,marginTop:8,overflowX:"auto",border:`1px solid ${T.border}`,whiteSpace:"pre-wrap"}}>{buildClaudeSummary()}</pre>
        </details>
      </Section>

      {/* Strava */}
      <Section
        title="Strava sync"
        status
        statusColor={stravaStatus==="connected"?T.green:stravaStatus==="checking"?T.amber:T.red}
        statusLabel={stravaStatus==="connected"?"Connected — syncing live activities":stravaStatus==="checking"?"Checking…":"Not connected — see steps below"}
      >
        <div style={{fontSize:12,color:T.text3,marginBottom:10}}>Last manual sync: {lastSync}</div>
        {stravaStatus !== "connected" && (
          <ol style={{fontSize:13,color:T.text2,lineHeight:1.8,paddingLeft:20,marginBottom:12}}>
            <li>Set <code style={{background:T.bg3,padding:"1px 6px",borderRadius:4}}>STRAVA_CLIENT_ID</code>, <code style={{background:T.bg3,padding:"1px 6px",borderRadius:4}}>STRAVA_CLIENT_SECRET</code> in Vercel env vars</li>
            <li>Visit <a href="/api/strava/authorize" style={{color:T.teal}}>/api/strava/authorize</a> to grant access</li>
            <li>Copy the printed refresh token to <code style={{background:T.bg3,padding:"1px 6px",borderRadius:4}}>STRAVA_REFRESH_TOKEN</code> in Vercel</li>
            <li>Redeploy</li>
          </ol>
        )}
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <a href="/api/strava/authorize" style={{textDecoration:"none"}}><Btn small style={{borderColor:T.strava,color:T.strava,background:"transparent"}}>Re-authorize</Btn></a>
        </div>
      </Section>

      {/* Google Calendar */}
      <Section
        title="Google Calendar export"
        status
        statusColor={
          googleStatus.state==="connected"?T.green:
          googleStatus.state==="needs-token"?T.amber:
          googleStatus.state==="checking"?T.text3:T.amber
        }
        statusLabel={
          googleStatus.state==="connected"?"Connected — ready to push":
          googleStatus.state==="needs-token"?"OAuth configured — needs one-time authorize":
          googleStatus.state==="checking"?"Checking…":
          "Not connected — paste Google credentials to Claude"
        }
      >
        <div style={{fontSize:13,color:T.text2,lineHeight:1.7,marginBottom:12}}>
          Push this week's planner sessions to your Google Calendar so your training week shows up alongside everything else. Re-pushing creates duplicates — use sparingly until we add idempotency.
        </div>

        {googleStatus.state === "needs-setup" && (
          <ol style={{fontSize:13,color:T.text2,lineHeight:1.8,paddingLeft:20,marginBottom:12}}>
            <li>Create a Google Cloud project at <span style={{color:T.text3}}>console.cloud.google.com</span></li>
            <li>Enable the <strong>Google Calendar API</strong></li>
            <li>Create an OAuth 2.0 Client ID (Web application)</li>
            <li>Add redirect URI: <code style={{background:T.bg3,padding:"1px 6px",borderRadius:4,fontSize:11}}>https://iron-coach-delta.vercel.app/api/google/callback</code></li>
            <li>Paste the Client ID + Secret back to Claude — he'll set the env vars</li>
          </ol>
        )}

        {googleStatus.state === "needs-token" && (
          <div style={{fontSize:13,color:T.text2,lineHeight:1.7,marginBottom:12}}>
            Client ID/Secret are set. One step left: visit <a href="/api/google/authorize" style={{color:T.teal}}>/api/google/authorize</a> to grant Calendar access, then paste the printed refresh token to Claude (or add it as <code style={{background:T.bg3,padding:"1px 6px",borderRadius:4}}>GOOGLE_REFRESH_TOKEN</code> in Vercel and redeploy).
          </div>
        )}

        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{display:"inline-flex",borderRadius:6,overflow:"hidden",border:`1px solid ${T.border}`}}>
            {[["this","This week"],["next","Next week"]].map(([k,l]) => (
              <button key={k} onClick={()=>setSyncTarget(k)} style={{
                padding:"6px 12px",fontSize:12,cursor:"pointer",border:"none",
                background:syncTarget===k?T.bg4:T.bg3,
                color:syncTarget===k?T.text:T.text2,fontWeight:syncTarget===k?600:400,
              }}>{l}</button>
            ))}
          </div>
          <Btn
            primary
            disabled={googleStatus.state !== "connected" || pushing}
            onClick={pushToCalendar}
          >
            📅 {pushing ? "Syncing…" : `Sync ${syncTarget === "next" ? "next" : "this"} week`}
          </Btn>
          {googleStatus.state === "needs-token" && (
            <a href="/api/google/authorize" style={{textDecoration:"none"}}>
              <Btn style={{borderColor:T.blue,color:T.blue,background:"transparent"}}>Authorize Google</Btn>
            </a>
          )}
          {pushMsg && <span style={{fontSize:12,color:pushMsg.startsWith("✓")?T.green:T.amber}}>{pushMsg}</span>}
        </div>
        <div style={{fontSize:11,color:T.text3,marginTop:10,lineHeight:1.6}}>
          Re-syncing is safe: matches each session by id, so existing events update in place,
          removed sessions get deleted, new ones are created. Any legacy "IronCoach planner"
          events from before this round (with wonky timings) get swept up too.
        </div>
      </Section>

      {/* Data storage */}
      <Section
        title="Data storage"
        status
        statusColor={T.amber}
        statusLabel="Browser localStorage — single-device only"
      >
        <div style={{fontSize:13,color:T.text2,lineHeight:1.7,marginBottom:10}}>
          Your diary and planner state currently live in this browser only. To make them follow you across devices, provision a Vercel Postgres database (Storage tab → Create Database → Neon). Once <code style={{background:T.bg3,padding:"1px 6px",borderRadius:4}}>DATABASE_URL</code> is set, the next deploy will switch over automatically.
        </div>
      </Section>
    </div>
  );
}
