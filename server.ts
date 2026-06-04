import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Robust getter for Gemini API client supporting custom user key header
function getGeminiClient(customApiKey?: string): GoogleGenAI | null {
  const apiKey = (customApiKey && customApiKey.trim().length > 0) ? customApiKey.trim() : process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
    return null;
  }
  return new GoogleGenAI({
    apiKey: apiKey.trim(),
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Helper sleep function for retries
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Robust wrapper to handle fallback across several supported models with linear backoff retry on transient errors
async function generateContentWithFallback(
  ai: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
  }
) {
  const models = [
    "gemini-3.5-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.1-pro-preview"
  ];
  let lastError: any = null;

  for (const modelName of models) {
    const maxRetries = 2; // up to 3 attempts total per model
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[Gemini] Attempting ${modelName} - Retry attempt ${attempt}/${maxRetries}`);
        } else {
          console.log(`[Gemini] Attempting call with model: ${modelName}`);
        }
        
        const response = await ai.models.generateContent({
          ...params,
          model: modelName,
        });
        console.log(`[Gemini] Successful call with model: ${modelName}`);
        return response;
      } catch (error: any) {
        lastError = error;
        const errMsg = error?.message || (typeof error === "string" ? error : JSON.stringify(error));
        console.warn(`[Gemini] Model ${modelName} failed on attempt ${attempt + 1}. Error:`, errMsg);

        // Check if error is transient (e.g. 503 unavailable, 429 resource exhausted, spikes in demand, etc.)
        const isTransient =
          errMsg.includes("503") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("429") ||
          errMsg.includes("high demand") ||
          errMsg.includes("temporary") ||
          errMsg.includes("RESOURCE_EXHAUSTED");

        if (attempt < maxRetries && isTransient) {
          const delay = (attempt + 1) * 1200; // 1200ms, then 2400ms
          console.log(`[Gemini] Transient error detected for ${modelName}. Waiting ${delay}ms before retrying...`);
          await sleep(delay);
        } else {
          // If not transient, or we spent all retries on this model, break and switch to next model immediately
          break;
        }
      }
    }
  }

  throw lastError || new Error("All candidate models failed to generate content.");
}

// 1. API: Server connection & AI availability healthcheck
app.get("/api/health", (req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY";
  res.json({
    status: "ok",
    aiAvailable: hasKey,
    currentDate: "2026-06-02T02:30:17Z",
  });
});

// 2. API: Parse user fields text input to determine optimal data types
app.post("/api/analyze-fields", async (req, res) => {
  try {
    const { fieldsText } = req.body;
    if (!fieldsText || typeof fieldsText !== "string") {
      return res.status(400).json({ error: "欄位輸入無效" });
    }

    const customKey = req.headers["x-gemini-api-key"] as string | undefined;
    const ai = getGeminiClient(customKey);
    if (!ai) {
      // Return simple client-fallback hint if no key
      return res.json({
        aiAvailable: false,
        message: "Gemini API 金鑰未配置。使用 client-side 規則分析。",
      });
    }

    // Call Gemini to classify the elements
    const systemPrompt = `你是一位專業的測試資料建模與生成專家。
請將使用者輸入的欄位名稱，精確地解析並對應到以下的【Data Type Schema】類型中：
- name: 真實中文姓名 (百家姓組合)。
- id_card: 台灣身分證字號格式。
- address: 台灣真實存在的地址格式 (包含縣市路名)。
- phone: 台灣手機格式 (09xxxxxxxx)。
- email: 合理的電子郵件。
- integer: 隨機整數、年齡、數量、排序。
- decimal: 隨機小數、金額、體溫、百分比。
- pattern: 混合格式。規則為 '#' 代表數字，'?' 代表字母 (如員工編號 "EMP-####"、訂單編號 "ORD-#####" 等)。
- text: 繁體中文隨機短句、產品名稱、留言備註。
- date: 格式為 YYYY-MM-DD。

請基於台灣的情境與最常見的用法進行分析與推薦合適的類型，同時如果偵測到是 pattern 或 integer，請智慧產生額外的預設參數 (例如:
- 若是 訂單編號，對應為 pattern, 預設樣板為 "ORD-########"
- 若是 員工編號，對應為 pattern, 預設樣板為 "EMP-#####"
- 若是 年齡，對應為 integer, 預設 min=18, max=65
- 若是 成績，對應為 integer, 預設 min=0, max=100
- 若是 價格，對應為 integer, 預設 min=50, max=5000
- 若是 評分，對應為 decimal, 預設 min=1, max=5, decimals=1
)。

請一律返回以下 JSON 陣列結構，不可包含 Markdown 或者是額外非 JSON 說明文字：ps. 不得使用 \`\`\` 塊包裝在 API 回傳中，直接提供 JSON 正規字串即可（或是設定 responseMimeType 為 application/json）。`;

    const cleanInput = fieldsText.trim();
    const response = await generateContentWithFallback(ai, {
      contents: `請分析以下欄位： [${cleanInput}]`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              fieldName: {
                type: Type.STRING,
                description: "原始欄位名稱",
              },
              type: {
                type: Type.STRING,
                description: "必須為以下之一: name, id_card, address, phone, email, integer, decimal, pattern, text, date",
              },
              reason: {
                type: Type.STRING,
                description: "為什麼判定為此類型的精確中文理由",
              },
              patternTemplate: {
                type: Type.STRING,
                description: "如果是 pattern，推薦的預設樣板，例如 'ORD-####'。否則為空。",
              },
              min: {
                type: Type.INTEGER,
                description: "如果是 integer/decimal，推薦的最小值（若無則不設）。",
              },
              max: {
                type: Type.INTEGER,
                description: "如果是 integer/decimal，推薦的最大值（若無則不設）。",
              },
              decimals: {
                type: Type.INTEGER,
                description: "如果是 decimal，小數位數。預設 1 或是 2。",
              },
            },
            required: ["fieldName", "type", "reason"],
          },
        },
      },
    });

    const textResult = response.text || "[]";
    const parsedData = JSON.parse(textResult.trim());
    res.json({ aiAvailable: true, results: parsedData });
  } catch (error: any) {
    console.error("AI 分析欄位失敗:", error);
    res.status(500).json({ error: "AI 分析處理出錯", details: error?.message || error });
  }
});

