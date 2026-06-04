/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useMemo } from "react";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  Database, 
  Sparkles, 
  Trash2, 
  Plus, 
  Sliders, 
  Copy, 
  Download, 
  RefreshCw, 
  Check, 
  FileJson, 
  FileSpreadsheet, 
  Terminal, 
  Lightbulb, 
  User, 
  Send,
  AlignLeft,
  Calendar,
  CreditCard,
  Hash,
  MapPin,
  Mail,
  Phone,
  HelpCircle,
  FileCode,
  CheckCircle2,
  KeyRound,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Upload,
  FileUp,
  Link2,
  AlertTriangle,
  AlertCircle,
  Brain,
  X
} from "lucide-react";

import * as XLSX from "xlsx";

import { SchemaField, FieldType, FieldConfig, PRESET_TEMPLATES, PresetTemplate } from "./types";
import { generateMockData } from "./generator";

// Local automatic Taiwanese field classifier
function inferLocalFieldType(name: string): { type: FieldType; reason: string; config: FieldConfig } {
  const trim = name.trim();
  if (/姓名|收件人|患者|顧客|客戶|聯絡人|負責人|雇員|員工姓名|會員姓名/i.test(trim) && !/商品|產品|品項|型態|軟體|硬體|機型|車款|店名|病名|分區|類別/i.test(trim)) {
    return { type: "name", reason: "符合人名常用關鍵字，預設真實中文姓名組合", config: {} };
  }
  if (/身分證|身份證|身分證字號|ROC ID|ID_CARD|ID/i.test(trim)) {
    return { type: "id_card", reason: "符合中華民國身分證字號格式，支援性別雙向驗證", config: {} };
  }
  if (/地址|住址|居住地|戶籍|配送|門牌|路段|地段|區段位置/i.test(trim)) {
    return { type: "address", reason: "符合居住、配送、路段、地段或門牌地址常用關鍵字，預設為真實台灣實體地址", config: {} };
  }
  if (/手機|電話|手機號碼|聯絡電話|09/i.test(trim)) {
    return { type: "phone", reason: "符合台灣「09」開頭行動手機電話格式", config: {} };
  }
  if (/信箱|電子郵件|Email|mail/i.test(trim)) {
    return { type: "email", reason: "符合電子郵件信箱規格", config: {} };
  }
  if (/活動|活動名稱|推廣活動|行銷活動|Campaign/i.test(trim)) {
    return { type: "text", reason: "符合行銷與促銷活動名稱關鍵字，隨機生成如「感謝祭」、「開幕禮」等常見行銷檔期名稱", config: {} };
  }
  if (/月份|Month|cohort/i.test(trim)) {
    return { type: "date", reason: "符合月份與同儕群組常用關鍵字，預設為 YYYY-MM 月份格式", config: { isMonth: true, dateMin: "2021-01-01", dateMax: "2026-06-02" } };
  }
  if (/日期|生日|看診日|入職日|註冊日|時間|學期/i.test(trim)) {
    return { type: "date", reason: "符合日期格式，預設 YYYY-MM-DD", config: { dateMin: "2020-01-01", dateMax: "2026-06-02" } };
  }
  if (/流水號|編號|序號|編碼|代碼|代號|員工編號|訂單編號|會員編碼|班級/i.test(trim)) {
    let pat = "TX-#####";
    if (/訂單/i.test(trim)) pat = "ORD-2026-####-??";
    if (/員工|工號/i.test(trim)) pat = "EMP-#####";
    if (/會員/i.test(trim)) pat = "VIP-######";
    return { type: "pattern", reason: "流水格式化編碼，預設「#」為數字、「?」為大寫字母", config: { pattern: pat } };
  }
  if (/通路|管道|銷售管道|銷售通路/i.test(trim)) {
    return { type: "text", reason: "符合通路管道關鍵字，提供官網、電商、實體店面選項", config: { options: "官網,電商,實體店面" } };
  }
  if (/率$|比率|比例|ROI|年增率|MoM|YoY|達成率|投投率/i.test(trim)) {
    return { type: "decimal", reason: "符合佔比與投資報酬率屬性，設定為 2 位小數之百分比格式", config: { min: 0.1, max: 1.5, decimals: 2, isPercent: true } };
  }
  if (/數量|件數|個數|銷量|筆數|Qty|用戶數|會員數|訪客數|瀏覽數|人數|遊客數|瀏覽量|次數|訂單數|PV|UV/i.test(trim)) {
    return { type: "integer", reason: "符合數量、件數、瀏覽量、用戶人數、次數或訂單指標，設定為合理整數數值格式", config: { min: 10, max: 150000 } };
  }
  if (/金額|價格|價|薪|資|總額|消費額|成本|費用|營收|實收|付|利潤|GMV/i.test(trim)) {
    if (/分數|成績|評分/.test(trim)) {
      return { type: "integer", reason: "符合整數數值類別，限制 0 - 100 區間", config: { min: 0, max: 100 } };
    }
    if (/體重|身高|評分|星等/.test(trim)) {
      return { type: "decimal", reason: "符合小數規格數值，預設 1 位小數", config: { min: 1, max: 150, decimals: 1 } };
    }
    return { type: "integer", reason: "符合財政金融金額規格，自動開啟貨幣千分位格式", config: { min: 100, max: 30000, isCurrency: true } };
  }
  if (/商品|產品|品項|類別|品類|貨品/i.test(trim)) {
    return { type: "text", reason: "符合實體零售與產品、品類欄位，與商品庫對齊數據", config: {} };
  }
  if (/診斷|症狀|敘述|說明|留言|評論|商品品項|備註|意見/i.test(trim)) {
    return { type: "text", reason: "符合隨機中文中長描述或熱門商品品項", config: {} };
  }
  return { type: "text", reason: "未偵測到明顯規則，預設為繁體中文實用短句或商品名", config: {} };
}

function detectPatternFromSamples(samples: string[]): string {
  if (samples.length === 0) return "TX-#####";
  const minLen = Math.min(...samples.map(s => s.length));
  const maxLen = Math.max(...samples.map(s => s.length));
  
  if (minLen === maxLen && minLen > 0) {
    let pattern = "";
    for (let i = 0; i < minLen; i++) {
      const charAtPos = samples.map(s => s[i]);
      const uniqueCharsAtPos = new Set(charAtPos);
      if (uniqueCharsAtPos.size === 1) {
        pattern += charAtPos[0];
      } else {
        const allNumbers = charAtPos.every(c => /\d/.test(c));
        const allLetters = charAtPos.every(c => /[a-zA-Z]/.test(c));
        if (allNumbers) {
          pattern += "#";
        } else if (allLetters) {
          pattern += "?";
        } else {
          pattern += "?";
        }
      }
    }
    return pattern;
  } else {
    // Differing lengths - try common prefix
    let prefix = "";
    for (let i = 0; i < minLen; i++) {
      const charAtPos = samples.map(s => s[i]);
      const uniqueCharsAtPos = new Set(charAtPos);
      if (uniqueCharsAtPos.size === 1) {
        prefix += charAtPos[0];
      } else {
        break;
      }
    }
    if (prefix.length > 0) {
      return prefix + "#####";
    }
    return "ID-#####";
  }
}

