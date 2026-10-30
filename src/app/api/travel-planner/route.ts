type TravelRequest = {
  apiKey?: unknown;
  destination?: unknown;
  days?: unknown;
  budget?: unknown;
  pace?: unknown;
  interests?: unknown;
  customActivities?: unknown;
  arrivalTime?: unknown;
  returnTime?: unknown;
  currentPlan?: unknown;
  revisionRequest?: unknown;
};

const activitySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    time: { type: "string" },
    title: { type: "string" },
    description: { type: "string" },
    location: { type: "string" },
    tip: { type: "string" },
  },
  required: ["time", "title", "description", "location", "tip"],
} as const;

const mealSchema = {
  type: "object",
  additionalProperties: false,
  properties: { name: { type: "string" }, description: { type: "string" } },
  required: ["name", "description"],
} as const;

const itinerarySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    introduction: { type: "string" },
    destination: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          day: { type: "integer" },
          theme: { type: "string" },
          morning: activitySchema,
          afternoon: activitySchema,
          evening: activitySchema,
          meals: {
            type: "object", additionalProperties: false,
            properties: { breakfast: mealSchema, lunch: mealSchema, dinner: mealSchema },
            required: ["breakfast", "lunch", "dinner"],
          },
        },
        required: ["day", "theme", "morning", "afternoon", "evening", "meals"],
      },
    },
    budgetSummary: { type: "string" },
    notes: { type: "array", items: { type: "string" } },
  },
  required: ["title", "introduction", "destination", "days", "budgetSummary", "notes"],
} as const;