// 2.5 API: AI-Assisted High-Fidelity Batch Training File Spec Comprehension and Interpretation
app.post("/api/ai-train-interpret", async (req, res) => {
  try {
    const { columns } = req.body;
    if (!Array.isArray(columns) || columns.length === 0) {
      return res.status(400).json({ error: "無效的欄位資料列表" });
    }

    const customKey = req.headers["x-gemini-api-key"] as string | undefined;
    const ai = getGeminiClient(customKey);
    if (!ai) {
      return res.json({
        aiAvailable: false,
        message: "Gemini API 金鑰未配置。無法使用 AI 深度理解學習模式。"
      });
    }

    const systemPrompt = `你是一位頂尖的資料工程專家和測試資料建模教授。
目前使用者正在上傳 Excel 或 CSV 訓練檔以供資料產生器自動化「學習歷史規格與智慧建模」。
請深度閱讀以下提供的「欄位名稱及其 3 到 5 筆隨機值真實樣品」，進行高次元的語意和格式推理：
請精確分辨：
1. 通路管道：如果欄位關鍵字含 通路/管道，請設類別為 "text"，並在 config.options 中填入 "官網,電商,實體店面"。
2. 貨幣與金額：如果關鍵字含 金額/費用/營收/GMV/成本/折扣/價格/付款/薪資，或者樣例含有千分位/大額貨幣數值，設類別為 "integer" 或 "decimal"，並且在 config 中開啟 isCurrency: true。
3. 比率與百分比：如果是各類 達成率、投資報酬率、ROI、比例、YoY、MoM 等以「率」結尾的欄位，或樣品皆為 (0~2) 的小數或帶有 %，設為 "decimal"，開啟 config.isPercent: true，且 decimals 一般設 2。
4. 數量、筆數、次數、流量：如 訪客數、瀏覽量 (PV)、獨立訪客 (UV)、訂單數、用戶數、點擊量、次數、數量，設為 "integer"，並根據樣品提供合適的 min 與 max 整數範圍。
5. 活動名稱：如 行銷活動、Campaign，設為 "text"，能自動生成如「新會員入會禮」、「春季開幕禮」、「雙11感謝祭」、「週年慶感謝回饋」等經典活動，可附理由。
6. 日期或月份：如果是 月份、Cohort Month、註冊月份，設為 "date"，在 config 中開啟 isMonth: true，產出 YYYY-MM 月份；如果是具體日期 (看診日, 註冊日) 則為標準 "date"。
7. 姓名：客戶姓名、員工姓名、患者，設為 "name"，但排除產品、通路名、病名。
8. 其他常規 ID 等，可用 "pattern" (如 "ORD-######")、"email"、"phone"、"id_card"、"address"。

請對每個提供的欄位回傳高精細度的推導。

請一律返回以下 JSON 物件，格式為:
{
  "results": [
    {
      "header": "欄位 A",
      "type": "name" | "id_card" | "address" | "phone" | "email" | "integer" | "decimal" | "pattern" | "text" | "date",
      "reason": "極其專業、貼近使用者情境的中文多維推理理由",
      "config": {
        "min": 10,
        "max": 1000,
        "decimals": 1,
        "pattern": "EMP-####",
        "isCurrency": true, 
        "isPercent": true,
        "isMonth": true,
        "options": "選項A,選項B,選項C"
      }
    }
  ]
}

不得輸出任何 markdown 標記包裝在 API 回傳中，直接提供有效 JSON 字串。`;

    const response = await generateContentWithFallback(ai, {
      contents: `請以此批次欄位與真實樣品提供智慧訓練解讀：${JSON.stringify(columns)}`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            results: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  header: { type: Type.STRING },
                  type: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  config: {
                    type: Type.OBJECT,
                    properties: {
                      min: { type: Type.NUMBER },
                      max: { type: Type.NUMBER },
                      decimals: { type: Type.NUMBER },
                      pattern: { type: Type.STRING },
                      isCurrency: { type: Type.BOOLEAN },
                      isPercent: { type: Type.BOOLEAN },
                      isMonth: { type: Type.BOOLEAN },
                      options: { type: Type.STRING }
                    }
                  }
                },
                required: ["header", "type", "reason"]
              }
            }
          },
          required: ["results"]
        }
      }
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
    res.json({ aiAvailable: true, results: parsed.results || [] });
  } catch (error: any) {
    console.error("AI 智慧訓練分析失敗:", error);
    res.status(500).json({ error: "AI 智慧訓練分析失敗", details: error?.message });
  }
});