function analyzeColumnSpecs(
  header: string,
  colValues: string[]
): { type: FieldType; reason: string; config: FieldConfig } {
  const trimHeader = header.trim();
  const totalCount = colValues.length;
  const uniqueValues = new Set(colValues);
  const uniqueCount = uniqueValues.size;

  let inferredType: FieldType = "text";
  let inferredReason = "";
  let inferredConfig: FieldConfig = {};

  // 1. Detect Standard Formats based on scanned values (e.g. majority match)
  const continuousPhoneCount = colValues.filter(val => /^09\d{8}$/.test(val)).length;
  const dashedPhoneCount = colValues.filter(val => /^09\d{2}-\d{3}-\d{3}$/.test(val) || /^09\d{2}-\d{6}$/.test(val)).length;
  const phoneCount = continuousPhoneCount + dashedPhoneCount;
  const idCardCount = colValues.filter(val => /^[A-Z][12]\d{8}$/i.test(val)).length;
  const emailCount = colValues.filter(val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)).length;
  const dateCount = colValues.filter(val => /^\d{4}[-/]\d{2}[-/]\d{2}$/.test(val) || /^\d{4}\/\d{2}\/\d{2}$/.test(val)).length;
  const numberCount = colValues.filter(val => val !== "" && !isNaN(Number(val))).length;
  const decimalCount = colValues.filter(val => val !== "" && !isNaN(Number(val)) && val.includes(".")).length;

  if (totalCount > 0 && phoneCount / totalCount >= 0.5) {
    inferredType = "phone";
    const preferredFormat = dashedPhoneCount >= continuousPhoneCount ? "dashed" : "continuous";
    inferredConfig = { phoneFormat: preferredFormat };
    inferredReason = `手機辨識：掃描前 100 行中 ${phoneCount} 筆符合台灣 09 開頭手機格式 (已自動搭配 ${preferredFormat === "dashed" ? "「含連字號」" : "「純數字」"} 格式)`;
  } else if (totalCount > 0 && idCardCount / totalCount >= 0.5) {
    inferredType = "id_card";
    inferredReason = `身分證辨識：掃描前 100 行中 ${idCardCount} 筆符合 ROC 身分證校驗格式`;
  } else if (totalCount > 0 && emailCount / totalCount >= 0.5) {
    inferredType = "email";
    inferredReason = `信箱辨識：掃描前 100 行中 ${emailCount} 筆符合電子信箱格式規範`;
  } else if (totalCount > 0 && dateCount / totalCount >= 0.5) {
    inferredType = "date";
    inferredReason = `日期辨識：掃描前 100 行中 ${dateCount} 筆為標準 YYYY-MM-DD 或 YYYY/MM/DD 日期格式`;
    const dates = colValues.filter(val => /^\d{4}[-/]\d{2}[-/]\d{2}$/.test(val) || /^\d{4}\/\d{2}\/\d{2}$/.test(val)).map(val => val.replace(/\//g, "-"));
    if (dates.length > 0) {
      dates.sort();
      inferredConfig.dateMin = dates[0];
      inferredConfig.dateMax = dates[dates.length - 1];
    } else {
      inferredConfig.dateMin = "2020-01-01";
      inferredConfig.dateMax = "2026-06-02";
    }
  } else if (totalCount > 0 && numberCount / totalCount >= 0.5) {
    const numericVals = colValues.map(v => Number(v)).filter(n => !isNaN(n));
    const minVal = numericVals.length > 0 ? Math.min(...numericVals) : 0;
    const maxVal = numericVals.length > 0 ? Math.max(...numericVals) : 1000;

    if (decimalCount / totalCount >= 0.5) {
      inferredType = "decimal";
      const floatSamples = colValues.filter(v => v.includes("."));
      const decLen = floatSamples.length > 0 ? (floatSamples[0].split(".")[1]?.length || 1) : 1;
      inferredReason = `小數辨識：掃描前 100 行高比例為小數值，系統自動設定區間為 [${minVal} - ${maxVal}]`;
      inferredConfig = { decimals: decLen, min: minVal, max: maxVal };
    } else {
      inferredType = "integer";
      inferredReason = `整數辨識：掃描前 100 行高比例為整數值，系統自動設定區間為 [${minVal} - ${maxVal}]`;
      inferredConfig = { min: minVal, max: maxVal };
    }
  } else {
    // Fallback to name-based logic first
    const inf = inferLocalFieldType(trimHeader);
    inferredType = inf.type;
    inferredReason = `自訂欄位「${trimHeader}」標題特徵比對 (${inf.reason})`;
    inferredConfig = inf.config;
  }

  // 2. Uniqueness Check / ID column mapping (Override or enrich if fully unique)
  if (totalCount >= 3 && uniqueCount === totalCount) {
    if (inferredType === "text" || inferredType === "integer" || inferredType === "pattern") {
      const isPureNumeric = colValues.every(val => /^\d+$/.test(val));
      if (isPureNumeric) {
        inferredType = "integer";
        const numericVals = colValues.map(v => Number(v));
        const minVal = Math.min(...numericVals);
        const maxVal = Math.max(...numericVals);
        inferredConfig = { min: minVal, max: maxVal };
        inferredReason = `🎯 偵測為 Uniqueness: 100% 唯一值 (判定為數值型主要識別 ID 欄位)；區間：[${minVal} - ${maxVal}]`;
      } else {
        inferredType = "pattern";
        const patternVal = detectPatternFromSamples(colValues);
        inferredConfig = { pattern: patternVal };
        inferredReason = `🎯 偵測為 Uniqueness: 100% 唯一值 (判定為字母/數字混合型主要識別 ID 欄位)，自動提取規格編碼：${patternVal}`;
      }
    }
  }

  // 3. Format Convergence Check (Value Set override)
  if (totalCount >= 4 && uniqueCount <= 15 && uniqueCount < totalCount) {
    const optionsList = Array.from(uniqueValues).join(", ");
    inferredConfig.options = optionsList;
    inferredReason = `♻️ 格式收斂性分析：自動掃描 100 列發現僅有 ${uniqueCount} 種固定值收斂，排除 AI 後精準提取 Options 真實選單：${optionsList}`;
  }

  return {
    type: inferredType,
    reason: inferredReason,
    config: inferredConfig
  };
}

export default function App() {
  // 1. App State
  const [fields, setFields] = useState<SchemaField[]>([]);
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const [fieldsInputText, setFieldsInputText] = useState("姓名, 身分證字號, 手機號碼, 累計點數, 居住地址, 入職日期, 備註");
  const [rowCount, setRowCount] = useState<number>(20);
  const [aiAvailable, setAiAvailable] = useState<boolean>(false);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);
  const [uploadNotification, setUploadNotification] = useState<string | null>(null);
  
  // Custom user-provided Gemini API Key block
  const [userApiKey, setUserApiKey] = useState<string>(() => {
    return localStorage.getItem("user_gemini_api_key") || "";
  });
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [keySavedNotification, setKeySavedNotification] = useState<boolean>(false);
  
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  
  // Custom generated outputs
  const [generatedRows, setGeneratedRows] = useState<Record<string, any>[]>([]);
  const [aiTextRows, setAiTextRows] = useState<Record<string, string[]>>({});
  const [enableAiTextEnhancement, setEnableAiTextEnhancement] = useState(true);
  const [enableAiTrainingInterpret, setEnableAiTrainingInterpret] = useState(true);
  
  // Presentation Controls
  const [activeTab, setActiveTab] = useState<"preview" | "json" | "csv" | "sql">("preview");
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [tableName, setTableName] = useState<string>("mock_data_tw");
  
  // UI Actions
  const [copied, setCopied] = useState<boolean>(false);
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);
  const [showConfigId, setShowConfigId] = useState<string | null>(null);

  // Consistency Validation State
  const [showValidationModal, setShowValidationModal] = useState<boolean>(false);
  const [validationSuccessMsg, setValidationSuccessMsg] = useState<string | null>(null);

  // Memoized Consistency Validation Issues Scanner
  interface ValidationIssue {
    id: string;
    fieldId: string;
    fieldName: string;
    type: "error" | "warning" | "info";
    title: string;
    message: string;
    fixDescription: string;
    actionType: string;
    actionData?: any;
  }

  const validationIssues = useMemo<ValidationIssue[]>(() => {
    const issues: ValidationIssue[] = [];

    // Cycle detection helper starting from a node
    const detectCycle = (startFieldId: string): string[] | null => {
      const visited = new Set<string>();
      let currId = startFieldId;
      const path: string[] = [];
      while (currId) {
        if (visited.has(currId)) {
          const cycleStartIdx = path.indexOf(currId);
          return path.slice(cycleStartIdx);
        }
        visited.add(currId);
        path.push(currId);
        const currF = fields.find(f => f.id === currId);
        currId = currF?.config?.relationTargetFieldId || "";
      }
      return null;
    };

    // 1. Scan each field
    fields.forEach((field) => {
      const targetId = field.config?.relationTargetFieldId;
      const relationType = field.config?.relationType;

      if (targetId) {
        const target = fields.find(f => f.id === targetId);

        // a) Target field does not exist
        if (!target) {
          issues.push({
            id: `missing_target_${field.id}`,
            fieldId: field.id,
            fieldName: field.fieldName,
            type: "error",
            title: "所依賴的關聯欄位不存在",
            message: `欄位「${field.fieldName}」設定了關聯規則，但所指定的依賴目標欄位不存在或已被刪除。這會使模擬資料產出的前後邏輯不連貫。`,
            fixDescription: "一鍵清除此欄位之失效關聯",
            actionType: "RESET_RELATION"
          });
          return;
        }

        // b) Self dependency
        if (targetId === field.id) {
          issues.push({
            id: `self_dependency_${field.id}`,
            fieldId: field.id,
            fieldName: field.fieldName,
            type: "error",
            title: "自我關聯依存錯誤",
            message: `欄位「${field.fieldName}」的關聯目標設定為它自己，此配置在關聯資料生成邏輯中屬於不合理的自我無限迭代圈。`,
            fixDescription: "清除本欄位的依賴結構",
            actionType: "RESET_RELATION"
          });
          return;
        }

        // c) Circular dependency
        const cyclePath = detectCycle(field.id);
        if (cyclePath && cyclePath.includes(field.id)) {
          const namesPath = cyclePath.map(id => fields.find(f => f.id === id)?.fieldName || id).join(" ➔ ");
          issues.push({
            id: `circular_${field.id}`,
            fieldId: field.id,
            fieldName: field.fieldName,
            type: "error",
            title: "偵測到循環關聯衝突 (Circular Reference)",
            message: `在載入依賴順序時偵測到循環閉迴路：[ ${namesPath} ➔ ${field.fieldName} ]。循環關聯將造成資料產生器在拓撲排序時無法確定先後次序！`,
            fixDescription: "解除此欄位的依賴關係（將其設定為獨立欄位）",
            actionType: "RESET_RELATION"
          });
          return;
        }

        // d) Relation rule compatibility checks (Date/Numeric comparisons)
        if (relationType === "greater_than" || relationType === "less_than") {
          // Date with Date
          if (field.type === "date" && target.type !== "date") {
            issues.push({
              id: `type_mismatch_date_${field.id}`,
              fieldId: field.id,
              fieldName: field.fieldName,
              type: "error",
              title: "日期與非日期比對衝突",
              message: `依賴方「${field.fieldName}」（日期型態）設定大小比對，但所依賴的「${target.fieldName}」為「${target.type}」型態。大小比對規則兩端皆必須同為「日期區間 (date)」方能正確運算。`,
              fixDescription: `將被依賴目標「${target.fieldName}」也變更為「日期區間 (date)」型態`,
              actionType: "CONVERT_FIELD_TYPE",
              actionData: { fieldId: target.id, targetType: "date" }
            });
          } else if (field.type !== "date" && target.type === "date") {
            issues.push({
              id: `type_mismatch_date_reverse_${field.id}`,
              fieldId: field.id,
              fieldName: field.fieldName,
              type: "error",
              title: "日期與非日期比對衝突",
              message: `依賴方「${field.fieldName}」（${field.type}）設定比對關聯，但目標「${target.fieldName}」為「日期區間（date）」。兩端皆必須為「日期區間」方能進行時間比對。`,
              fixDescription: `將此欄位「${field.fieldName}」格式也變更為「日期區間 (date)」型態`,
              actionType: "CONVERT_FIELD_TYPE",
              actionData: { fieldId: field.id, targetType: "date" }
            });
          }

          // Numeric check
          const isFNum = field.type === "integer" || field.type === "decimal";
          const isTNum = target.type === "integer" || target.type === "decimal";
          if (isFNum && !isTNum) {
            issues.push({
              id: `type_mismatch_num_${field.id}`,
              fieldId: field.id,
              fieldName: field.fieldName,
              type: "error",
              title: "數值與非數值大小比對",
              message: `依賴方「${field.fieldName}」是隨機數值格式，而目標「${target.fieldName}」為「${target.type}」型態。大小等值比對只適用於同為「隨機整數」或「隨機小數」的相容欄位。`,
              fixDescription: `變更對照目標「${target.fieldName}」的型態為「隨機整數 (integer)」`,
              actionType: "CONVERT_FIELD_TYPE",
              actionData: { fieldId: target.id, targetType: "integer" }
            });
          } else if (!isFNum && !isTNum && field.type !== "date") {
            issues.push({
              id: `unsupported_inequality_${field.id}`,
              fieldId: field.id,
              fieldName: field.fieldName,
              type: "warning",
              title: "不合適的大小關係規則",
              message: `欄位「${field.fieldName}」為文字/情境描述型態，現卻套用了「大於 / 小於」的大非數值關係，計算時可能會失效。`,
              fixDescription: `將關聯類型調整為「條件對照 (lookup)」並清除無效算式`,
              actionType: "SET_RELATION_TYPE",
              actionData: { fieldId: field.id, relationType: "lookup" }
            });
          }
        }

        // e) Lookup configurations empty check
        if (relationType === "lookup") {
          const mapStr = field.config?.relationLookupMap;
          if (!mapStr || !mapStr.trim()) {
            issues.push({
              id: `empty_lookup_${field.id}`,
              fieldId: field.id,
              fieldName: field.fieldName,
              type: "warning",
              title: "條件對照表空白未設定",
              message: `欄位「${field.fieldName}」設定了條件對照 (Lookup Map)，但對應表為空，這會導致資料生成失敗或產生全空值。`,
              fixDescription: "自動建立符合格式的範例對照組",
              actionType: "APPLY_DEFAULT_LOOKUP",
              actionData: { fieldId: field.id }
            });
          } else if (!mapStr.includes(":")) {
            issues.push({
              id: `invalid_lookup_${field.id}`,
              fieldId: field.id,
              fieldName: field.fieldName,
              type: "warning",
              title: "條件對照表格式不正確",
              message: `欄位「${field.fieldName}」的條件對置設定不包含分隔冒號「:」。正確樣式為「鍵值:選項1,選項2;鍵值2:選項3」`,
              fixDescription: "重置並套用標準格式對照表範例",
              actionType: "APPLY_DEFAULT_LOOKUP",
              actionData: { fieldId: field.id }
            });
          }
        }
      }
    });

    // 2. Cross-fields contextual checks (Age & Birthday, Job Seniority & Hire Date)
    // Find age related fields
    const ageFields = fields.filter(f => {
      const lower = f.fieldName.toLowerCase();
      return lower.includes("年齡") || lower === "age" || lower === "年歲" || lower.includes("歲數");
    });
    // Find birth related date fields
    const birthFields = fields.filter(f => {
      const lower = f.fieldName.toLowerCase();
      return f.type === "date" && (lower.includes("生日") || lower.includes("出生") || lower.includes("birthday") || lower.includes("birth"));
    });

    ageFields.forEach(ageF => {
      // Rule A: Age field has to be type integer
      if (ageF.type !== "integer") {
        issues.push({
          id: `age_type_mismatch_${ageF.id}`,
          fieldId: ageF.id,
          fieldName: ageF.fieldName,
          type: "warning",
          title: "年齡欄位型態優化建議",
          message: `「${ageF.fieldName}」名字暗示是年歲數值，但目前為「${ageF.type}」型態。建議將其設為「隨機整數 (integer)」，系統在生成時會自動參照標準時間 2026-06-02 與生日進行智慧精密扣減！`,
          fixDescription: `變更「${ageF.fieldName}」型態為「隨機整數 (integer)」`,
          actionType: "CONVERT_FIELD_TYPE",
          actionData: { fieldId: ageF.id, targetType: "integer" }
        });
      }

      // Rule B: Link age with birth date if not already linked
      birthFields.forEach(birthF => {
        if (ageF.config?.relationTargetFieldId !== birthF.id) {
          issues.push({
            id: `link_age_birth_${ageF.id}_${birthF.id}`,
            fieldId: ageF.id,
            fieldName: ageF.fieldName,
            type: "info",
            title: "偵測到可自動連動的生日與年齡對",
            message: `同時存在生日「${birthF.fieldName}」及年齡「${ageF.fieldName}」。一鍵將兩者建立關聯後，系統將自動比對標準時間「2026-06-02」計算出生足歲！`,
            fixDescription: `一鍵將年齡「${ageF.fieldName}」動態連動至生日「${birthF.fieldName}」`,
            actionType: "SET_AGE_RELATION",
            actionData: { ageFieldId: ageF.id, birthFieldId: birthF.id }
          });
        }
      });
    });

    // Job Seniority & Hire Date
    const seniorFields = fields.filter(f => {
      const lower = f.fieldName.toLowerCase();
      return lower.includes("年資") || lower.includes("資歷") || lower.includes("在職年數") || lower.includes("seniority") || lower.includes("tenure");
    });
    const hireFields = fields.filter(f => {
      const lower = f.fieldName.toLowerCase();
      return f.type === "date" && (lower.includes("入職") || lower.includes("到職") || lower.includes("加入") || lower.includes("註冊") || lower.includes("hire") || lower.includes("join") || lower.includes("start"));
    });

    seniorFields.forEach(senF => {
      if (senF.type !== "integer") {
        issues.push({
          id: `senior_type_mismatch_${senF.id}`,
          fieldId: senF.id,
          fieldName: senF.fieldName,
          type: "warning",
          title: "在職年資型態優化建議",
          message: `「${senF.fieldName}」欄位為年資特徵，目前型態為「${senF.type}」。設為「隨機整數」可啟動參照入職日期進行動態年資核算。`,
          fixDescription: `將連動之年資「${senF.fieldName}」型態設為「隨機整數 (integer)」`,
          actionType: "CONVERT_FIELD_TYPE",
          actionData: { fieldId: senF.id, targetType: "integer" }
        });
      }

      hireFields.forEach(hireF => {
        if (senF.config?.relationTargetFieldId !== hireF.id) {
          issues.push({
            id: `link_senior_hire_${senF.id}_${hireF.id}`,
            fieldId: senF.id,
            fieldName: senF.fieldName,
            type: "info",
            title: "在職與入職日期特徵關聯推薦",
            message: `發現入職「${hireF.fieldName}」與在職年數「${senF.fieldName}」特徵。建立對照可實現精密年資核算。`,
            fixDescription: `將年資「${senF.fieldName}」自動連動參照至「${hireF.fieldName}」`,
            actionType: "SET_AGE_RELATION",
            actionData: { ageFieldId: senF.id, birthFieldId: hireF.id }
          });
        }
      });
    });

    return issues;
  }, [fields]);

  const handleApplyValidationFix = (issue: ValidationIssue) => {
    const { actionType, actionData, fieldId } = issue;
    
    if (actionType === "RESET_RELATION") {
      setFields(prev => prev.map(f => f.id === fieldId ? {
        ...f,
        config: {
          ...f.config,
          relationTargetFieldId: undefined,
          relationType: undefined,
          relationLookupMap: undefined
        }
      } : f));
    } else if (actionType === "CONVERT_FIELD_TYPE" && actionData) {
      const { fieldId: targetFieldId, targetType } = actionData;
      setFields(prev => prev.map(f => {
        if (f.id === targetFieldId) {
          let config = { ...f.config };
          if (targetType === "integer" || targetType === "decimal") {
            config.min = config.min ?? 0;
            config.max = config.max ?? 100;
            if (targetType === "decimal") config.decimals = config.decimals ?? 1;
          } else if (targetType === "date") {
            config.dateMin = config.dateMin ?? "2020-01-01";
            config.dateMax = config.dateMax ?? "2026-06-02";
          }
          return { ...f, type: targetType, config };
        }
        return f;
      }));
    } else if (actionType === "SET_RELATION_TYPE" && actionData) {
      const { fieldId: targetFieldId, relationType } = actionData;
      setFields(prev => prev.map(f => f.id === targetFieldId ? {
        ...f,
        config: { ...f.config, relationType }
      } : f));
    } else if (actionType === "SET_AGE_RELATION" && actionData) {
      const { ageFieldId, birthFieldId } = actionData;
      setFields(prev => prev.map(f => f.id === ageFieldId ? {
        ...f,
        type: "integer",
        config: {
          ...f.config,
          relationTargetFieldId: birthFieldId,
          relationType: "less_than"
        }
      } : f));
    } else if (actionType === "APPLY_DEFAULT_LOOKUP" && actionData) {
      const { fieldId: targetFieldId } = actionData;
      const currentF = fields.find(f => f.id === targetFieldId);
      const targetF = fields.find(f => f.id === currentF?.config.relationTargetFieldId);
      let sampleLookup = "預設:選項A,選項B";
      if (targetF && targetF.config.options) {
        const firstOpt = targetF.config.options.split(/[,，]/)[0]?.trim() || "台北";
        const secondOpt = targetF.config.options.split(/[,，]/)[1]?.trim() || "新北";
        sampleLookup = `${firstOpt}:選項1,選項2;${secondOpt}:選項3,選項4`;
      }
      setFields(prev => prev.map(f => f.id === targetFieldId ? {
        ...f,
        config: {
          ...f.config,
          relationLookupMap: sampleLookup
        }
      } : f));
    }

    setValidationSuccessMsg(`✓ 成功修復「${issue.fieldName}」的「${issue.title}」衝突！`);
    setTimeout(() => setValidationSuccessMsg(null), 3500);
  };

  const handleApplyAllValidationFixes = () => {
    if (validationIssues.length === 0) return;
    
    let currentFields = [...fields];
    validationIssues.forEach(issue => {
      const { actionType, actionData, fieldId } = issue;
      currentFields = currentFields.map(f => {
        if (actionType === "RESET_RELATION" && f.id === fieldId) {
          return {
            ...f,
            config: {
              ...f.config,
              relationTargetFieldId: undefined,
              relationType: undefined,
              relationLookupMap: undefined
            }
          };
        }
        if (actionType === "CONVERT_FIELD_TYPE" && actionData && f.id === actionData.fieldId) {
          const { targetType } = actionData;
          let config = { ...f.config };
          if (targetType === "integer" || targetType === "decimal") {
            config.min = config.min ?? 0;
            config.max = config.max ?? 100;
            if (targetType === "decimal") config.decimals = config.decimals ?? 1;
          } else if (targetType === "date") {
            config.dateMin = config.dateMin ?? "2020-01-01";
            config.dateMax = config.dateMax ?? "2026-06-02";
          }
          return { ...f, type: targetType, config };
        }
        if (actionType === "SET_RELATION_TYPE" && actionData && f.id === actionData.fieldId) {
          return {
            ...f,
            config: { ...f.config, relationType: actionData.relationType }
          };
        }
        if (actionType === "SET_AGE_RELATION" && actionData && f.id === actionData.ageFieldId) {
          return {
            ...f,
            type: "integer",
            config: {
              ...f.config,
              relationTargetFieldId: actionData.birthFieldId,
              relationType: "less_than"
            }
          };
        }
        if (actionType === "APPLY_DEFAULT_LOOKUP" && actionData && f.id === actionData.fieldId) {
          const currentF = currentFields.find(sf => sf.id === actionData.fieldId);
          const targetF = currentFields.find(sf => sf.id === currentF?.config.relationTargetFieldId);
          let sampleLookup = "預設:選項A,選項B";
          if (targetF && targetF.config.options) {
            const firstOpt = targetF.config.options.split(/[,，]/)[0]?.trim() || "台北";
            const secondOpt = targetF.config.options.split(/[,，]/)[1]?.trim() || "新北";
            sampleLookup = `${firstOpt}:選項1,選項2;${secondOpt}:選項3,選項4`;
          }
          return {
            ...f,
            config: {
              ...f.config,
              relationLookupMap: sampleLookup
            }
          };
        }
        return f;
      });
    });

    setFields(currentFields);
    setValidationSuccessMsg(`✓ 成功執行智慧一鍵修復，共智慧除錯補強 ${validationIssues.length} 個潛在欄位對應關係！`);
    setTimeout(() => setValidationSuccessMsg(null), 4000);
  };


  // AI Chat Assistant State
  const [chatPrompt, setChatPrompt] = useState("");
  const [isChatting, setIsChatting] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ sender: "user" | "ai"; text: string; fields?: any[] }[]>([
    {
      sender: "ai",
      text: "您好！我是您的 **AI 數據設計師**。您可以隨意輸入像「*我想做一個大學選課系統的測試，需要欄位*」或是「*幫我加幾個適合電商的統計欄位*」，我會為您智慧建模並將結果套用到目前的欄位結構中。"
    }
  ]);

  // Local Spec Knowledge Base state
  const [memoryFields, setMemoryFields] = useState<Record<string, { type: FieldType; config: FieldConfig; reason: string }>>({});
  const [isDraggingMultiple, setIsDraggingMultiple] = useState<boolean>(false);
  const [batchLearningReport, setBatchLearningReport] = useState<string | null>(null);
  const [memoryQuery, setMemoryQuery] = useState("");
  const [showKbManager, setShowKbManager] = useState<boolean>(false);

  // Synced local specification learning
  const saveFieldToMemory = (fieldName: string, type: FieldType, config: FieldConfig, reason?: string) => {
    if (!fieldName.trim()) return;
    const cleanName = fieldName.trim();
    const updated = {
      ...memoryFields,
      [cleanName]: {
        type,
        config,
        reason: reason || "自訂手動修改規則"
      }
    };
    setMemoryFields(updated);
    try {
      localStorage.setItem("user_fields_memory", JSON.stringify(updated));
    } catch (e) {
      console.warn("Failed to write to localStorage:", e);
    }
  };

  const getMemoryForField = (fieldName: string): { type: FieldType; config: FieldConfig; reason: string } | null => {
    if (!fieldName.trim()) return null;
    const cleanName = fieldName.trim();
    const item = memoryFields[cleanName];
    if (item) {
      return {
        type: item.type,
        config: item.config || {},
        reason: item.reason || "歷史手動設定與規格配置"
      };
    }
    return null;
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, isChatting]);

  // Standard Clock state timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check Backend and API Key Availability
  useEffect(() => {
    const storedKey = localStorage.getItem("user_gemini_api_key") || "";
    if (storedKey.trim()) {
      setAiAvailable(true);
    } else {
      setAiAvailable(false);
    }

    // Load local specification memory
    try {
      const raw = localStorage.getItem("user_fields_memory") || "{}";
      setMemoryFields(JSON.parse(raw));
    } catch (e) {
      console.warn("Failed to load user_fields_memory:", e);
    }

    // Initialize with a preset template on load
    handleApplyTemplate(PRESET_TEMPLATES[0]);
  }, []);

  // Batch Excel CSV learning process
  const handleBatchExcelProcess = async (rawFiles: FileList | File[]) => {
    if (!rawFiles || rawFiles.length === 0) return;
    
    setUploadNotification("正在進行大批量智慧字典規格學習中...");
    let newlyLearned = 0;
    let updatedCount = 0;
    const files = Array.from(rawFiles);
    
    // Create copy of memoryFields
    const updatedMemory = { ...memoryFields };
    const colDetails: { header: string; samples: string[]; fileName: string; sheetName: string }[] = [];
    
    for (const file of files) {
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const bstr = evt.target?.result;
            const workbook = XLSX.read(bstr, { type: "binary" });
            
            workbook.SheetNames.forEach((sheetName) => {
              const worksheet = workbook.Sheets[sheetName];
              const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });
              
              if (jsonData.length > 0) {
                const headers = jsonData[0] || [];
                const dataRows = jsonData.slice(1, 101);
                
                headers.forEach((headerText: any, idx: number) => {
                  const header = String(headerText || "").trim();
                  if (!header) return;
                  
                  const colValues: string[] = [];
                  for (const row of dataRows) {
                    if (row && row[idx] !== undefined && row[idx] !== null) {
                      const valStr = String(row[idx]).trim();
                      if (valStr !== "") {
                        colValues.push(valStr);
                      }
                    }
                  }
                  
                  // Take up to 5 samples for AI, keep unique
                  const uniqueSamples = Array.from(new Set(colValues)).slice(0, 5);
                  colDetails.push({ header, samples: uniqueSamples, fileName: file.name, sheetName });
                  
                  // Compute standard fallback
                  const analyzedSpec = analyzeColumnSpecs(header, colValues);
                  const inferredType = analyzedSpec.type;
                  const inferredReason = `來自批次訓練檔【${file.name} / ${sheetName}】之歷史規格學習（${analyzedSpec.reason}）`;
                  const inferredConfig = analyzedSpec.config;
                  
                  if (updatedMemory[header]) {
                    updatedCount++;
                  } else {
                    newlyLearned++;
                  }
                  
                  updatedMemory[header] = {
                    type: inferredType,
                    config: inferredConfig,
                    reason: inferredReason
                  };
                });
              }
            });
            resolve();
          } catch (err) {
            console.error("Failed to parse training file:", file.name, err);
            resolve();
          }
        };
        reader.readAsBinaryString(file);
      });
    }

    // AI-Assisted High-Fidelity deep learning override
    if (enableAiTrainingInterpret && aiAvailable && colDetails.length > 0) {
      setUploadNotification("正在啟動 AI 協助訓練理解模型 (正在深度分析欄位關係與最適格式)...");
      try {
        const response = await fetch("/api/ai-train-interpret", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-gemini-api-key": userApiKey.trim()
          },
          body: JSON.stringify({
            columns: colDetails.map(c => ({ header: c.header, samples: c.samples }))
          })
        });
        
        const result = await response.json();
        if (result.aiAvailable && Array.isArray(result.results)) {
          let aiNewlyLearned = 0;
          let aiUpdatedCount = 0;
          
          result.results.forEach((item: any) => {
            const found = colDetails.find(c => c.header === item.header);
            const sourceFile = found ? `批次訓練檔【${found.fileName}】` : "訓練檔";
            
            if (memoryFields[item.header]) {
              aiUpdatedCount++;
            } else {
              aiNewlyLearned++;
            }
            
            updatedMemory[item.header] = {
              type: item.type as FieldType,
              config: item.config || {},
              reason: `🤖 AI 腦補與深度理解訓練（${item.reason}）— ${sourceFile}`
            };
          });
          
          setMemoryFields(updatedMemory);
          localStorage.setItem("user_fields_memory", JSON.stringify(updatedMemory));
          
          setBatchLearningReport(`✓ 🤖 規格智慧字典「AI 深度理解訓練」順利完成！已自 ${files.length} 個訓練檔中自動挖掘 ${aiNewlyLearned} 個全新欄位並藉由 AI 深入理解其模糊格式；另對 ${aiUpdatedCount} 個既有欄位進行高密度訓練配置校正！`);
          setTimeout(() => setBatchLearningReport(null), 10000);
          setUploadNotification(null);
          return;
        }
      } catch (err) {
        console.warn("AI 協助規格學習在傳輸中出錯，使用本地解析降級，錯誤資訊：", err);
      }
    }
    
    // Local fallback report if AI is unavailable or fails
    setMemoryFields(updatedMemory);
    try {
      localStorage.setItem("user_fields_memory", JSON.stringify(updatedMemory));
    } catch (e) {
      console.warn("Failed to write memory to storage:", e);
    }
    
    setBatchLearningReport(`✓ 規格智慧字典線上學習完成！已自 ${files.length} 個訓練檔中，自動分析出 ${newlyLearned} 個全新未知欄位，並校正更新 ${updatedCount} 個既有欄位之本地格式。`);
    setTimeout(() => setBatchLearningReport(null), 8000);
    setUploadNotification(null);
  };

  // 2. Schema Management Handlers
  const handleAddNewField = () => {
    const defaultInference = inferLocalFieldType("加新欄位");
    const newField: SchemaField = {
      id: crypto.randomUUID(),
      fieldName: `自訂欄位_${fields.length + 1}`,
      type: "text",
      reason: "無校驗規則，預設短句",
      config: defaultInference.config
    };
    setFields([...fields, newField]);
  };

  const handleDeleteField = (id: string) => {
    setFields(fields.filter((f) => f.id !== id));
  };

  const handleUpdateFieldType = (id: string, newType: FieldType) => {
    setFields(
      fields.map((f) => {
        if (f.id === id) {
          // preserve custom ranges or apply defaults
          let config: FieldConfig = {};
          if (newType === "integer" || newType === "decimal") {
            config = { min: f.config.min ?? 10, max: f.config.max ?? 1000, decimals: f.config.decimals ?? (newType === "decimal" ? 1 : undefined) };
          } else if (newType === "date") {
            config = { dateMin: f.config.dateMin ?? "2020-01-01", dateMax: f.config.dateMax ?? "2026-06-02" };
          } else if (newType === "pattern") {
            config = { pattern: f.config.pattern ?? "TX-####-??" };
          }
          // Persist manual adjustments into local memory immediately
          saveFieldToMemory(f.fieldName, newType, config, "歷史手動設定與調整記憶");
          return { ...f, type: newType, config };
        }
        return f;
      })
    );
  };

  const handleUpdateFieldName = (id: string, newName: string) => {
    setFields(
      fields.map((f) => {
        if (f.id === id) {
          // Re-infer type automatically as user types to provide nice default configs!
          const inference = inferLocalFieldType(newName);
          return { 
            ...f, 
            fieldName: newName,
            reason: inference.reason,
            config: { ...f.config, ...inference.config }
          };
        }
        return f;
      })
    );
  };

  const handleUpdateFieldConfig = (id: string, updatedConfig: FieldConfig) => {
    setFields(
      fields.map((f) => {
        if (f.id === id) {
          // Persist manual advanced constraints configurations immediately
          saveFieldToMemory(f.fieldName, f.type, updatedConfig, "歷史設定與微調進階限制");
          return { ...f, config: { ...f.config, ...updatedConfig } };
        }
        return f;
      })
    );
  };

  // 3. Schema Parsing from inputs
  const handleParseFieldsInput = async () => {
    if (!fieldsInputText.trim()) return;
    setIsAnalyzing(true);
    
    // Split input
    const parsedFields = fieldsInputText
      .split(/[,，\n]/)
      .map((f) => f.trim())
      .filter((f) => f.length > 0);

    // Completely bypassed remote AI analyzing to conserve AI credits, using local regex + history learning memory prioritization
    const localInferred: SchemaField[] = parsedFields.map((fname) => {
      // 1. Check persistent memory database first
      const mem = getMemoryForField(fname);
      if (mem) {
        return {
          id: crypto.randomUUID(),
          fieldName: fname,
          type: mem.type,
          reason: `已尋回先前設定（${mem.reason}）`,
          config: mem.config
        };
      }
      
      // 2. Fall back to local formatting regex rules
      const inference = inferLocalFieldType(fname);
      return {
        id: crypto.randomUUID(),
        fieldName: fname,
        type: inference.type,
        reason: `本地智慧分析：${inference.reason}`,
        config: inference.config
      };
    });
    
    setFields(localInferred);
    
    // Simulate minor delay for polished feel
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 450);
  };

  // Excel / CSV File Interpretation Engine
  const handleExcelFileProcess = (e: any) => {
    let file: File | null = null;
    if (e.target && "files" in e.target) {
      file = e.target.files?.[0] || null;
    } else if (e.dataTransfer) {
      file = e.dataTransfer.files?.[0] || null;
    }
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

        if (jsonData.length > 0) {
          const headers = jsonData[0] || [];
          const dataRows = jsonData.slice(1, 101);

          const parsedFields: SchemaField[] = headers
            .map((headerText: any, index: number) => {
              const header = String(headerText || "").trim();
              if (!header) return null;

              // Collect up to first 100 cell values for this column index
              const colValues: string[] = [];
              for (const row of dataRows) {
                if (row && row[index] !== undefined && row[index] !== null) {
                  const valStr = String(row[index]).trim();
                  if (valStr !== "") {
                    colValues.push(valStr);
                  }
                }
              }

              // Try getting type and config from memory first!
              const mem = getMemoryForField(header);
              let inferredType: FieldType = "text";
              let inferredReason = "";
              let inferredConfig: FieldConfig = {};

              if (mem) {
                inferredType = mem.type;
                inferredReason = `已尋回歷史設定記錄（${mem.reason}）`;
                inferredConfig = mem.config || {};
              } else {
                const analyzedSpec = analyzeColumnSpecs(header, colValues);
                inferredType = analyzedSpec.type;
                inferredReason = analyzedSpec.reason;
                inferredConfig = analyzedSpec.config;
              }

              return {
                id: crypto.randomUUID(),
                fieldName: header,
                type: inferredType,
                reason: inferredReason,
                config: inferredConfig
              };
            })
            .filter((f: any) => f !== null) as SchemaField[];

          if (parsedFields.length > 0) {
            setFields(parsedFields);
            setFieldsInputText(parsedFields.map((f) => f.fieldName).join(", "));
            setUploadNotification(`✓ 成功掃描並解析 Excel 前 100 行資料，智慧提取 ${parsedFields.length} 個高精準度欄位！`);
            setTimeout(() => setUploadNotification(null), 5000);
          } else {
            setUploadNotification("⚠ 檔案中未偵測到任何有效的標題列，請重新確認檔案格式");
            setTimeout(() => setUploadNotification(null), 5000);
          }
        } else {
          setUploadNotification("⚠ Excel 檔案內容為空，自動解析失敗");
          setTimeout(() => setUploadNotification(null), 5000);
        }
      } catch (err: any) {
        console.error("Failed to parse sheet file:", err);
        setUploadNotification("⚠ 檔案解析失敗，請確認檔案格式是否正確且未損壞");
        setTimeout(() => setUploadNotification(null), 5000);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleApplyTemplate = (template: PresetTemplate) => {
    const list: SchemaField[] = template.fields.map((f) => ({
      id: crypto.randomUUID(),
      fieldName: f.fieldName,
      type: f.type,
      config: f.config || {},
      reason: f.reason || "範本預設欄位"
    }));
    setFields(list);
    // set input field content for synchronization
    setFieldsInputText(template.fields.map((f) => f.fieldName).join(", "));
  };

  // 4. Data Generation Launcher (Supports Hybrid AI-Texts & Local Core Algorithms)
  const handleLaunchGeneration = async () => {
    if (fields.length === 0) return;
    setIsGenerating(true);
    setGenerationProgress(10);

    let fetchedAITexts: Record<string, string[]> = {};

    // Check if AI enhancement is checked AND text fields exist AND AI key is available
    const textFields = fields.filter((f) => f.type === "text").map((f) => f.fieldName);
    if (enableAiTextEnhancement && aiAvailable && textFields.length > 0) {
      setGenerationProgress(30);
      try {
        const response = await fetch("/api/generate-ai-text-rows", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-gemini-api-key": userApiKey.trim()
          },
          body: JSON.stringify({ textFields, count: rowCount })
        });
        const result = await response.json();
        if (result.aiAvailable && Array.isArray(result.data)) {
          // Group by fields
          textFields.forEach((tf) => {
            fetchedAITexts[tf] = result.data.map((row: any) => row[tf]).filter(Boolean);
          });
        }
      } catch (err) {
        console.warn("AI 真實情境中文文本拉取暫時失效：", err);
      }
    }

    setGenerationProgress(70);
    // Execute core Taiwanese generation algorithms with correlated rules
    const rows = generateMockData(fields, rowCount, fetchedAITexts);
    setGeneratedRows(rows);
    setPreviewPage(1);
    
    setGenerationProgress(100);
    setTimeout(() => {
      setIsGenerating(false);
      setGenerationProgress(0);
    }, 400);
  };

  // Chat API Integration
  const handleSendChatMessage = async () => {
    if (!chatPrompt.trim()) return;
    const userMsg = chatPrompt;
    setChatPrompt("");

    setChatMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setIsChatting(true);

    if (aiAvailable) {
      try {
        const response = await fetch("/api/ai-chat-suggest", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-gemini-api-key": userApiKey.trim()
          },
          body: JSON.stringify({
            prompt: userMsg,
            currentFields: fields.map((f) => ({ fieldName: f.fieldName, type: f.type }))
          })
        });
        const data = await response.json();
        setIsChatting(false);
        if (data.message) {
          setChatMessages((prev) => [
            ...prev,
            {
              sender: "ai",
              text: data.message,
              fields: data.recommendedFields
            }
          ]);
        }
        return;
      } catch (err) {
        console.error("AI 助理異常:", err);
      }
    }

    // fallback offline chat suggestion
    setIsChatting(false);
    setChatMessages((prev) => [
      ...prev,
      {
        sender: "ai",
        text: "目前處於本機離線模式，暫停即時對話生成。但是您可以直接使用左側的 **[一鍵範本點擊]** 或是輸入自訂欄位來生成專業資料！"
      }
    ]);
  };

  const handleApplyChatRecommendedFields = (chatFields: any[]) => {
    const list: SchemaField[] = chatFields.map((f) => {
      const localInf = inferLocalFieldType(f.fieldName);
      return {
        id: crypto.randomUUID(),
        fieldName: f.fieldName,
        type: (f.type || localInf.type) as FieldType,
        config: f.config || localInf.config,
        reason: f.reason || "AI 助理特製模型推薦"
      };
    });
    setFields(list);
    setFieldsInputText(list.map((f) => f.fieldName).join(", "));
  };

  // 5. Utility Formats Generators (JSON, CSV, SQL)
  const formatCellValue = (val: any, fieldName: string): string => {
    const matchedField = fields.find(f => f.fieldName === fieldName);
    const type = matchedField?.type;
    if (type === "date") {
      const isMon = matchedField?.config?.isMonth ?? /月份|Month|cohort/i.test(fieldName);
      if (isMon && typeof val === "string" && val.length >= 7) {
        return val.slice(0, 7);
      }
    }
    if ((type === "integer" || type === "decimal") && typeof val === "number") {
      const isPercent = matchedField?.config?.isPercent ?? /率$|比率|比例|ROI|年增率|MoM|YoY|達成率|投投率/i.test(fieldName);
      if (isPercent) {
        const pct = val <= 2 ? (val * 100).toFixed(matchedField?.config?.decimals ?? 2) : val.toFixed(matchedField?.config?.decimals ?? 1);
        return `${pct}%`;
      }
      const isCurr = matchedField?.config?.isCurrency ?? /金額|價格|薪水|薪資|總價|單價|消費額|交易金額|費用|房租|費率|進貨價|銷貨價|付款|單價|實付/i.test(fieldName);
      if (isCurr) {
        return val.toLocaleString("zh-TW");
      }
    }
    return String(val);
  };

  const getOutputJSON = (): string => {
    return JSON.stringify(generatedRows, null, 2);
  };

  const getOutputCSV = (): string => {
    if (generatedRows.length === 0) return "";
    const headers = Object.keys(generatedRows[0]);
    const csvRows = [
      headers.join(","), // header row
      ...generatedRows.map((row) =>
        headers
          .map((fieldName) => {
            const val = row[fieldName];
            const displayVal = formatCellValue(val, fieldName);
            const valEscaped = displayVal.replace(/"/g, '""');
            return `"${valEscaped}"`;
          })
          .join(",")
      )
    ];
    return csvRows.join("\n");
  };

  const getOutputSQL = (): string => {
    if (generatedRows.length === 0) return "";
    const headers = Object.keys(generatedRows[0]);
    const tableNameEscaped = tableName.trim().replace(/[^a-zA-Z0-9_]/g, "_") || "mock_data_tw";

    // Build realistic CREATE TABLE schema mapping
    const typeMapping: Record<string, string> = {
      name: "VARCHAR(50)",
      id_card: "VARCHAR(18)",
      address: "VARCHAR(250)",
      phone: "VARCHAR(20)",
      email: "VARCHAR(100)",
      integer: "INT",
      decimal: "DECIMAL(12,2)",
      pattern: "VARCHAR(100)",
      text: "TEXT",
      date: "DATE"
    };

    const headerDefinitions = fields.map((f) => {
      const cleaned = f.fieldName.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, "_");
      const mappedType = typeMapping[f.type] || "VARCHAR(100)";
      return `  \`${cleaned}\` ${mappedType}`;
    }).join(",\n");

    const createTableStmt = `CREATE TABLE IF NOT EXISTS \`${tableNameEscaped}\` (\n  \`id\` INT AUTO_INCREMENT PRIMARY KEY,\n${headerDefinitions}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n\n`;

    const insertStatements = generatedRows.map((row) => {
      const values = headers.map((fieldName) => {
        const val = row[fieldName];
        if (typeof val === "number") {
          return val;
        }
        const valEscaped = String(val).replace(/'/g, "''");
        return `'${valEscaped}'`;
      }).join(", ");
      
      const escapedHeaders = headers.map(h => `\`${h}\``).join(", ");
      return `INSERT INTO \`${tableNameEscaped}\` (${escapedHeaders}) VALUES (${values});`;
    });

    return `${createTableStmt}${insertStatements.join("\n")}`;
  };

  const getActiveCodePreview = (): string => {
    if (activeTab === "csv") return getOutputCSV();
    if (activeTab === "sql") return getOutputSQL();
    return getOutputJSON();
  };

  // 6. Action: Copy to Clipboard
  const handleCopyToClipboard = () => {
    const textRef = getActiveCodePreview();
    if (!textRef) return;
    navigator.clipboard.writeText(textRef).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // 7. Action: Export File Downloader
  const handleDownloadFile = () => {
    const textData = getActiveCodePreview();
    if (!textData) return;
    
    let mimeType = "application/json";
    let filename = `${tableName}.json`;

    if (activeTab === "csv") {
      mimeType = "text/csv;charset=utf-8;";
      filename = `${tableName}.csv`;
    } else if (activeTab === "sql") {
      mimeType = "application/sql;charset=utf-8;";
      filename = `${tableName}.sql`;
    }

    const blob = new Blob([textData], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2000);
  };

  // Keyboard Shortcuts hook
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Generate Data: Ctrl+Enter or Cmd+Enter
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (fields.length > 0 && !isGenerating) {
          handleLaunchGeneration();
        }
      }

      // 2. Export File: Ctrl+E or Cmd+E or Alt+E
      if (((e.ctrlKey || e.metaKey) && (e.key === "e" || e.key === "E")) || (e.altKey && (e.key === "e" || e.key === "E"))) {
        e.preventDefault();
        handleDownloadFile();
      }

      // 3. Add Field: Alt+A or Ctrl+I
      if ((e.altKey && (e.key === "a" || e.key === "A")) || ((e.ctrlKey || e.metaKey) && (e.key === "i" || e.key === "I"))) {
        e.preventDefault();
        handleAddNewField();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    fields,
    isGenerating,
    generatedRows,
    activeTab,
    tableName,
    handleLaunchGeneration,
    handleDownloadFile,
    handleAddNewField
  ]);

  // 8. Pagination helpers
  const itemsPerPage = 8;
  const totalPages = Math.ceil(generatedRows.length / itemsPerPage);
  const paginatedRows = generatedRows.slice(
    (previewPage - 1) * itemsPerPage,
    previewPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased" id="main_container">
      
      {/* Dynamic Upper Accent Header */}
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0" id="app_header">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
              <Database className="h-4.5 w-4.5" />
            </div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-800">
              MockData<span className="text-indigo-600">.tw</span>
            </h1>
            <span className="ml-3 px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded border border-slate-200 uppercase tracking-widest">
              台灣測試資料建模與生成器
            </span>
            
            <div className="hidden md:flex items-center gap-1.5 ml-3 bg-indigo-50 border border-indigo-100 rounded px-2 py-0.5 text-[10px] text-indigo-700 font-medium font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse shrink-0" />
              <span>標準時間：</span>
              <span className="font-mono text-indigo-900">{currentTime.toLocaleString("zh-TW", { hour12: false })}</span>
            </div>
          </div>

          <div className="flex items-center gap-4" id="meta_status">
            {aiAvailable ? (
              <div className="flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-100">
                <Sparkles className="h-3 w-3 animate-pulse text-emerald-500" />
                <span>AI 智慧模式已啟用 (Gemini)</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                <span>本機離線生成模式</span>
              </div>
            )}
            <div className="hidden lg:flex items-center gap-2 select-none">
              <span className="text-[10px] text-slate-400 font-medium">快速鍵:</span>
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 text-[10px] text-slate-600 font-mono" title="主面板產生動作">Ctrl+Enter 產生</kbd>
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 text-[10px] text-slate-600 font-mono" title="細節欄位快速增加">Alt+A 加欄位</kbd>
              <kbd className="px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200 text-[10px] text-slate-600 font-mono" title="下載生成後的檔案">Alt+E 匯出</kbd>
            </div>
            <span className="font-mono text-[10px] text-slate-400 hidden sm:inline">Ver 1.2 • UTC 2026</span>
          </div>
        </div>
      </header>

      {/* Main Grid Content Workspace */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12" id="grid_wrapper">
          
          {/* LEFT PANEL: Modeling, Schema config & Chat Assistant (Cols: 5) */}
          <section className="flex flex-col gap-6 lg:col-span-5" id="left_panel">
            
            {/* Gemini API Key Configuration Section (User Explicit Request) */}
            <div className="rounded-xl border border-indigo-150 bg-indigo-50/20 p-5 shadow-xs" id="module_api_key">
              <div className="mb-3 flex items-center justify-between font-mono">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-indigo-600 p-1.5 text-white">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider block">Gemini API 金鑰設定</h2>
                </div>
                {userApiKey.trim() ? (
                  <span className="text-[9px] text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded font-mono font-bold tracking-wider border border-emerald-250">READY</span>
                ) : (
                  <span className="text-[9px] text-rose-600 bg-rose-550/10 px-2 py-0.5 rounded font-mono font-bold">REQUIRED</span>
                )}
              </div>
              
              <div className="flex flex-col gap-2.5">
                <p className="text-xs text-slate-550 leading-relaxed">
                  本系統重視您的隱私，金鑰將直接儲存於您本地瀏覽器的安全空間，並直接傳遞給伺服器來驅動 API 生成，絕不上傳第三方保管。
                </p>
                
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={userApiKey}
                      onChange={(e) => {
                        const val = e.target.value;
                        setUserApiKey(val);
                        if (!val.trim()) {
                          setAiAvailable(false);
                        }
                      }}
                      placeholder="請貼上您的 Gemini API 金鑰 (AIzaSy...)"
                      className="w-full pl-3 pr-10 py-2 bg-white border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-550 font-mono text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-650 rounded"
                      title={showApiKey ? "隱藏金鑰" : "顯示金鑰"}
                    >
                      {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => {
                      if (userApiKey.trim()) {
                        localStorage.setItem("user_gemini_api_key", userApiKey.trim());
                        setAiAvailable(true);
                        setKeySavedNotification(true);
                        setTimeout(() => setKeySavedNotification(false), 3000);
                      } else {
                        localStorage.removeItem("user_gemini_api_key");
                        setUserApiKey("");
                        setAiAvailable(false);
                      }
                    }}
                    className="rounded bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 text-xs font-semibold shadow-xs transition"
                  >
                    儲存金鑰
                  </button>
                  
                  {userApiKey && (
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem("user_gemini_api_key");
                        setUserApiKey("");
                        setAiAvailable(false);
                      }}
                      className="rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-650 px-3.5 py-2 text-xs font-semibold transition"
                    >
                      清除
                    </button>
                  )}
                </div>

                {keySavedNotification && (
                  <div className="text-[10px] text-emerald-600 flex items-center gap-1 font-semibold">
                    <Check className="h-3 w-3" />
                    <span>✓ 金鑰已成功儲存並重啟 AI 功能組模！</span>
                  </div>
                )}
                
                {!userApiKey.trim() && (
                  <p className="text-[10px] text-indigo-700 bg-indigo-50/60 p-2.5 rounded border border-indigo-100 flex items-start gap-1.5 leading-relaxed">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5 animate-pulse" />
                    <span>每次生成高精度台灣數據或與 AI 數據助理對話前，請先於此欄位貼上您本人的 Gemini API Key。</span>
                  </p>
                )}
              </div>
            </div>

            {/* Module 1: AI Chat Modeling Assistant */}
            <div className="rounded-xl border border-slate-800 bg-slate-900 text-slate-300 p-5 shadow-lg" id="module_ai_chat">
              <div className="mb-3 flex items-center justify-between font-mono">
                <div className="flex items-center gap-2">
                  <div className="rounded bg-indigo-500/20 p-1 text-indigo-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">1. AI 數據智慧設計師</h2>
                </div>
                {aiAvailable ? (
                  <span className="text-[9px] text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-900/40 font-semibold tracking-wider">● CONNECTED</span>
                ) : (
                  <span className="text-[9px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">LOCAL ONLY</span>
                )}
              </div>

              {/* Chat timeline interface */}
              <div className="max-h-[160px] overflow-y-auto pr-1 flex flex-col gap-3 mb-3 text-xs" id="chat_scroll_body">
                {chatMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col gap-1 rounded p-3 ${msg.sender === "user" ? "bg-slate-800 text-white ml-6 border border-slate-700/50 shadow-xs" : "bg-slate-950/40 text-slate-300 mr-6 border border-slate-800/50"}`}
                  >
                    <div className="flex items-center gap-1.5 font-bold mb-0.5 text-[9px] uppercase tracking-wider text-slate-400">
                      {msg.sender === "user" ? <User className="h-3 w-3 text-slate-450" /> : <Sparkles className="h-3 w-3 text-indigo-400" />}
                      <span>{msg.sender === "user" ? "您的提問" : "AI 數據建模專家"}</span>
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>

                    {/* Recommendation Application Trigger */}
                    {msg.fields && msg.fields.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-800/80 flex flex-col gap-1.5">
                        <span className="text-[10px] text-indigo-400 font-medium font-semibold">✨ 推薦建模架構：</span>
                        <div className="flex flex-wrap gap-1">
                          {msg.fields.map((f, fi) => (
                            <span key={fi} className="bg-slate-950 text-slate-300 px-2 py-0.5 rounded text-[10px] border border-slate-800">
                              {f.fieldName} ({f.type})
                            </span>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="mt-1.5 self-start flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-1.5 px-3 rounded text-[10px] transition duration-150"
                          onClick={() => handleApplyChatRecommendedFields(msg.fields!)}
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          <span>套用此 AI 推薦欄位結構</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {isChatting && (
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 bg-slate-950/20 p-2 rounded mr-6 border border-slate-800/20">
                    <RefreshCw className="h-3 w-3 animate-spin text-indigo-400" />
                    <span>AI 正在分析您的應用情境並進行最佳欄位配對...</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <div className="flex gap-1.5 font-sans" id="chat_composer">
                <input
                  type="text"
                  disabled={!aiAvailable || isChatting}
                  className="flex-1 rounded bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
                  placeholder={aiAvailable ? "詢問：例如「我想做點名系統...」" : "請先在左側上方「金鑰設定」貼上並儲存 API Key"}
                  value={chatPrompt}
                  onChange={(e) => setChatPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendChatMessage()}
                />
                <button
                  type="button"
                  disabled={!aiAvailable || isChatting || !chatPrompt.trim()}
                  className="flex items-center justify-center rounded bg-indigo-600 text-white px-3 py-2 hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                  onClick={handleSendChatMessage}
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Excel / CSV Referencing File Upload Section (Request 1) */}
              <div className="mt-4 pt-3 border-t border-slate-800/60 font-sans">
                <span className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider flex items-center gap-1">
                  <FileUp className="h-3.5 w-3.5 text-indigo-400" />
                  上傳參考範本 Excel / CSV 檔案推導欄位
                </span>
                
                <div 
                  className={`border border-dashed rounded-lg p-3 text-center transition ${isDraggingFile ? 'border-indigo-500 bg-indigo-950/20 text-indigo-300' : 'border-slate-801 bg-slate-950/40 hover:border-slate-750 hover:bg-slate-950/70 text-slate-450'}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    handleExcelFileProcess(e);
                  }}
                >
                  <label className="cursor-pointer block">
                    <input 
                      type="file" 
                      accept=".xlsx,.xls,.csv" 
                      className="hidden" 
                      onChange={handleExcelFileProcess} 
                    />
                    <div className="flex flex-col items-center gap-1 justify-center">
                      <div className="rounded bg-indigo-500/10 p-1 text-indigo-400">
                        <Upload className="h-3.5 w-3.5 animate-pulse" />
                      </div>
                      <p className="text-[10px] text-slate-350 leading-relaxed font-semibold">
                        點選或拖曳檔案至此 <span>(.xlsx, .xls, .csv)</span>
                      </p>
                      <p className="text-[9px] text-slate-500 leading-tight">
                        自動讀取首列標題與首行資料列，精緻智慧校對格式屬性！
                      </p>
                    </div>
                  </label>
                </div>

                {uploadNotification && (
                  <div className="mt-2 text-[10px] text-emerald-400 bg-emerald-950/50 border border-emerald-900/40 p-2 rounded flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span>{uploadNotification}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Module 2: Prompt Fast Parser */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" id="module_parser">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-indigo-50 p-1 text-indigo-650">
                    <Sliders className="h-4 w-4" />
                  </div>
                  <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">2. 填寫欄位或智慧分析</h2>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">COMMA / NEWLINE SEPARATED</span>
              </div>

              <textarea
                id="fields_input_raw"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white placeholder:text-slate-400 transition"
                rows={3}
                placeholder="例如: 姓名, 身分證字號, 手機號碼, 年齡, 住址, 訂單序號..."
                value={fieldsInputText}
                onChange={(e) => setFieldsInputText(e.target.value)}
              />

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  id="btn_parser"
                  disabled={isAnalyzing}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded bg-indigo-600 hover:bg-indigo-700 py-2.5 text-xs font-semibold text-white shadow-sm transition-all duration-205 disabled:opacity-50"
                  onClick={handleParseFieldsInput}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isAnalyzing ? "animate-spin" : ""}`} />
                  <span>{isAnalyzing ? "正在偵測在地欄位中..." : "解析欄位並重構"}</span>
                </button>
              </div>

              {/* Preset Template Quick-chips */}
              <div className="mt-4" id="template_quick_select">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">或選用精緻測試情境：</label>
                <div className="grid grid-cols-2 gap-2">
                  {PRESET_TEMPLATES.map((tpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="flex flex-col items-start border border-slate-200 rounded p-2.5 bg-slate-50/50 hover:bg-indigo-50/50 hover:border-indigo-200 transition text-left"
                      onClick={() => handleApplyTemplate(tpl)}
                    >
                      <span className="text-xs font-semibold text-slate-800 mb-0.5">{tpl.name}</span>
                      <span className="text-[10px] text-slate-400 line-clamp-1">{tpl.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Module 3: Interactive Real Estate Schema fields list */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" id="module_schema">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-orange-50 p-1 text-orange-600">
                    <Database className="h-4 w-4" />
                  </div>
                  <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    3. 細節資料型態與範圍配置
                    <span className="ml-1.5 text-indigo-650">({fields.length})</span>
                  </h2>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className={`flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs font-semibold transition ${validationIssues.length > 0 ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100/80" : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"}`}
                    onClick={() => setShowValidationModal(true)}
                    title="掃描關係規則以確認類型、循環依賴、生日/年齡的一致性"
                  >
                    <AlertTriangle className={`h-3.5 w-3.5 ${validationIssues.length > 0 ? "text-amber-500 animate-pulse" : "text-slate-400"}`} />
                    <span>一致性驗證</span>
                    {validationIssues.length > 0 ? (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-white">
                        {validationIssues.length}
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-600 font-bold font-sans">✓ OK</span>
                    )}
                  </button>

                  <button
                    type="button"
                    id="btn_add_field"
                    className="flex items-center gap-1 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition"
                    onClick={handleAddNewField}
                    title="或按快速鍵 Alt+A"
                  >
                    <Plus className="h-3 w-4" />
                    <span>加欄位 (Alt+A)</span>
                  </button>
                </div>
              </div>

              {/* Interactive List view */}
              <div className="max-h-[380px] overflow-y-auto pr-1 flex flex-col gap-2" id="fields_card_container">
                <AnimatePresence initial={false}>
                  {fields.length === 0 ? (
                    <div className="border border-dashed border-slate-200 rounded-lg p-8 text-center text-slate-400 text-xs">
                      <HelpCircle className="h-6 w-6 mx-auto mb-2 opacity-50 text-slate-400" />
                      目前無欄位模型，請於上方欄位快入輸入中新增！
                    </div>
                  ) : (
                    fields.map((field) => (
                      <motion.div
                        key={field.id}
                        layout
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="rounded border border-slate-200 bg-white hover:bg-slate-50/20 p-3 transition shadow-xs"
                      >
                        {/* Title Bar inside field block */}
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            value={field.fieldName}
                            onChange={(e) => handleUpdateFieldName(field.id, e.target.value)}
                            className="w-1/3 min-w-[80px] px-2 py-1 bg-slate-50 border border-slate-200 rounded text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />

                          {/* Data Type Selection */}
                          <select
                            value={field.type}
                            onChange={(e) => handleUpdateFieldType(field.id, e.target.value as FieldType)}
                            className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-750 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          >
                            <option value="name">中文姓名 (name)</option>
                            <option value="id_card">身分證 (id_card)</option>
                            <option value="address">居住地址 (address)</option>
                            <option value="phone">手機電話 (phone)</option>
                            <option value="email">電郵 (email)</option>
                            <option value="integer">隨機整數 (integer)</option>
                            <option value="decimal">隨機小數 (decimal)</option>
                            <option value="pattern">樣板代碼 (pattern)</option>
                            <option value="text">情境短句 (text)</option>
                            <option value="date">日期區間 (date)</option>
                          </select>

                          <div className="flex items-center gap-1.5">
                            {/* Advanced Config toggle button (Always available for click now!) */}
                            <button
                              type="button"
                              title="進階客製化限制與自訂規則设定"
                              onClick={() => setShowConfigId(showConfigId === field.id ? null : field.id)}
                              className={`rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-650 ${showConfigId === field.id ? "bg-indigo-50 text-indigo-650" : ""}`}
                            >
                              <Sliders className="h-3 w-3" />
                            </button>

                            {/* Delete specific column */}
                            <button
                              type="button"
                              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                              onClick={() => handleDeleteField(field.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>

                        {/* Infer reason from Local classifier */}
                        {field.reason && (
                          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400">
                            <Lightbulb className="h-2.5 w-2.5 text-orange-500 opacity-80" />
                            <span className="line-clamp-1">{field.reason}</span>
                          </div>
                        )}

                        {/* Dropdown specific Advanced configuration block */}
                        {showConfigId === field.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            className="mt-2.5 border-t border-slate-100 pt-2 flex flex-col gap-2 bg-slate-50/50 rounded p-2"
                          >
                            {/* Integer / Decimal Ranges */}
                            {(field.type === "integer" || field.type === "decimal") && (
                              <div className="flex flex-col gap-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <label className="block text-[10px] text-slate-500">
                                    最小值 (Min)
                                    <input
                                      type="number"
                                      value={field.config.min ?? 0}
                                      onChange={(e) => handleUpdateFieldConfig(field.id, { ...field.config, min: Number(e.target.value) })}
                                      className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                                    />
                                  </label>
                                  <label className="block text-[10px] text-slate-500">
                                    最大值 (Max)
                                    <input
                                      type="number"
                                      value={field.config.max ?? 100}
                                      onChange={(e) => handleUpdateFieldConfig(field.id, { ...field.config, max: Number(e.target.value) })}
                                      className="mt-0.5 w-full rounded border border-slate-205 bg-white px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                                    />
                                  </label>
                                </div>
                                <div className="mt-0.5 flex items-center gap-1.5">
                                  <input
                                    id={`is_currency_${field.id}`}
                                    type="checkbox"
                                    checked={field.config.isCurrency ?? /金額|價格|薪水|薪資|總價|單價|消費額|交易金額|費用|房租|費率|進貨價|銷貨價|付款|單價|實付/i.test(field.fieldName)}
                                    onChange={(e) => handleUpdateFieldConfig(field.id, { ...field.config, isCurrency: e.target.checked })}
                                    className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <label htmlFor={`is_currency_${field.id}`} className="text-[10px] text-slate-600 font-bold select-none cursor-pointer">
                                    啟用貨幣千分位格式 (例如 12,345)
                                  </label>
                                </div>
                              </div>
                            )}

                            {/* Decimal custom points */}
                            {field.type === "decimal" && (
                              <div className="flex flex-col gap-1.5">
                                <label className="block text-[10px] text-slate-500">
                                  限制小數點下幾位
                                  <input
                                    type="number"
                                    min={0}
                                    max={5}
                                    value={field.config.decimals ?? 1}
                                    onChange={(e) => handleUpdateFieldConfig(field.id, { ...field.config, decimals: Number(e.target.value) })}
                                    className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                                  />
                                </label>
                                <div className="mt-0.5 flex items-center gap-1.5">
                                  <input
                                    id={`is_percent_${field.id}`}
                                    type="checkbox"
                                    checked={field.config.isPercent ?? /率$|比率|比例|ROI|年增率|MoM|YoY|達成率|投投率/i.test(field.fieldName)}
                                    onChange={(e) => handleUpdateFieldConfig(field.id, { ...field.config, isPercent: e.target.checked })}
                                    className="h-3.5 w-3.5 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <label htmlFor={`is_percent_${field.id}`} className="text-[10px] text-slate-600 font-bold select-none cursor-pointer">
                                    啟用百分比格式 (例如 67.50%)
                                  </label>
                                </div>
                              </div>
                            )}

                            {/* Pattern customized template */}
                            {field.type === "pattern" && (
                              <div>
                                <label className="block text-[10px] text-slate-500">
                                  編碼格式配置 (Pattern Template)
                                  <input
                                    type="text"
                                    value={field.config.pattern ?? "TX-####-??"}
                                    onChange={(e) => handleUpdateFieldConfig(field.id, { ...field.config, pattern: e.target.value })}
                                    className="mt-0.5 w-full rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                                  />
                                </label>
                                <span className="text-[9px] text-slate-400 mt-0.5 leading-tight block">
                                  # = 數字 (0-9)，? = 大寫英文 (A-Z)
                                </span>
                              </div>
                            )}

                            {/* Phone format selection */}
                            {field.type === "phone" && (
                              <div>
                                <label className="block text-[10px] text-slate-500 font-semibold">
                                  手機號碼格式 (Phone Format)
                                  <select
                                    value={field.config.phoneFormat ?? "dashed"}
                                    onChange={(e) => handleUpdateFieldConfig(field.id, { ...field.config, phoneFormat: e.target.value as "dashed" | "continuous" })}
                                    className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-505 font-bold"
                                  >
                                    <option value="dashed">含連字號 (0912-345-678)</option>
                                    <option value="continuous">純數字 (0912345678)</option>
                                  </select>
                                </label>
                                <span className="text-[9px] text-slate-400 mt-1 block leading-tight">
                                  確保整張表所產生的手機號碼擁有一致的格式風格
                                </span>
                              </div>
                            )}

                            {/* Calendar selection for date ranges */}
                            {field.type === "date" && (
                              <div className="grid grid-cols-2 gap-2">
                                <label className="block text-[10px] text-slate-500">
                                  起始日期
                                  <input
                                    type="date"
                                    value={field.config.dateMin ?? "2020-01-01"}
                                    onChange={(e) => handleUpdateFieldConfig(field.id, { ...field.config, dateMin: e.target.value })}
                                    className="mt-0.5 w-full rounded border border-slate-205 bg-white px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                                  />
                                </label>
                                <label className="block text-[10px] text-slate-500">
                                  結束日期
                                  <input
                                    type="date"
                                    value={field.config.dateMax ?? "2026-06-02"}
                                    onChange={(e) => handleUpdateFieldConfig(field.id, { ...field.config, dateMax: e.target.value })}
                                    className="mt-0.5 w-full rounded border border-slate-205 bg-white px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                                  />
                                </label>
                              </div>
                            )}

                            {/* General Custom Limit Configuration Rules (Applied to any field types, e.g. text/word counts, categories, and option bounds) */}
                            <div className="border-t border-slate-200 mt-2.5 pt-2.5 flex flex-col gap-2">
                              <span className="text-[10px] font-bold text-indigo-650 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                                <Sparkles className="h-3 w-3 animate-pulse text-indigo-500" /> 自訂生成限制與進階規則
                              </span>
                              
                              <div className="grid grid-cols-2 gap-2">
                                <label className="block text-[10px] text-slate-500 font-semibold">
                                  自訂字數設定
                                  <input
                                    type="number"
                                    min={1}
                                    placeholder="預設無（例：10）"
                                    value={field.config.charLength ?? ""}
                                    onChange={(e) => {
                                      const val = e.target.value ? Number(e.target.value) : undefined;
                                      handleUpdateFieldConfig(field.id, { ...field.config, charLength: val });
                                    }}
                                    className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                                  />
                                </label>

                                <label className="block text-[10px] text-slate-500 font-semibold">
                                  預先限定 AI 類別生成數量
                                  <input
                                    type="number"
                                    min={1}
                                    placeholder="限制不重複特定值數量"
                                    value={field.config.maxCategories ?? ""}
                                    onChange={(e) => {
                                      const val = e.target.value ? Number(e.target.value) : undefined;
                                      handleUpdateFieldConfig(field.id, { ...field.config, maxCategories: val });
                                    }}
                                    className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                                  />
                                </label>
                              </div>

                              <label className="block text-[10px] text-slate-500 font-semibold font-sans">
                                固定自訂類別數值範疇 (以半形或全形逗號隔開)
                                <input
                                  type="text"
                                  placeholder="例：高, 中, 低 或 男, 女 或 台北, 新北, 高雄..."
                                  value={field.config.options ?? ""}
                                  onChange={(e) => {
                                    handleUpdateFieldConfig(field.id, { ...field.config, options: e.target.value });
                                  }}
                                  className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                                />
                              </label>

                              {/* 關聯性欄位連結 (Correlated Fields Linkage) */}
                              <div className="border-t border-slate-150 mt-2.5 pt-2.5 flex flex-col gap-2">
                                <span className="text-[10px] font-bold text-indigo-650 flex items-center gap-1.5 uppercase font-mono tracking-wider">
                                  <Link2 className="h-3 w-3 text-indigo-500 animate-pulse" /> 關聯性欄位連結設定 (Correlated Field)
                                </span>
                                
                                <div className="grid grid-cols-2 gap-2">
                                  <label className="block text-[10px] text-slate-500 font-semibold">
                                    關聯目標欄位 (比對來源)
                                    <select
                                      value={field.config.relationTargetFieldId ?? ""}
                                      onChange={(e) => {
                                        const val = e.target.value || undefined;
                                        handleUpdateFieldConfig(field.id, { 
                                          ...field.config, 
                                          relationTargetFieldId: val,
                                          relationType: val ? (field.config.relationType || "greater_than") : undefined
                                        });
                                      }}
                                      className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                                    >
                                      <option value="">-- 無關聯 (無外部依賴) --</option>
                                      {fields
                                        .filter((f) => f.id !== field.id)
                                        .map((f) => (
                                          <option key={f.id} value={f.id}>
                                            {f.fieldName} ({f.type})
                                          </option>
                                        ))
                                      }
                                    </select>
                                  </label>

                                  <label className="block text-[10px] text-slate-500 font-semibold">
                                    關聯規則類型
                                    <select
                                      disabled={!field.config.relationTargetFieldId}
                                      value={field.config.relationType ?? ""}
                                      onChange={(e) => {
                                        const val = (e.target.value || undefined) as any;
                                        handleUpdateFieldConfig(field.id, { ...field.config, relationType: val });
                                      }}
                                      className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold disabled:bg-slate-50 disabled:text-slate-400"
                                    >
                                      <option value="">-- 依賴設定 --</option>
                                      <option value="greater_than">大於 (Greater Than) - 適用數字、日期</option>
                                      <option value="less_than">小於 (Less Than) - 適用數字、日期</option>
                                      <option value="lookup">條件對照 (Lookup Map) - 適用職稱或分類關聯</option>
                                    </select>
                                  </label>
                                </div>

                                {field.config.relationTargetFieldId && field.config.relationType === "lookup" && (
                                  <label className="block text-[10px] text-slate-500 font-semibold font-sans mt-1">
                                    條件對照對應表組 (格式「鍵值:選項1,選項2;鍵值2:選項3」)
                                    <textarea
                                      rows={2}
                                      value={field.config.relationLookupMap ?? ""}
                                      onChange={(e) => {
                                        handleUpdateFieldConfig(field.id, { ...field.config, relationLookupMap: e.target.value });
                                      }}
                                      placeholder="例：技術部:資深工程師,前端工程師;人資部:招募專員,HR;業務部:業務開發,儲備幹部"
                                      className="mt-1 w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-semibold"
                                    />
                                    <span className="text-[9px] text-slate-400 font-normal leading-tight mt-0.5 block">
                                      當依賴的目標欄位隨機生出「技術部」時，本欄位即只會隨機從「資深工程師、前端工程師」選項集中生成。
                                    </span>
                                  </label>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>

          </section>

          {/* RIGHT PANEL: Launch Pad, Preview, Export Editor (Cols: 7) */}
          <section className="flex flex-col gap-6 lg:col-span-7" id="right_panel">
            
            {/* Control Dashboard Panel */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" id="control_dashboard">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">4. 二推生成控制台</h2>
                  <p className="text-xs text-slate-500">指定測試資料行數、關聯演算，或由 AI 情境覆寫</p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-1">
                    {[5, 20, 50, 150, 300].map((num) => (
                      <button
                        key={num}
                        type="button"
                        className={`rounded px-2.5 py-1 text-xs font-semibold transition ${rowCount === num ? "bg-white text-slate-900 shadow-xs border border-slate-200/50" : "text-slate-500 hover:text-slate-850"}`}
                        onClick={() => setRowCount(num)}
                      >
                        {num}筆
                      </button>
                    ))}
                    <div className="flex items-center ml-1 border-l border-slate-200 pl-1">
                      <input
                        type="number"
                        min={1}
                        max={500}
                        value={rowCount}
                        onChange={(e) => setRowCount(Math.max(1, Math.min(500, Number(e.target.value))))}
                        className="w-12 bg-transparent text-center text-xs font-semibold focus:outline-none text-slate-800 font-mono"
                        title="自訂筆數"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced Local and AI correlation sliders */}
              <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-150 pt-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5 bg-slate-50/50 p-3 rounded border border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <span className="text-xs font-semibold text-slate-800">本地關聯一致性已開啟</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    「姓名與性別」匹配：當欄位包含女性常用字時，自動匹配女性身分證「2」；男性則匹配「1」。
                  </p>
                </div>

                <div className="flex flex-col gap-1.5 bg-slate-50/50 p-3 rounded border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      disabled={!aiAvailable}
                      checked={enableAiTextEnhancement && aiAvailable}
                      onChange={(e) => setEnableAiTextEnhancement(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <span className="text-xs font-semibold text-slate-800">啟用 AI 生成在地實景文字</span>
                  </label>
                  <p className="text-[10px] text-slate-400">
                    針對「情境短句或商品病歷」文字欄位，由雙向模型在生成時輸出極度真實的台灣語句，避免重複。
                  </p>
                </div>
              </div>

              {/* Main Generation Trigger */}
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  id="btn_generate_core"
                  disabled={fields.length === 0 || isGenerating}
                  className="flex-1 flex items-center justify-center gap-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 shadow-sm transition disabled:opacity-50"
                  onClick={handleLaunchGeneration}
                >
                  <RefreshCw className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
                  <span className="text-sm">
                    {isGenerating ? "正在為您關聯推導測試資料庫中..." : "開始產生台灣情境測試數據（Ctrl+Enter）"}
                  </span>
                </button>
              </div>

              {/* Progress Indicator */}
              {isGenerating && (
                <div className="mt-3.5 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <motion.div 
                    className="bg-indigo-600 h-full"
                    initial={{ width: "0%" }}
                    animate={{ width: `${generationProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
            </div>

            {/* Render Output Screen with Tabs */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden" id="render_output_screen">
              
              {/* Tabs Switcher and Controls */}
              <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-3 flex flex-col gap-3 justify-between sm:flex-row sm:items-center">
                
                <div className="flex gap-1 bg-slate-200/50 p-0.5 rounded">
                  <button
                    type="button"
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded transition ${activeTab === "preview" ? "bg-white text-slate-900 shadow-xs border border-slate-200/50" : "text-slate-500 hover:text-slate-850"}`}
                    onClick={() => setActiveTab("preview")}
                  >
                    <FileSpreadsheet className="h-3 w-3 text-slate-500" />
                    <span>預覽數據表格</span>
                  </button>
                  
                  <button
                    type="button"
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded transition ${activeTab === "json" ? "bg-white text-slate-900 shadow-xs border border-slate-200/50" : "text-slate-550 hover:text-slate-850"}`}
                    onClick={() => setActiveTab("json")}
                  >
                    <FileJson className="h-3 w-3 text-slate-500" />
                    <span>JSON</span>
                  </button>

                  <button
                    type="button"
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded transition ${activeTab === "csv" ? "bg-white text-slate-900 shadow-xs border border-slate-200/50" : "text-slate-550 hover:text-slate-850"}`}
                    onClick={() => setActiveTab("csv")}
                  >
                    <AlignLeft className="h-3 w-3 text-slate-500" />
                    <span>CSV</span>
                  </button>

                  <button
                    type="button"
                    className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded transition ${activeTab === "sql" ? "bg-white text-slate-900 shadow-xs border border-slate-200/50" : "text-slate-500 hover:text-slate-850"}`}
                    onClick={() => setActiveTab("sql")}
                  >
                    <Terminal className="h-3 w-3 text-slate-500" />
                    <span>SQL INSERT</span>
                  </button>
                </div>

                {/* Exporter triggers */}
                <div className="flex items-center gap-2">
                  {/* Table Custom Name configuration for SQL tab */}
                  {activeTab === "sql" && (
                    <div className="flex items-center gap-1 border border-slate-200 rounded px-2 py-1 bg-white font-mono">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">TABLE:</span>
                      <input
                        type="text"
                        value={tableName}
                        onChange={(e) => setTableName(e.target.value.toLowerCase())}
                        className="w-24 bg-transparent text-[10px] text-slate-800 focus:outline-none font-bold"
                        placeholder="mock_table"
                      />
                    </div>
                  )}

                  {/* Actions buttons */}
                  {generatedRows.length > 0 && (
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={handleCopyToClipboard}
                        className="flex items-center gap-1 rounded bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 text-xs font-semibold transition"
                      >
                        {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        <span>{copied ? "已複製" : "複製內容"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadFile}
                        className="flex items-center gap-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-semibold transition"
                        title="或按快速鍵 Alt+E"
                      >
                        {downloadSuccess ? <Check className="h-3 w-3 text-emerald-200" /> : <Download className="h-3 w-3" />}
                        <span>下載檔案 (Alt+E)</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Screens Output content switcher */}
              <div className="p-0" id="screen_wrapper">
                {generatedRows.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-6 py-20 text-slate-400 text-center">
                    <Database className="h-10 w-10 text-indigo-400/80 mb-3 animate-pulse" />
                    <p className="text-sm font-semibold text-slate-700">目前暫無測試數據</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-[280px] leading-relaxed">
                      點選上方的「開始產生台灣情境測試數據」即可依據建模規則生成。
                    </p>
                  </div>
                ) : activeTab === "preview" ? (
                  
                  /* Dynamic Preview table views */
                  <div className="flex flex-col" id="panel_table_preview">
                    
                    {/* Responsive Container table */}
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100 text-left text-xs text-slate-600">
                        {/* Table headers */}
                        <thead className="bg-slate-50 text-slate-550 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 font-mono">
                          <tr>
                            <th scope="col" className="px-4 py-3 text-center text-slate-400 font-mono w-10 border-r border-slate-150">#</th>
                            {Object.keys(generatedRows[0]).map((h, i) => (
                              <th key={i} scope="col" className="px-4 py-3 font-semibold text-slate-705 text-slate-700">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        {/* Paginated rows */}
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {paginatedRows.map((row, index) => {
                            const indexStr = (previewPage - 1) * itemsPerPage + index + 1;
                            return (
                              <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                                <td className="whitespace-nowrap px-4 py-2.5 font-mono text-center text-slate-400 text-[10px] bg-slate-50/45 border-r border-slate-150">
                                  {indexStr}
                                </td>
                                {Object.keys(row).map((headerName, colIndex) => {
                                  const cellValue = row[headerName];
                                  
                                  // Find the matched type defined for styling
                                  const matchedField = fields.find(f => f.fieldName === headerName);
                                  const type = matchedField?.type;

                                  // Apply slight high-contrast specific values colors (e.g. Phone with blue background, IDs with golden)
                                  let highlightClass = "text-slate-800";
                                  if (type === "phone") highlightClass = "text-indigo-650 text-indigo-600 font-mono font-medium";
                                  else if (type === "id_card") highlightClass = "text-indigo-950 bg-indigo-50 px-1.5 py-0.5 rounded font-mono border border-indigo-150/40 text-[11px]";
                                  else if (type === "integer" || type === "decimal") highlightClass = "text-slate-900 font-mono text-right";
                                  else if (type === "email") highlightClass = "text-slate-650 text-slate-650 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100/60 font-mono";
                                  else if (type === "name") highlightClass = "text-slate-900 font-medium";
                                  
                                  return (
                                    <td key={colIndex} className="px-4 py-2.5 whitespace-nowrap">
                                      <span className={highlightClass}>{formatCellValue(cellValue, headerName)}</span>
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Table Paginations triggers */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between border-t border-slate-250 border-slate-200 bg-slate-50/40 px-5 py-3 text-xs">
                        <span className="text-slate-500 font-mono text-[11px]">
                          正在顯示第 <span className="font-semibold text-slate-800">{(previewPage - 1) * itemsPerPage + 1}</span> 到 <span className="font-semibold text-slate-800">{Math.min(previewPage * itemsPerPage, generatedRows.length)}</span> 筆（總計 {generatedRows.length} 筆資料）
                        </span>

                        <div className="flex gap-1.5 font-mono">
                          <button
                            type="button"
                            disabled={previewPage === 1}
                            className="rounded border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 cursor-pointer select-none"
                            onClick={() => setPreviewPage(previewPage - 1)}
                          >
                            PREV
                          </button>
                          
                          <div className="flex items-center gap-1 px-2 text-slate-600 font-semibold text-[11px]">
                            <span className="text-slate-950 font-bold">{previewPage}</span> / <span>{totalPages}</span>
                          </div>

                          <button
                            type="button"
                            disabled={previewPage === totalPages}
                            className="rounded border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-40 cursor-pointer select-none"
                            onClick={() => setPreviewPage(previewPage + 1)}
                          >
                            NEXT
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  
                  /* RAW visual files display panel */
                  <div className="bg-slate-950 p-5 border-t border-slate-900 overflow-x-auto font-mono text-xs leading-relaxed relative" id="panel_raw_code">
                    <pre className="text-slate-200 max-h-[360px] overflow-y-auto whitespace-pre-wrap select-all selection:bg-indigo-650">
                      <code>{getActiveCodePreview()}</code>
                    </pre>
                  </div>
                )}
              </div>
            </div>

            {/* Compliance details instructions banner */}
            <div className="rounded-xl border border-indigo-150 bg-indigo-50/35 p-5 flex gap-3 text-xs" id="compliance_notice">
              <Lightbulb className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <p className="font-bold text-indigo-900 mb-1 font-mono uppercase tracking-wider text-[11px]">💡 專業測試建模規範備忘</p>
                <ul className="list-disc list-inside text-indigo-950 space-y-1.5 leading-relaxed">
                  <li><strong>中華民國身分證 (ROC ID)</strong>：自動應用真實內政部 A-Z 編碼規則及身分證除以 10 除法校驗，並能與同一筆資料列中的性別判定維持雙向一致性。</li>
                  <li><strong>台灣真實居住地址</strong>：動態組裝台灣 22 縣市與其特異對應的市轄區，加上常見代表性路名、隨機巷弄、和多變的樓層規格，而非拼湊英數亂碼。</li>
                  <li><strong>格式代碼 (Pattern)</strong>：支援自訂代碼流水。例如 <code>EMP-#####-??</code> 智慧替換「#」為數字、「?」為英文字母。</li>
                </ul>
              </div>
            </div>

            {/* Module 1.5: Local Spec Knowledge Base & Batch Excel Learning Center */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm font-sans" id="module_spec_knowledge_base">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-violet-100 p-1.5 text-violet-750">
                    <Database className="h-4 w-4 text-violet-650" />
                  </div>
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider block">本地規格知識庫 & 批次 Excel 訓練</h2>
                </div>
                <span className="text-[10px] text-violet-700 bg-violet-550/10 px-2 py-0.5 rounded font-mono font-bold border border-violet-100">
                  {Object.keys(memoryFields).length} 筆規格記憶
                </span>
              </div>

              <div className="text-xs text-slate-600 mb-3 leading-relaxed">
                <p>
                  當您在系統設定、上傳 Excel 後，系統會精準永續記憶這些欄位特徵（自動辨識、數值限制範圍、流水編碼、自訂選項等）。
                </p>
                <div className="mt-2 bg-slate-50 border border-slate-150 rounded-lg p-2.5 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse shrink-0" />
                  <span className="text-[10px] text-slate-500">
                    未來只要新開或上傳相同欄位，皆能 <strong>一秒自動對應</strong>，無需繁雜重複微調！
                  </span>
                </div>
              </div>

              {/* Toggle base management */}
              <button
                type="button"
                onClick={() => setShowKbManager(!showKbManager)}
                className="w-full flex items-center justify-between text-xs font-semibold text-slate-750 bg-slate-100 hover:bg-slate-150 border border-slate-200 rounded px-3 py-2 transition shadow-xs"
              >
                <span>{showKbManager ? "收起知識庫管理與批次訓練" : "🛠️ 開啟知識庫與批次 Excel 訓練庫"}</span>
                <Sliders className={`h-3.5 w-3.5 text-slate-500 transition-transform ${showKbManager ? "rotate-90" : ""}`} />
              </button>

              <AnimatePresence>
                {showKbManager && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col gap-3">
                      
                      {/* BATCH DROPZONE FOR TRAINING FROM TONS OF FILES */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block mb-1.5 uppercase tracking-wider flex items-center gap-1">
                          <FileUp className="h-3.5 w-3.5 text-violet-600" />
                          批次拖入大量 Excel / CSV 訓練知識庫
                        </span>
                        
                        <div 
                          className={`border-2 border-dashed rounded-lg p-4 text-center transition ${isDraggingMultiple ? 'border-violet-500 bg-violet-550/5 text-violet-700' : 'border-slate-200 bg-slate-50 hover:border-violet-300 hover:bg-slate-50 text-slate-500'}`}
                          onDragOver={(e) => {
                            e.preventDefault();
                            setIsDraggingMultiple(true);
                          }}
                          onDragLeave={() => setIsDraggingMultiple(false)}
                          onDrop={(e) => {
                            e.preventDefault();
                            setIsDraggingMultiple(false);
                            if (e.dataTransfer?.files) {
                              handleBatchExcelProcess(e.dataTransfer.files);
                            }
                          }}
                        >
                          <label className="cursor-pointer block">
                            <input 
                              type="file" 
                              multiple 
                              accept=".xlsx,.xls,.csv" 
                              className="hidden" 
                              onChange={(e) => {
                                if (e.target.files) {
                                  handleBatchExcelProcess(e.target.files);
                                }
                              }} 
                            />
                            <div className="flex flex-col items-center gap-1.5 justify-center">
                              <div className="rounded bg-violet-650/10 p-1.5 text-violet-600">
                                <Upload className="h-4 w-4 animate-bounce" />
                              </div>
                              <p className="text-xs text-slate-700 leading-none font-bold">
                                點此多選上傳，或把多檔拖曳至此 <span>(XLS, XLSX, CSV)</span>
                              </p>
                              <p className="text-[10px] text-slate-400 leading-tight">
                                同時高速分析各工作表欄位標題與數值特徵，自動收錄至模型知識記憶體！
                              </p>
                            </div>
                          </label>
                        </div>

                        {/* AI ASSISTED TRAINING SETTING */}
                        <div className="mt-2 text-[10px] flex flex-col gap-1.5 border border-violet-150 bg-violet-500/5 p-2.5 rounded-lg">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-violet-950 flex items-center gap-1">
                              <Brain className="h-3.5 w-3.5 text-violet-600 animate-pulse" />
                              AI 協助自動化訓練資料庫與語意理解
                            </span>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={enableAiTrainingInterpret && aiAvailable}
                                disabled={!aiAvailable}
                                onChange={(e) => setEnableAiTrainingInterpret(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-7 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-violet-600"></div>
                              <span className="ml-1.5 font-bold text-slate-800">
                                {aiAvailable ? "已開啟" : "未啟用 (請先配置上方 Gemini 金鑰)"}
                              </span>
                            </label>
                          </div>
                          <p className="text-slate-500 leading-normal">
                            啟用後，系統在讀取 Excel/CSV 時，會將<strong>欄位名稱及前 5 筆樣品真實數值</strong>提交給 AI 腦補分析，智慧學習其百分比格式、貨幣規格、合適數值高低區間及對應格式（例如整數用戶數、小數投投率 2 位百分比等），快速完成資料庫訓練！
                          </p>
                        </div>

                        {batchLearningReport && (
                          <div className="mt-2 text-[10px] text-violet-700 bg-violet-50 border border-violet-150 p-2.5 rounded-lg flex items-start gap-1.5 leading-relaxed shadow-xs">
                            <CheckCircle2 className="h-4 w-4 text-violet-650 shrink-0 mt-0.5" />
                            <span>{batchLearningReport}</span>
                          </div>
                        )}
                      </div>

                      {/* MANAGEMENT LIST AND SEARCH */}
                      <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
                        <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                          已學習規格字典清單管理
                        </span>

                        {/* Search Input */}
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="輸入自訂欄位名稱關鍵字..."
                            value={memoryQuery}
                            onChange={(e) => setMemoryQuery(e.target.value)}
                            className="w-full px-2.5 py-1.5 pl-8 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-violet-500 focus:bg-white text-slate-800"
                          />
                          <Sliders className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-450" />
                          {memoryQuery && (
                            <button
                              type="button"
                              onClick={() => setMemoryQuery("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 text-[10px] font-bold"
                            >
                              清除
                            </button>
                          )}
                        </div>

                        {/* Stored Fields List */}
                        <div className="max-h-[220px] overflow-y-auto pr-1 flex flex-col gap-1.5 text-xs" id="knowledge_stored_list">
                          {Object.keys(memoryFields).length === 0 ? (
                            <p className="text-[10px] text-slate-400 italic py-4 text-center">目前尚無任何已儲存的規格欄位特徵，可藉由批次上傳多檔或在下方手動配置來儲存！</p>
                          ) : (
                            (() => {
                              const filteredKeys = Object.keys(memoryFields).filter(k => 
                                k.toLowerCase().includes(memoryQuery.toLowerCase())
                              );

                              if (filteredKeys.length === 0) {
                                return <p className="text-[10px] text-slate-400 italic py-4 text-center">查無符合此搜尋關鍵字的欄位</p>;
                              }

                              return filteredKeys.map((keyName) => {
                                const entry = memoryFields[keyName];
                                return (
                                  <div key={keyName} className="flex items-center justify-between border border-slate-150 hover:bg-slate-50/50 p-2 rounded gap-2 transition">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-slate-800 text-[11px] truncate">{keyName}</span>
                                        <span className="bg-indigo-50 text-indigo-705 px-1 text-[8px] rounded uppercase font-mono font-bold tracking-wide border border-indigo-100">{entry.type}</span>
                                      </div>
                                      <p className="text-[9px] text-slate-400 truncate leading-tight mt-0.5" title={entry.reason}>
                                        特徵：{entry.reason}
                                      </p>
                                    </div>

                                    {/* Action items inside list entry */}
                                    <div className="flex items-center gap-1.5">
                                      <select
                                        value={entry.type}
                                        onChange={(e) => {
                                          const newType = e.target.value as FieldType;
                                          saveFieldToMemory(keyName, newType, entry.config || {}, "手動變更欄位類別");
                                        }}
                                        className="text-[9px] bg-white border border-slate-200 rounded px-1 py-0.5 font-bold text-slate-700 focus:outline-none"
                                      >
                                        <option value="name">姓名</option>
                                        <option value="id_card">身分證</option>
                                        <option value="address">地址</option>
                                        <option value="phone">手機</option>
                                        <option value="email">信箱</option>
                                        <option value="integer">整數</option>
                                        <option value="decimal">小數</option>
                                        <option value="date">日期</option>
                                        <option value="pattern">流水</option>
                                        <option value="text">中英描述</option>
                                      </select>

                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = { ...memoryFields };
                                          delete updated[keyName];
                                          setMemoryFields(updated);
                                          try {
                                            localStorage.setItem("user_fields_memory", JSON.stringify(updated));
                                          } catch (e) {
                                            console.warn(e);
                                          }
                                        }}
                                        className="p-1 hover:bg-rose-50 hover:text-rose-600 rounded text-slate-400 transition"
                                        title="刪除此欄位記憶"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              });
                            })()
                          )}
                        </div>
                      </div>

                      {/* DICTIONARY ADVANCED TOOLBAR (Backup, Export, Reset) */}
                      <div className="border-t border-slate-150 pt-3 flex gap-1.5 text-[10px] items-center justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(memoryFields, null, 2));
                            const downloadAnchor = document.createElement('a');
                            downloadAnchor.setAttribute("href", dataStr);
                            downloadAnchor.setAttribute("download", "mock_data_tw_dictionary_backup.json");
                            document.body.appendChild(downloadAnchor);
                            downloadAnchor.click();
                            downloadAnchor.remove();
                          }}
                          className="flex items-center gap-1 border border-slate-250 bg-white text-slate-700 px-2.5 py-1.5 rounded hover:bg-slate-50 transition font-semibold shadow-xs"
                          title="將當前所有學習到的規格導出備份"
                        >
                          <Download className="h-3 w-3 text-slate-500" />
                          匯出知識庫 JSON
                        </button>

                        <label className="flex items-center gap-1 border border-slate-250 bg-white text-slate-700 px-2.5 py-1.5 rounded hover:bg-slate-50 transition cursor-pointer font-semibold shadow-xs">
                          <Upload className="h-3 w-3 text-slate-500" />
                          <span>匯入還原</span>
                          <input
                            type="file"
                            accept=".json"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = (evt) => {
                                try {
                                  const parsed = JSON.parse(evt.target?.result as string);
                                  const merged = { ...memoryFields, ...parsed };
                                  setMemoryFields(merged);
                                  localStorage.setItem("user_fields_memory", JSON.stringify(merged));
                                  setBatchLearningReport("✓ 成功匯入並還原規格字典，與既有在地記憶和諧融會！");
                                  setTimeout(() => setBatchLearningReport(null), 5000);
                                } catch (err) {
                                  alert("匯入失敗：請確認 JSON 檔案結構與規格是否相容！");
                                }
                              };
                              reader.readAsText(file);
                            }}
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm("確定要清除所有規格特徵記憶嗎？此動作將一併重設出廠預設值且無法復原。")) {
                              setMemoryFields({});
                              localStorage.removeItem("user_fields_memory");
                              setBatchLearningReport("✓ 字典規格記憶資料庫已順利還原為出廠狀態！");
                              setTimeout(() => setBatchLearningReport(null), 5000);
                            }
                          }}
                          className="flex items-center gap-1 bg-rose-50 border border-rose-100 hover:bg-rose-100/65 text-rose-700 px-2 py-1.5 rounded transition font-semibold"
                        >
                          <Trash2 className="h-3 w-3 text-rose-500" />
                          清除全庫
                        </button>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </section>

        </div>
      </main>

      {/* Consistency Validation Popup Dialog */}
      <AnimatePresence>
        {showValidationModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="relative w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <div className={`rounded-lg p-1.5 ${validationIssues.length > 0 ? "bg-amber-100 text-amber-700" : "bg-emerald-150 text-emerald-700 bg-emerald-50 text-emerald-650"}`}>
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">智慧關聯一致性驗證中心</h3>
                    <p className="text-[10px] text-slate-400 font-medium">掃描所有關聯規則（薪資、日期、年齡），確保依賴參考之類型與邏輯無誤</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowValidationModal(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Success Alert Banner (Optional trigger) */}
              {validationSuccessMsg && (
                <div className="bg-emerald-50 border-y border-emerald-150 text-emerald-800 px-5 py-2.5 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>{validationSuccessMsg}</span>
                </div>
              )}

              {/* Main Scrolling Body */}
              <div className="flex-1 overflow-y-auto p-5 text-slate-650 flex flex-col gap-4">
                
                {/* Stats summary of issues */}
                {validationIssues.length > 0 ? (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/15 p-3.5 text-xs text-amber-900 leading-relaxed flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold flex items-center gap-1">
                        <span>⚠️ 系統自動偵測到 {validationIssues.length} 個潛在的依賴或衝突項目：</span>
                      </p>
                      <p className="text-[11px] text-amber-700 mt-1">
                        包含 {validationIssues.filter(i => i.type === "error").length} 個阻礙生成錯誤、{validationIssues.filter(i => i.type === "warning").length} 個相容警示，以及 {validationIssues.filter(i => i.type === "info").length} 個智慧推薦。這將會直接影響 Mock 模擬資料的產出成效。
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleApplyAllValidationFixes}
                      className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs py-2 px-3.5 rounded-md transition shadow-xs flex items-center gap-1"
                    >
                      <span>⚡ 智慧一鍵修復所有</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                    <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800">🎉 毫無衝突！一致性檢測完美過關</h4>
                    <p className="text-xs text-slate-500 mt-1.5 max-w-md leading-relaxed">
                      經過完整的拓撲與相容度掃描，您所有的關聯規則（包括日期區分、大小限額、LOOKUP 對照表、生日與年齡連動等）均與依賴目標型態完美匹配，此結構將能確保資料生成的高品質。
                    </p>
                  </div>
                )}

                {/* List items */}
                {validationIssues.length > 0 && (
                  <div className="flex flex-col gap-3">
                    {validationIssues.map((issue) => {
                      let badgeClass = "bg-rose-50 border-rose-150 text-rose-700";
                      let badgeText = "衝突錯誤";
                      if (issue.type === "warning") {
                        badgeClass = "bg-warning-50 border-amber-150 bg-amber-50 text-amber-700";
                        badgeText = "相容警示";
                      } else if (issue.type === "info") {
                        badgeClass = "bg-sky-50 border-sky-150 text-sky-700";
                        badgeText = "優化推薦";
                      }

                      return (
                        <div
                          key={issue.id}
                          className="border border-slate-150 rounded-lg p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition duration-150"
                        >
                          <div className="flex-1 flex gap-3">
                            {/* Class icon */}
                            <div className="shrink-0 mt-0.5">
                              {issue.type === "error" ? (
                                <AlertCircle className="h-4 w-4 text-rose-505 text-rose-500" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                              )}
                            </div>

                            <div className="flex flex-col">
                              {/* Title and Badge */}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${badgeClass}`}>
                                  {badgeText}
                                </span>
                                <h4 className="text-xs font-bold text-slate-850 font-sans">{issue.title}</h4>
                                <span className="text-[10px] text-slate-400 font-mono">({issue.fieldName})</span>
                              </div>

                              {/* Message */}
                              <p className="text-[11px] text-slate-600 leading-relaxed mt-1.5 pr-4">
                                {issue.message}
                              </p>
                            </div>
                          </div>

                          {/* Action Fix */}
                          <div className="shrink-0 flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => handleApplyValidationFix(issue)}
                              className="w-full md:w-auto text-xs font-semibold py-1.5 px-3 bg-slate-900 border border-slate-900 hover:bg-slate-800 text-white rounded transition shadow-xs flex items-center gap-1"
                            >
                              <span>{issue.fixDescription}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>

              {/* Close footer footer bar */}
              <div className="border-t border-slate-100 p-4 bg-slate-50/70 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono">系統參照標準時間 2026-06-02 做為精細時間刻度基準</span>
                <button
                  type="button"
                  onClick={() => setShowValidationModal(false)}
                  className="rounded px-4 py-2 bg-slate-200 hover:bg-slate-300 text-xs font-bold text-slate-700 transition"
                >
                  關閉驗證視窗
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer copyright */}
      <footer className="mt-16 border-t border-slate-200 bg-slate-50 py-12 text-center text-xs text-slate-500 font-mono">
        <p className="mb-1 tracking-wide font-medium">MockData.tw © 2026. Designed for Taiwan Enterprise and Developer Scenarios.</p>
        <p className="text-slate-400">專業測試資料建模與生成專家 • 符合所有本國資料保護法測試脫敏防護框架</p>
      </footer>
    </div>
  );
}
