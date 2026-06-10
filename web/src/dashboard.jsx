import React, { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

// ─── THEME ───────────────────────────────────────────────────────────────────
const T = {
  bg:"#0f0f10", bg2:"#1a1a1c", bg3:"#222226", bg4:"#2a2a2f",
  border:"#333338", border2:"#444449",
  text:"#f0f0f0", text2:"#a0a0a8", text3:"#666670",
  teal:"#1db896", tealDim:"#0d2820",
  blue:"#4a9eff", blueDim:"#0d1f3c",
  amber:"#f59e0b", amberDim:"#2a1f00",
  red:"#ef4444", redDim:"#2a0f0f",
  purple:"#a78bfa", purpleDim:"#1a1030",
  green:"#22c55e", greenDim:"#0a2010",
  strava:"#fc4c02",
};

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

// ─── WEEKLY PLANNER TEMPLATE (from Gus's 2026 planner) ──────────────────────
const DEFAULT_PLANNER = [
  {day:"Monday",sessions:[
    {id:"mon1",label:"AM: Bike Commute (8km+)",type:"Bike"},
    {id:"mon2",label:"PM: Bike Commute (8km+)",type:"Bike"},
    {id:"mon3",label:"PM: Gym (Upper A)",type:"Gym"},
    {id:"mon4",label:"PM: Squad Swim (Hard)",type:"Swim"},
  ]},
  {day:"Tuesday",sessions:[
    {id:"tue1",label:"AM: Bike Commute (8km+)",type:"Bike"},
    {id:"tue2",label:"PM: Bike Commute (8km+)",type:"Bike"},
    {id:"tue3",label:"PM: Gym (Lower A)",type:"Gym"},
  ]},
  {day:"Wednesday",sessions:[
    {id:"wed1",label:"AM: Tempo Run Commute (8km+)",type:"Run",caution:true},
    {id:"wed2",label:"PM: Gym (Upper B)",type:"Gym"},
    {id:"wed3",label:"PM: Squad Swim (Light)",type:"Swim"},
  ]},
  {day:"Thursday",sessions:[
    {id:"thu1",label:"AM: Gym (Lower B)",type:"Gym"},
    {id:"thu2",label:"PM: Football Training",type:"Football",caution:true},
  ]},
  {day:"Friday",sessions:[
    {id:"fri1",label:"AM: Morning Walk",type:"Walk"},
    {id:"fri2",label:"AM/PM: Football Skills",type:"Football",caution:true},
    {id:"fri3",label:"PM: Easy Run (8km+)",type:"Run",caution:true},
  ]},
  {day:"Saturday",sessions:[
    {id:"sat1",label:"AM: Morning Walk",type:"Walk"},
    {id:"sat2",label:"AM/PM: Football Game",type:"Football",caution:true},
  ]},
  {day:"Sunday",sessions:[
    {id:"sun1",label:"AM: Extended Bike Ride (35km+)",type:"Bike"},
    {id:"sun2",label:"PM: Block Run (12km+)",type:"Run",caution:true},
    {id:"sun3",label:"PM: Mobility / Stretching",type:"Mobility"},
  ]},
];

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

// ─── STRAVA LIVE SYNC via Claude API + MCP ───────────────────────────────────
async function syncStrava(sinceDate) {
  const prompt = `Use the Strava list_activities tool to fetch my recent activities${sinceDate ? ` since ${sinceDate}` : " (last 30)"}. Then respond with ONLY a JSON array, no markdown, no backticks, no other text. Each element: {"id":"<string>","name":"<string>","type":"<Swim|Bike|Run|Gym|Row|Walk|Other>","date":"YYYY-MM-DD","dist":<metres,number>,"mins":<moving minutes,number>,"cal":<calories,number or 0>}. Map sport_type: Swim->Swim, Ride->Bike, Run->Run, WeightTraining->Gym, Rowing->Row, Walk->Walk, anything else->Other.`;
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
      mcp_servers: [{ type: "url", url: "https://mcp.strava.com/mcp", name: "strava" }],
    }),
  });
  const data = await response.json();
  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
  const clean = text.replace(/```json|```/g, "").trim();
  const start = clean.indexOf("["), end = clean.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("No JSON found in response");
  return JSON.parse(clean.slice(start, end + 1));
}

// ─── SMALL COMPONENTS ────────────────────────────────────────────────────────
const Card = ({ title, children, accent, style }) => (
  <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderLeft:accent?`3px solid ${accent}`:`1px solid ${T.border}`,borderRadius:10,padding:"16px 18px",...style}}>
    {title && <div style={{fontSize:11,fontWeight:600,textTransform:"uppercase",letterSpacing:".06em",color:T.text3,marginBottom:12}}>{title}</div>}
    {children}
  </div>
);

const Badge = ({ children, color, dim }) => (
  <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 9px",borderRadius:20,fontSize:11,fontWeight:600,background:dim,color}}>{children}</span>
);