// 3. API: Fully interactive schema design & generator conversation
app.post("/api/ai-chat-suggest", async (req, res) => {
  try {
    const { prompt, currentFields } = req.body;
    const customKey = req.headers["x-gemini-api-key"] as string | undefined;
    const ai = getGeminiClient(customKey);
    if (!ai) {
      return res.json({
        aiAvailable: false,
        message: "Gemini API 金鑰未配置。",
      });
    }

    const systemPrompt = `你是一位專業的測試資料建模與生成專家。
使用者希望你為其設計、修改、或提供測試資料的規劃。
目前已有的欄位：
${JSON.stringify(currentFields || [])}

請針對使用者的中文敘述 (Prompt)，給予精煉且專業的指引。如果使用者希望新增欄位，或者是調整欄位：
1. 先回覆一段溫暖有禮、富設計感的簡短回覆。
2. 以 structured JSON 格式返回一組「推薦加入或更新的欄位」。

返回格式必須是 JSON 物件：
{
  "message": "親切的回覆，用 Markdown 寫得漂漂亮亮，給予專業建議，避免廢話！",
  "recommendedFields": [
    {
      "fieldName": "欄位名稱",
      "type": "name" | "id_card" | "address" | "phone" | "email" | "integer" | "decimal" | "pattern" | "text" | "date",
      "reason": "說明理由",
      "config": {
        "min": 10,
        "max": 100,
        "decimals": 1,
        "pattern": "EMP-####"
      }
    }
  ]
}

請設定 responseMimeType 為 application/json 來回傳。`;

    const response = await generateContentWithFallback(ai, {
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            message: {
              type: Type.STRING,
              description: "對使用者的專業回答 (Markdown 格式)",
            },
            recommendedFields: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  fieldName: { type: Type.STRING },
                  type: { type: Type.STRING },
                  reason: { type: Type.STRING },
                  config: {
                    type: Type.OBJECT,
                    properties: {
                      min: { type: Type.NUMBER },
                      max: { type: Type.NUMBER },
                      decimals: { type: Type.NUMBER },
                      pattern: { type: Type.STRING },
                    },
                  },
                },
                required: ["fieldName", "type"],
              },
            },
          },
          required: ["message", "recommendedFields"],
        },
      },
    });

    const parsed = JSON.parse(response.text?.trim() || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("AI 助理交談失敗:", error);
    res.status(500).json({ error: "AI 助理交談出錯", details: error?.message });
  }
});