export async function POST(request: Request) {
  let input: TravelRequest;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "請提供有效的行程資料。" }, { status: 400 });
  }

  const destination = typeof input.destination === "string" ? input.destination.trim() : "";
  const apiKey = typeof input.apiKey === "string" ? input.apiKey.trim() : "";
  const days = Number(input.days);
  const budget = Number(input.budget);
  const pace = typeof input.pace === "string" ? input.pace : "步調適中";
  const customActivities = typeof input.customActivities === "string" ? input.customActivities.trim().slice(0, 300) : "";
  const arrivalTime = typeof input.arrivalTime === "string" ? input.arrivalTime : "";
  const returnTime = typeof input.returnTime === "string" ? input.returnTime : "";
  const revisionRequest = typeof input.revisionRequest === "string" ? input.revisionRequest.trim().slice(0, 1000) : "";
  const currentPlan = input.currentPlan && typeof input.currentPlan === "object" ? input.currentPlan : null;
  const interests = Array.isArray(input.interests)
    ? input.interests.filter((item): item is string => typeof item === "string").slice(0, 10)
    : [];

  if (!destination || destination.length > 80) {
    return Response.json({ error: "請輸入目的地（最多 80 個字）。" }, { status: 400 });
  }
  if (!Number.isInteger(days) || days < 1 || days > 30) {
    return Response.json({ error: "旅行天數請設定為 1 至 30 天。" }, { status: 400 });
  }
  const validTime = (value: string) => value === "" || /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
  if (!validTime(arrivalTime) || !validTime(returnTime)) {
    return Response.json({ error: "航班時間請使用有效的 24 小時制時間。" }, { status: 400 });
  }
  const currentDays = currentPlan && Array.isArray((currentPlan as { days?: unknown }).days) ? (currentPlan as { days: unknown[] }).days : null;
  const currentPlanSize = currentPlan ? (JSON.stringify(currentPlan) ?? "").length : 0;
  if (revisionRequest && (!currentPlan || !currentDays || currentDays.length !== days || currentPlanSize > 80_000)) {
    return Response.json({ error: "目前行程資料不完整，請重新生成後再提出修改。" }, { status: 400 });
  }
  if (!Number.isSafeInteger(budget) || budget < 1) {
    return Response.json({ error: "請輸入有效的旅費預算。" }, { status: 400 });
  }

  if (!apiKey || apiKey.length > 500) {
    return Response.json({ error: "請先輸入有效的 OpenAI API Key。" }, { status: 400 });
  }

  try {
    const completion = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        response_format: {
          type: "json_schema",
          json_schema: { name: "travel_itinerary", strict: true, schema: itinerarySchema },
        },
        messages: [
          {
            role: "system",
            content: "你是一位熟悉目的地文化、在地飲食與旅行節奏的繁體中文旅程編輯。依照使用者條件，寫出具體、舒適、可執行的旅行提案。全程使用繁體中文。每天必須提供 morning、afternoon、evening 三個時段與 breakfast、lunch、dinner 三餐安排，兼顧合理移動距離與使用者指定步調；若使用者填寫自訂活動體驗，優先納入行程。每一餐都要提供具體餐廳推薦：優先依當餐時段與當天行程所在區域，推薦你有合理把握真實存在、可在 Google Maps 辨認的店名，並簡述適合原因；不可因為不確定、資料不足或想省事就填「自行安排」，也不可捏造店名、地址、營業時間、價格或交通資訊。只有行程明確顯示該餐不需另行用餐（例如該時段仍在移動／搭乘交通工具而無合理用餐空檔），或當日一日遊／套裝行程明確包含該餐時，才可填「自行安排」；description 必須指出具體原因（例如「一日遊行程已含午餐」），不得只寫「可在附近依喜好選擇」。一般抵達日、自由活動、景點附近缺乏把握等情況仍須推薦所在區域的合適店家；無法確認招牌店時，改推薦該區常見且易辨認的餐廳／美食街選項，不可用「自行安排」迴避。若提供去程抵達時間，請依目的地當地時間安排第一天：上午抵達可安排上午起活動，午後抵達則早晨標示抵達/移動休息並將主要活動從午後開始，深夜抵達則不排當日觀光。若提供返程起飛時間，最後一天只安排起飛前可完成的活動並預留前往機場時間；清晨航班不排觀光，午後航班安排輕量上午行程。未填寫航班時間時按完整旅行日安排。每個 activity 的 location 寫景點／區域或餐廳名；tip 提供簡短實用提醒。使用者提供的是全程每人旅費總預算，明確不含往返機票；規劃時只能將這筆預算分配給住宿、當地交通、餐飲、門票與活動等旅途中開銷，絕不可把機票費用計入或要求從此預算扣除機票。budgetSummary 應以不含機票為前提，給出務實的各項預算安排描述，但不要聲稱精確報價。若使用者提供 currentPlan 和 revisionRequest，請以 currentPlan 為修改基礎，完整採納 revisionRequest 明確提出的調整，並保留使用者原始目的地、天數、預算（不含機票）、步調、興趣與航班條件；未要求更動的偏好盡量維持。回傳完整更新後的所有天數行程，不要只回覆修改摘要。notes 提供 2 至 4 則注意事項。",
          },
          {
            role: "user",
            content: JSON.stringify({ destination, days, budgetTwd: budget, pace, interests, customActivities, arrivalTime: arrivalTime || null, returnTime: returnTime || null, currentPlan, revisionRequest: revisionRequest || null }),
          },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!completion.ok) {
      const errorBody = await completion.json().catch(() => null);
      const upstreamMessage = typeof errorBody?.error?.message === "string"
        ? errorBody.error.message.replaceAll(apiKey, "[redacted]").slice(0, 240)
        : "";
      console.error("OpenAI itinerary request failed:", completion.status, upstreamMessage);
      const message = completion.status === 400 && upstreamMessage
        ? `OpenAI 請求設定錯誤：${upstreamMessage}`
        : completion.status === 401
        ? "OpenAI API Key 無效，請檢查金鑰後再試。"
        : completion.status === 429
          ? "OpenAI API 額度不足或目前請求過多，請檢查帳戶額度後再試。"
          : "行程服務暫時忙碌，請稍後再試。";
      return Response.json({ error: message }, { status: 502 });
    }

    const result = await completion.json();
    const content = result.choices?.[0]?.message?.content;
    if (typeof content !== "string") {
      return Response.json({ error: "目前無法整理出完整行程，請稍後再試。" }, { status: 502 });
    }

    const itinerary = JSON.parse(content);
    if (!Array.isArray(itinerary.days) || itinerary.days.length !== days) {
      return Response.json({ error: "行程內容不完整，請重新規劃一次。" }, { status: 502 });
    }
    return Response.json(itinerary);
  } catch (error) {
    console.error("Travel planner error:", error);
    const isTimeout = error instanceof Error && error.name === "TimeoutError";
    return Response.json(
      { error: isTimeout ? "規劃時間較長，請再試一次。" : "行程生成時發生問題，請稍後再試。" },
      { status: isTimeout ? 504 : 502 },
    );
  }
}