const Btn = ({ children, onClick, primary, small, disabled, style }) => (
  <button onClick={onClick} disabled={disabled} style={{
    display:"inline-flex",alignItems:"center",gap:6,
    padding:small?"5px 11px":"8px 16px",borderRadius:6,
    fontSize:small?12:13,fontWeight:500,cursor:disabled?"default":"pointer",
    border:`1px solid ${primary?T.teal:T.border}`,
    background:primary?T.teal:T.bg3,color:primary?"#000":T.text,
    opacity:disabled?0.5:1,...style
  }}>{children}</button>
);

// ─── MAIN ────────────────────────────────────────────────────────────────────
export default function IronmanDashboard() {
  const [tab, setTab] = useState("dashboard");
  const [activities, setActivities] = useState(SEED_ACTIVITIES);
  const [planner, setPlanner] = useState(DEFAULT_PLANNER);
  const [checked, setChecked] = useState({});   // {weekStart: {sessionId: true}}
  const [manualLogs, setManualLogs] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [lastSync, setLastSync] = useState("2026-06-10 (seed)");
  const [showLog, setShowLog] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // load persisted state
  useEffect(() => {
    (async () => {
      const s = await loadState();
      if (s) {
        if (s.activities?.length) setActivities(s.activities);
        if (s.checked) setChecked(s.checked);
        if (s.manualLogs) setManualLogs(s.manualLogs);
        if (s.lastSync) setLastSync(s.lastSync);
        if (s.planner) setPlanner(s.planner);
      }
      setLoaded(true);
    })();
  }, []);

  // persist on change
  useEffect(() => {
    if (!loaded) return;
    saveState({ activities, checked, manualLogs, lastSync, planner });
  }, [activities, checked, manualLogs, lastSync, planner, loaded]);

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

  const allSessions = [...activities, ...manualLogs].sort((a,b)=>b.date.localeCompare(a.date));
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
    {id:"planner",label:"Weekly planner"},
    {id:"feed",label:"Activity feed"},
    {id:"analytics",label:"Analytics"},
    {id:"plan",label:"Race plan"},
  ];

  return (
    <div style={{background:T.bg,color:T.text,minHeight:"100vh",fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",fontSize:14}}>
      {/* Header */}
      <div style={{borderBottom:`1px solid ${T.border}`,padding:"16px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:16,fontWeight:600}}>Gus — Ironman 70.3 WA 2027</div>
          <div style={{fontSize:12,color:T.text3,marginTop:2}}>Sub 5:00 target · {cd.total} days · Phase: <span style={{color:phase.color}}>{phase.name}</span></div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          {syncMsg && <span style={{fontSize:12,color:syncMsg.startsWith("✓")?T.green:T.amber}}>{syncMsg}</span>}
          <Btn onClick={doSync} disabled={syncing} style={{borderColor:T.strava,color:T.strava,background:"transparent"}}>
            <svg width={14} height={14} viewBox="0 0 24 24" fill="currentColor"><path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/></svg>
            {syncing ? "Syncing…" : "Sync Strava"}
          </Btn>
          <Btn primary onClick={() => setShowLog(true)}>+ Log</Btn>
        </div>
      </div>

      {/* Tab nav */}
      <div style={{display:"flex",gap:4,padding:"12px 24px 0",borderBottom:`1px solid ${T.border}`,overflowX:"auto"}}>
        {tabs.map(t => (
          <button key={t.id} onClick={()=>setTab(t.id)} style={{
            padding:"9px 16px",fontSize:13,cursor:"pointer",background:"transparent",
            border:"none",borderBottom:tab===t.id?`2px solid ${T.teal}`:"2px solid transparent",
            color:tab===t.id?T.teal:T.text2,fontWeight:tab===t.id?600:400,whiteSpace:"nowrap"
          }}>{t.label}</button>
        ))}
        <div style={{marginLeft:"auto",fontSize:11,color:T.text3,padding:"10px 0",whiteSpace:"nowrap"}}>Last sync: {lastSync}</div>
      </div>

      <div style={{padding:24,maxWidth:1100,margin:"0 auto"}}>

        {/* ═══ DASHBOARD ═══ */}
        {tab === "dashboard" && (
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            {/* Countdown + phase bar */}
            <Card title="Race countdown">
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:14}}>
                {[[cd.months,"Months"],[cd.weeks,"Weeks"],[cd.days,"Days"],[cd.total,"Total days"]].map(([v,l])=>(
                  <div key={l} style={{background:T.bg3,borderRadius:6,padding:"12px 8px",textAlign:"center"}}>
                    <div style={{fontSize:24,fontWeight:700,color:T.teal,lineHeight:1}}>{v}</div>
                    <div style={{fontSize:10,color:T.text3,textTransform:"uppercase",letterSpacing:".06em",marginTop:4}}>{l}</div>
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
                          <span style={{flex:1,fontSize:13,color:done?T.text2:T.text,textDecoration:done?"line-through":"none"}}>
                            {s.label}{s.caution && <span style={{color:T.amber,marginLeft:6,fontSize:11}}>⚠ physio</span>}
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
              <div style={{fontSize:13,color:T.text2}}>{allSessions.length} activities · Strava + manual</div>
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
                  <div key={m.l} style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:10,padding:"14px 16px"}}>
                    <div style={{fontSize:11,color:T.text3,textTransform:"uppercase",letterSpacing:".05em",marginBottom:6}}>{m.l}</div>
                    <div style={{fontSize:24,fontWeight:600,color:m.c}}>{m.v}<span style={{fontSize:13,color:T.text2,fontWeight:400}}>{m.u}</span></div>
                  </div>
                ));
              })()}
            </div>

            <Card title="Weekly distance by discipline (km)">
              <div style={{width:"100%",height:220}}>
                <ResponsiveContainer>
                  <BarChart data={weeklyData}>
                    <CartesianGrid stroke={T.border} strokeDasharray="3 3"/>
                    <XAxis dataKey="label" tick={{fill:T.text3,fontSize:11}} stroke={T.border}/>
                    <YAxis tick={{fill:T.text3,fontSize:11}} stroke={T.border}/>
                    <Tooltip contentStyle={{background:T.bg3,border:`1px solid ${T.border}`,borderRadius:6,fontSize:12}} labelStyle={{color:T.text}}/>
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
                    <CartesianGrid stroke={T.border} strokeDasharray="3 3"/>
                    <XAxis dataKey="label" tick={{fill:T.text3,fontSize:11}} stroke={T.border}/>
                    <YAxis tick={{fill:T.text3,fontSize:11}} stroke={T.border}/>
                    <Tooltip contentStyle={{background:T.bg3,border:`1px solid ${T.border}`,borderRadius:6,fontSize:12}} labelStyle={{color:T.text}}/>
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
      </div>

      {/* ═══ LOG MODAL ═══ */}
      {showLog && <LogModal
        onClose={()=>setShowLog(false)}
        onSave={(s)=>{ setManualLogs(m=>[...m,s]); setShowLog(false); }}
      />}
    </div>
  );
}

