/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type FieldType =
  | 'name'
  | 'id_card'
  | 'address'
  | 'phone'
  | 'email'
  | 'integer'
  | 'decimal'
  | 'pattern'
  | 'text'
  | 'date';

export interface FieldConfig {
  min?: number;
  max?: number;
  decimals?: number;
  pattern?: string; // Rules for pattern, e.g. "ORD-####-??"
  dateMin?: string; // Standard HTML format: "YYYY-MM-DD"
  dateMax?: string; // Standard HTML format: "YYYY-MM-DD"
  charLength?: number; // Target length or limit for text field (e.g. 5)
  options?: string; // Fixed list of values, e.g. "A,B,C" or "高,中,低"
  maxCategories?: number; // Limit on the number of unique auto-generated category values (e.g. 3)
  relationTargetFieldId?: string; // Target field UUID for dependency
  relationType?: 'greater_than' | 'less_than' | 'lookup'; // Types of relation dependency rules
  relationLookupMap?: string; // Formatted conditional entries, e.g., "技術部:資深工程師,專案開發者;人資部:招募專員,教育訓練師"
  phoneFormat?: 'dashed' | 'continuous'; // Phone formatting, "0912-345-678" vs "0912345678"
  isCurrency?: boolean; // Whether to format with thousand separators, e.g., 12,345
  isPercent?: boolean; // Whether to format as percentage, e.g. 67.5%
  isMonth?: boolean; // Whether to output as YYYY-MM only
}

export interface SchemaField {
  id: string;
  fieldName: string;
  type: FieldType;
  reason?: string; // AI generated reasons
  config: FieldConfig;
}

export interface SampleFieldSpec {
  fieldName: string;
  type: FieldType;
  config: FieldConfig;
  reason: string;
}

export interface TrainingSessionItem {
  id: string;
  fileName: string;
  uploadTime: string;
  fields: SampleFieldSpec[];
}

export interface PresetTemplate {
  name: string;
  description: string;
  fields: {
    fieldName: string;
    type: FieldType;
    config?: FieldConfig;
    reason?: string;
  }[];
}

export const PRESET_TEMPLATES: PresetTemplate[] = [
  {
    name: "員工基本資料表",
    description: "適用於人資與內部系統測試，包含身分證字號雙向性別比對。",
    fields: [
      { fieldName: "員工姓名", type: "name", reason: "台灣真實姓名組合" },
      { fieldName: "性別", type: "text", reason: "預設性別比對 (男 / 女)" },
      { fieldName: "身分證字號", type: "id_card", reason: "符合內政部校驗公式，符合性別規則" },
      { fieldName: "手機號碼", type: "phone", reason: "標準「09」開頭台灣手機" },
      { fieldName: "戶籍地址", type: "address", reason: "包含真實台灣 22 縣市與路段" },
      { fieldName: "聯絡信箱", type: "email", reason: "真實格式電子郵件" },
      { fieldName: "入職日期", type: "date", config: { dateMin: "2015-01-01", dateMax: "2026-06-02" }, reason: "預設日期區間" },
      { fieldName: "員工編號", type: "pattern", config: { pattern: "EMP-#####" }, reason: "混合格式編碼" }
    ]
  },
  {
    name: "電商訂單明細",
    description: "包含流水編號、金額小數、真實路名地址及聯絡手機。",
    fields: [
      { fieldName: "訂單編號", type: "pattern", config: { pattern: "ORD-2026-####-??" }, reason: "隨機英文與數字組成的訂單號" },
      { fieldName: "收件人姓名", type: "name", reason: "台灣常見人名姓名" },
      { fieldName: "聯絡電話", type: "phone", reason: "行動電話格式" },
      { fieldName: "配送地址", type: "address", reason: "宅配真實地址，含樓層巷弄" },
      { fieldName: "購買商品", type: "text", reason: "台灣熱門零售與餐飲商標名稱" },
      { fieldName: "交易金額", type: "integer", config: { min: 100, max: 25000, isCurrency: true }, reason: "合理的商品價格區段" },
      { fieldName: "訂單日期", type: "date", config: { dateMin: "2026-01-01", dateMax: "2026-06-02" }, reason: "近半年訂單時間" }
    ]
  },
  {
    name: "診所電子病歷系統",
    description: "醫療情境診斷測試，包含患者年齡與台灣病歷號碼。",
    fields: [
      { fieldName: "病歷編號", type: "pattern", config: { pattern: "MED-#####" }, reason: "醫院專用流水編碼" },
      { fieldName: "患者姓名", type: "name", reason: "台灣本地人名" },
      { fieldName: "患者性別", type: "text", reason: "性別對應" },
      { fieldName: "年齡", type: "integer", config: { min: 1, max: 95 }, reason: "涵蓋幼兒到高齡患者年齡" },
      { fieldName: "預約科別", type: "text", reason: "臨床門診名稱，包含牙科、眼科、內科" },
      { fieldName: "主要診斷症狀", type: "text", reason: "病症短評描述" },
      { fieldName: "看診日期", type: "date", config: { dateMin: "2026-05-01", dateMax: "2026-06-02" }, reason: "近期就診時間" }
    ]
  },
  {
    name: "點數會員管理與分級",
    description: "社群與網站常見會員、累積點數、以及系統註冊日期。",
    fields: [
      { fieldName: "會員代碼", type: "pattern", config: { pattern: "VIP-######" }, reason: "VIP 等級專屬編碼" },
      { fieldName: "姓名", type: "name", reason: "本地隨機人名" },
      { fieldName: "累計點數", type: "integer", config: { min: 0, max: 15000 }, reason: "會員紅利點數" },
      { fieldName: "信用評分", type: "decimal", config: { min: 1.0, max: 5.0, decimals: 1 }, reason: "一到五顆星小數評分" },
      { fieldName: "註冊信箱", type: "email", reason: "個人電子郵件" },
      { fieldName: "註冊日期", type: "date", config: { dateMin: "2020-01-01", dateMax: "2026-06-02" }, reason: "近五年註冊統計時間" }
    ]
  }
];
