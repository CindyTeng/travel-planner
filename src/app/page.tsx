"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";

type Activity = { time: string; title: string; description: string; location: string; tip: string };
type Meal = { name: string; description: string };
type DayPlan = { day: number; theme: string; morning: Activity; afternoon: Activity; evening: Activity; meals: { breakfast: Meal; lunch: Meal; dinner: Meal } };
type Plan = { title: string; introduction: string; destination: string; days: DayPlan[]; budgetSummary: string; notes: string[] };

const interests = ["海岸海灘", "森林山景", "在地美食", "購物逛街", "文化景點", "拍照打卡", "活動體驗"];
const paces = ["輕鬆不趕行程", "步調適中", "密集玩好玩滿"];
const heroSlides = [
  { src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=85", place: "山海公路・遠行" },
  { src: "https://images.unsplash.com/photo-1755001211341-651d822f3abb?auto=format&fit=crop&w=1600&q=85", place: "海岸公路・漫遊" },
  { src: "https://images.unsplash.com/photo-1702360373582-968d932ac789?auto=format&fit=crop&w=1600&q=85", place: "高山湖泊・漫步" },
  { src: "https://images.unsplash.com/photo-1720986113502-658abdf52874?auto=format&fit=crop&w=1600&q=85", place: "森林湖畔・放空" },
];

function ArrowIcon() { return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 10h12m-5-5 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>; }

function safeFileName(value: string) { return value.replace(/[\\/:*?"<>|]/g, "-").trim() || "travel-itinerary"; }
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]!); }
function downloadWord(plan: Plan) {
  const days = plan.days.map((day) => {
    const activityRows = ([["早晨", day.morning], ["午後", day.afternoon], ["夜晚", day.evening]] as [string, Activity][]).map(([period, a]) => "<tr><td>" + period + " " + escapeHtml(a.time) + "</td><td><strong>" + escapeHtml(a.title) + "</strong><br>" + escapeHtml(a.description) + "<br>地點：" + escapeHtml(a.location) + "<br>提醒：" + escapeHtml(a.tip) + "</td></tr>").join("");
    const mealRows = ([["早餐", day.meals.breakfast], ["午餐", day.meals.lunch], ["晚餐", day.meals.dinner]] as [string, Meal][]).map(([period, meal]) => "<tr><td>" + period + "</td><td><strong>" + escapeHtml(meal.name) + "</strong><br>" + escapeHtml(meal.description) + "</td></tr>").join("");
    return "<h2>第 " + day.day + " 天｜" + escapeHtml(day.theme) + "</h2><table><tr><th>時段</th><th>行程</th></tr>" + activityRows + "</table><h3>餐廳推薦</h3><table><tr><th>餐別</th><th>推薦</th></tr>" + mealRows + "</table>";
  }).join("");
  const notes = plan.notes.length ? "<h2>出發前的小筆記</h2><ul>" + plan.notes.map((note) => "<li>" + escapeHtml(note) + "</li>").join("") + "</ul>" : "";
  const html = "<!doctype html><html><head><meta charset=\"utf-8\"><title>" + escapeHtml(plan.title) + "</title><style>body{font-family:Arial,'Microsoft JhengHei',sans-serif;color:#29302c;line-height:1.65}h1,h2{color:#42553d}h2{margin-top:28px;border-bottom:2px solid #dce4cf;padding-bottom:6px}table{width:100%;border-collapse:collapse;margin:10px 0 18px}th,td{border:1px solid #cfd5c8;padding:8px;text-align:left;vertical-align:top}th{background:#eef2e8}</style></head><body><h1>" + escapeHtml(plan.title) + "</h1><p><strong>" + escapeHtml(plan.destination) + "｜" + plan.days.length + " 天</strong></p><p>" + escapeHtml(plan.introduction) + "</p><p><strong>旅費預算（不含機票）：</strong>" + escapeHtml(plan.budgetSummary) + "</p>" + days + notes + "</body></html>";
  const url = URL.createObjectURL(new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = safeFileName(plan.destination) + "-行程表.doc"; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function downloadExcel(plan: Plan) {
  const rows: string[][] = [[plan.title], [plan.destination, plan.days.length + " 天"], ["旅費預算（不含機票）", plan.budgetSummary], [], ["天數", "主題", "時段", "時間", "行程／餐廳", "說明", "地點", "提醒"]];
  for (const day of plan.days) {
    for (const [period, a] of [["早晨", day.morning], ["午後", day.afternoon], ["夜晚", day.evening]] as [string, Activity][]) rows.push(["第 " + day.day + " 天", day.theme, period, a.time, a.title, a.description, a.location, a.tip]);
    for (const [period, meal] of [["早餐", day.meals.breakfast], ["午餐", day.meals.lunch], ["晚餐", day.meals.dinner]] as [string, Meal][]) rows.push(["第 " + day.day + " 天", day.theme, period, "", meal.name, meal.description, "", ""]);
  }
  if (plan.notes.length) rows.push([], ["出發前的小筆記"], ...plan.notes.map((note) => [note]));
  const csv = "\ufeff" + rows.map((row) => row.map((cell) => "\"" + String(cell ?? "").replace(/\"/g, "\"\"") + "\"").join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = safeFileName(plan.destination) + "-行程表.csv"; link.click(); URL.revokeObjectURL(url);
}

export default function Home() {
  const [destination, setDestination] = useState("");
  const [days, setDays] = useState(4);
  const [budget, setBudget] = useState(30000);
  const [arrivalTime, setArrivalTime] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [budgetText, setBudgetText] = useState("30,000");
  const [customActivities, setCustomActivities] = useState("");
  const [activeSlide, setActiveSlide] = useState(0);
  const [pace, setPace] = useState(paces[0]);
  const [selected, setSelected] = useState<string[]>(["在地美食", "文化體驗"]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [planInputs, setPlanInputs] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const [revisionRequest, setRevisionRequest] = useState("");
  const [revisionLoading, setRevisionLoading] = useState(false);
  const [revisionError, setRevisionError] = useState("");
  const [error, setError] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyLoaded, setApiKeyLoaded] = useState(false);

  useEffect(() => {
    setApiKey(window.localStorage.getItem("tripmate.openaiApiKey") || "");
    setApiKeyLoaded(true);
  }, []);

  function updateApiKey(value: string) {
    setApiKey(value);
    if (value.trim()) window.localStorage.setItem("tripmate.openaiApiKey", value.trim());
    else window.localStorage.removeItem("tripmate.openaiApiKey");
  }

  useEffect(() => {
    const timer = window.setInterval(() => setActiveSlide((current) => (current + 1) % heroSlides.length), 5000);
    return () => window.clearInterval(timer);
  }, []);

  function toggleInterest(value: string) {
    setSelected((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setPlan(null); setRevisionRequest(""); setRevisionError(""); setLoading(true);
    const requestData = { destination, days, budget, pace, interests: selected, customActivities, arrivalTime, returnTime };
    try {
      const response = await fetch("/api/travel-planner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...requestData, apiKey: apiKey.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "行程暫時無法生成，請稍後再試。");
      setPlan(data); setPlanInputs(requestData);
      window.setTimeout(() => document.getElementById("itinerary")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "連線發生問題，請稍後再試。");
    } finally { setLoading(false); }
  }

  async function handleRevision() {
    const request = revisionRequest.trim();
    if (!plan || !request || revisionLoading) return;
    setRevisionError(""); setRevisionLoading(true);
    try {
      const response = await fetch("/api/travel-planner", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...(planInputs || { destination, days, budget, pace, interests: selected, customActivities, arrivalTime, returnTime }), apiKey: apiKey.trim(), currentPlan: plan, revisionRequest: request }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "行程暫時無法更新，請稍後再試。");
      setPlan(data); setRevisionRequest("");
      window.setTimeout(() => document.getElementById("itinerary")?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch (cause) {
      setRevisionError(cause instanceof Error ? cause.message : "連線發生問題，請稍後再試。");
    } finally { setRevisionLoading(false); }
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="旅伴，回到首頁"><span className="brand-mark">go</span><span>旅伴 <small>TRIPMATE</small></span></a>
        <nav className="main-nav" aria-label="主選單"><a href="#how-it-works">規劃方式</a><a href="#planner">開始規劃 <span>↗</span></a></nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow"><span /> YOUR TRIP, YOUR WAY</p>
          <h1>下一站，<br /><em>照你的方式玩。</em></h1>
          <p className="hero-description">目的地、預算、喜歡的玩法，一次選好。<br />快速整理成每天都好期待的旅行計畫。</p>
          <a className="text-link" href="#planner">開始安排 <span>↓</span></a>
          <div className="hero-caption"><span>✦</span><span>自己旅行・好友同行・親子出遊</span></div>
        </div>
        <div className="hero-image" role="group" aria-label="旅行風景照片輪播">
          <div key={heroSlides[activeSlide].src} className="hero-photo" aria-hidden="true" style={{ backgroundImage: `url("${heroSlides[activeSlide].src}")` }} />
          <div className="image-overlay-label"><span>TRIP IDEA 0{activeSlide + 1}</span><span>{heroSlides[activeSlide].place}</span></div>
          <div className="image-vertical">FIND YOUR NEXT FAVORITE PLACE</div>
          <div className="image-seal">GO<br />!</div>
          <div className="carousel-controls"><button type="button" aria-label="上一張風景照" onClick={() => setActiveSlide((activeSlide + heroSlides.length - 1) % heroSlides.length)}>‹</button>{heroSlides.map((slide, index) => <button type="button" key={slide.src} className={`carousel-dot ${index === activeSlide ? "is-active" : ""}`} aria-label={`切換到風景照 ${index + 1}`} aria-pressed={index === activeSlide} onClick={() => setActiveSlide(index)} />)}<button type="button" aria-label="下一張風景照" onClick={() => setActiveSlide((activeSlide + 1) % heroSlides.length)}>›</button></div>
        </div>
        <div className="hero-side-note">TAKE THE SCENIC ROUTE</div>
      </section>

      <section className="how-strip" id="how-it-works"><div className="how-heading"><p className="eyebrow">HOW IT WORKS</p><h2>三步驟，搞定下一趟</h2></div><div className="how-steps"><article><span>01</span><h3>輸入目的地</h3><p>想去哪裡，就從哪裡開始。</p></article><article><span>02</span><h3>挑選喜好</h3><p>天數、預算、想玩的都能調整。</p></article><article><span>03</span><h3>取得行程</h3><p>每天早午晚安排，一次看清楚。</p></article></div></section>

      <section className="planner-section" id="planner">
        <div className="section-heading"><div><p className="eyebrow">LET’S PLAN</p><h2>你的旅行條件</h2></div><p>填好幾個小細節，<br />我們來幫你排出好玩的路線。</p></div>
        <div className="planner-layout">
          <form className="planner-card" onSubmit={handleSubmit}>
            <div className="form-topline"><span>行程設定</span><span>01 — 你的旅行偏好</span></div>
            <div className="api-key-field">
              <label className="field-label" htmlFor="openai-api-key">OpenAI API Key</label>
              <input id="openai-api-key" className="destination-input" type="password" autoComplete="off" spellCheck={false} placeholder="sk-…" value={apiKey} onChange={(event) => updateApiKey(event.target.value)} disabled={!apiKeyLoaded} required />
              <p>金鑰會保存在這個瀏覽器的 localStorage，並在產生或修改行程時傳送給 OpenAI。請勿在共用裝置使用。</p>
            </div>
            <label className="field-label" htmlFor="destination">01 <span>想去的地方</span></label>
            <input id="destination" className="destination-input" value={destination} onChange={(event) => setDestination(event.target.value)} placeholder="例如：日本・京都" required maxLength={80} />
            <div className="form-divider" />
            <div className="field-row"><label className="field-label" htmlFor="days">02 <span>旅行天數</span></label><span className="field-value">{days} <small>天</small></span></div>
            <input id="days" className="range-input" type="range" min="1" max="30" value={days} style={{ "--range-progress": `${((days - 1) / 29) * 100}%` } as CSSProperties & { "--range-progress": string }} onChange={(event) => setDays(Number(event.target.value))} aria-label="旅行天數" />
            <div className="range-ends"><span>1 天</span><span>30 天</span></div>
            <div className="form-divider" />
            <div className="field-row"><label className="field-label" htmlFor="budget">03 <span>旅費預算（不含機票）</span></label><span className="budget-unit">TWD</span></div>
            <div className="budget-input-wrap"><span>NT$</span><input id="budget" className="budget-input" type="text" inputMode="numeric" value={budgetText} onChange={(event) => { const digits = event.target.value.replace(/[^0-9]/g, ""); setBudgetText(digits); setBudget(digits ? Number(digits) : 0); }} onBlur={() => setBudgetText(budget ? budget.toLocaleString("en-US") : "")} required aria-label="輸入不含機票的旅費預算" /><div className="budget-stepper"><button type="button" aria-label="增加預算一千元" onClick={() => { const next = budget + 1000; setBudget(next); setBudgetText(next.toLocaleString("en-US")); }}>↑</button><button type="button" aria-label="減少預算一千元" disabled={budget <= 1000} onClick={() => { const next = Math.max(1000, budget - 1000); setBudget(next); setBudgetText(next.toLocaleString("en-US")); }}>↓</button></div></div>
            <div className="form-divider" />
            <fieldset className="flight-field"><legend className="field-label">04 <span>來回航班時間（選填）</span></legend><p className="flight-hint">填寫目的地當地時間，協助安排抵達日與返程日行程。</p><div className="flight-inputs"><label htmlFor="arrival-time">去程抵達<input id="arrival-time" type="time" value={arrivalTime} onChange={(event) => setArrivalTime(event.target.value)} /></label><label htmlFor="return-time">返程起飛<input id="return-time" type="time" value={returnTime} onChange={(event) => setReturnTime(event.target.value)} /></label></div></fieldset>
            <div className="form-divider" />
            <fieldset className="choice-field"><legend className="field-label">05 <span>旅行步調</span></legend><div className="pace-options">{paces.map((option, index) => <button type="button" key={option} onClick={() => setPace(option)} className={`pace-option ${pace === option ? "is-selected" : ""}`}><span className="radio-dot" />{option}<small>0{index + 1}</small></button>)}</div></fieldset>
            <div className="form-divider" />
            <fieldset className="choice-field"><legend className="field-label">06 <span>想玩的主題</span></legend><div className="interest-options">{interests.map((interest) => <button type="button" key={interest} onClick={() => toggleInterest(interest)} className={`interest-chip ${selected.includes(interest) ? "is-selected" : ""}`} aria-pressed={selected.includes(interest)}>{interest}</button>)}</div><div className="custom-activity-block"><label className="custom-activity-label" htmlFor="custom-activities"><span className="custom-activity-icon">＋</span><span className="custom-activity-copy"><strong>有指定想做的事嗎？</strong><small>加一點你的專屬行程</small></span></label><input id="custom-activities" className="custom-activity-input" value={customActivities} onChange={(event) => setCustomActivities(event.target.value)} placeholder="例如：潛水、做陶藝、看一場球賽" maxLength={300} /></div></fieldset>
            <button className="submit-button" type="submit" disabled={loading}>{loading ? <><span className="spinner" /> 正在為你寫下旅程…</> : <>為我規劃一趟旅行 <ArrowIcon /></>}</button>
            {error && <p className="error-message" role="alert">{error}</p>}
            
          </form>
          <aside className="planner-aside"><div className="aside-photo" role="img" aria-label="陽光映照在古樸牆面上"><span>人氣路線靈感 <b>TRIP 01</b></span></div><div className="aside-quote"><span className="quote-mark">“</span><p>想踩點，或想放空？<br />照你的清單，<br /><em>排一趟剛剛好的旅程。</em></p><div className="quote-author"><span /> PLAN IT YOUR WAY</div></div><div className="aside-stamp">LET’S<br />GO</div></aside>
        </div>
      </section>

      {plan && <section className="itinerary-section" id="itinerary"><div className="itinerary-heading"><p className="eyebrow">YOUR JOURNEY, THOUGHTFULLY PLANNED</p><h2>{plan.title}</h2><p>{plan.introduction}</p><div className="itinerary-meta"><span>⌖ {plan.destination}</span><span>◷ {plan.days.length} 天</span><span>◇ {plan.budgetSummary}</span></div><div className="export-actions" aria-label="匯出行程表"><span>匯出行程表</span><button type="button" onClick={() => downloadWord(plan)}>Word</button><button type="button" onClick={() => downloadExcel(plan)}>Excel（CSV）</button><button type="button" onClick={() => window.print()}>PDF</button></div></div><div className="day-list">{plan.days.map((day) => <article className="day-card" key={day.day}><div className="day-heading"><span>DAY {String(day.day).padStart(2, "0")}</span><h3>{day.theme}</h3><span className="day-sprig">✳</span></div><div className="activity-grid">{([["早晨", day.morning], ["午後", day.afternoon], ["夜晚", day.evening]] as [string, Activity][]).map(([label, activity]) => <div className="activity" key={label}><span className="activity-time">{label} <i>{activity.time}</i></span><h4>{activity.title}</h4><p>{activity.description}</p><div className="activity-location">⌖ {activity.location}</div><div className="meal-tip">小提醒 <span>{activity.tip}</span></div></div>)}</div><section className="daily-meals" aria-label={`第 ${day.day} 天餐廳推薦`}><h4>今日餐廳推薦</h4><div className="meal-grid">{([["早餐", day.meals.breakfast], ["午餐", day.meals.lunch], ["晚餐", day.meals.dinner]] as [string, Meal][]).map(([label, meal]) => { const hasRestaurant = meal.name.trim() !== "" && meal.name.trim() !== "自行安排"; return <article className="meal-card" key={label}><span>{label}</span><h5>{hasRestaurant ? meal.name : "自行安排"}</h5><p>{meal.description}</p>{hasRestaurant && <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meal.name.trim())}`} target="_blank" rel="noreferrer">在 Google Maps 查看 ↗</a>}</article>; })}</div></section></article>)}</div>{plan.notes.length > 0 && <div className="plan-notes"><h3>出發前的小筆記</h3>{plan.notes.map((note, index) => <p key={index}><span>✳</span> {note}</p>)}</div>}<section className="revision-card" aria-labelledby="revision-title"><div className="revision-heading"><span className="revision-icon">✳</span><div><h3 id="revision-title">想調整哪個部分？</h3><p>告訴我們希望變更的行程、餐廳或步調，我們會依照你的條件重新整理整份行程。</p></div></div><label className="revision-label" htmlFor="revision-request">修改需求</label><textarea id="revision-request" className="revision-input" value={revisionRequest} onChange={(event) => { setRevisionRequest(event.target.value); setRevisionError(""); }} placeholder="例如：第二天少排一個景點，改成親子友善的活動；晚餐希望推薦素食餐廳。" maxLength={1000} rows={4} disabled={revisionLoading} /><div className="revision-footer"><span>{revisionRequest.length}/1000</span><button className="revision-submit" type="button" onClick={handleRevision} disabled={!revisionRequest.trim() || revisionLoading}>{revisionLoading ? "正在重新規劃…" : "依需求更新行程"}<span>↗</span></button></div>{revisionError && <p className="revision-error" role="alert">{revisionError}</p>}</section></section>}

      <footer className="site-footer"><a className="brand" href="#top"><span className="brand-mark">go</span><span>旅伴 <small>TRIPMATE</small></span></a><span>好好玩，照你的方式。</span><span>© 2026 旅伴 Tripmate</span></footer>
    </main>
  );
}