// 4. API: Smart generation of realistic textual comments or product reviews for custom scenario matching
app.post("/api/generate-ai-text-rows", async (req, res) => {
  try {
    const { textFields, count } = req.body;
    const customKey = req.headers["x-gemini-api-key"] as string | undefined;
    const ai = getGeminiClient(customKey);
    if (!ai) {
      return res.json({ aiAvailable: false });
    }

    const itemsCount = Math.min(count || 10, 50); // limit to prevent key timeouts
    const systemPrompt = `你是一位台灣情境文字產生助手。你必須產生一個 JSON 陣列，長度為 ${itemsCount}。
每一個物件中，請為以下提供的欄位名稱產生極度逼真、富在地情境、具備合理多樣性的繁體中文資料：
提供欄位：${JSON.stringify(textFields)}

例如：
如果欄位是 "商品備註"，可產生 "微糖微冰、珍珠加量", "無香精純黑巧克力，買給小孩很安心", "有輕微刮痕但不影響運作" 等。
如果欄位是 "診斷症狀"，可產生 "病患主訴持續咳嗽、發燒達 38.5 度、喉嚨發炎紅腫", "高血壓追蹤，定期服藥，血壓大致穩定" 等。
如果欄位是 "食品名稱"，可產生 "大安路鹽酥雞", "鮮芋仙雙圓仙草凍", "經典香草起司蛋糕"。

請直接回傳 JSON 陣列，不要有 markdown 包裹，格式必須是：
[
  { "欄位A": "生成文字1", "欄位B": "生成文字X" },
  { "欄位A": "生成文字2", "欄位B": "生成文字Y" }
]`;

    const response = await generateContentWithFallback(ai, {
      contents: "請開始產生數據。",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
      },
    });

    const generated = JSON.parse(response.text?.trim() || "[]");
    res.json({ aiAvailable: true, data: generated });
  } catch (err: any) {
    console.error("AI 產生文字欄位失敗:", err);
    res.status(500).json({ error: "AI 產生文字失敗", details: err?.message });
  }
});


// Serve static files / set up server listening
async function startServer() {
  // Vite setup for development mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[MockData Server] Running at http://localhost:${PORT}`);
  });
}

startServer();