// ─── ACTIVITY ROW ────────────────────────────────────────────────────────────
function ActivityRow({ a, detailed }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:12,padding:"11px 14px",background:T.bg2,border:`1px solid ${T.border}`,borderLeft:a.src==="strava"?`3px solid ${T.strava}`:`3px solid ${T.border2}`,borderRadius:8,marginBottom:6}}>
      <div style={{width:34,height:34,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",background:typeDim(a.type),color:typeColor(a.type),fontSize:11,fontWeight:700,flexShrink:0}}>
        {a.type.slice(0,2).toUpperCase()}
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{a.name}{a.note && <span style={{color:T.red,fontSize:11,marginLeft:8}}>· {a.note}</span>}</div>
        <div style={{fontSize:12,color:T.text3,display:"flex",gap:10,flexWrap:"wrap"}}>
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

// ─── LOG MODAL ───────────────────────────────────────────────────────────────
function LogModal({ onClose, onSave }) {
  const [f, setF] = useState({date:todayStr(),type:"Swim",name:"",mins:"",dist:"",notes:""});
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const inputStyle = {width:"100%",background:T.bg3,border:`1px solid ${T.border}`,color:T.text,borderRadius:6,padding:"8px 12px",fontSize:14,outline:"none",boxSizing:"border-box"};
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:T.bg2,border:`1px solid ${T.border}`,borderRadius:14,padding:24,width:"100%",maxWidth:440}}>
        <div style={{fontSize:16,fontWeight:600,marginBottom:18,display:"flex",justifyContent:"space-between"}}>
          Log session
          <button onClick={onClose} style={{background:"none",border:"none",color:T.text3,cursor:"pointer",fontSize:18}}>×</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
          <div><div style={{fontSize:12,color:T.text2,marginBottom:5}}>Date</div><input type="date" value={f.date} onChange={e=>set("date",e.target.value)} style={inputStyle}/></div>
          <div><div style={{fontSize:12,color:T.text2,marginBottom:5}}>Type</div>
            <select value={f.type} onChange={e=>set("type",e.target.value)} style={inputStyle}>
              {["Swim","Bike","Run","Gym","Row","Walk","Brick","Football"].map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div style={{marginBottom:10}}><div style={{fontSize:12,color:T.text2,marginBottom:5}}>Name</div><input placeholder="e.g. Squad swim — hard set" value={f.name} onChange={e=>set("name",e.target.value)} style={inputStyle}/></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
          <div><div style={{fontSize:12,color:T.text2,marginBottom:5}}>Duration (min)</div><input type="number" placeholder="45" value={f.mins} onChange={e=>set("mins",e.target.value)} style={inputStyle}/></div>
          <div><div style={{fontSize:12,color:T.text2,marginBottom:5}}>Distance (m)</div><input type="number" placeholder="2000" value={f.dist} onChange={e=>set("dist",e.target.value)} style={inputStyle}/></div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn onClick={onClose}>Cancel</Btn>
          <Btn primary onClick={()=>{
            if(!f.mins&&!f.dist)return;
            onSave({id:`m${Date.now()}`,name:f.name||`${f.type} session`,type:f.type,date:f.date,dist:+f.dist||0,mins:+f.mins||0,cal:0,src:"manual"});
          }}>Save</Btn>
        </div>
      </div>
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
