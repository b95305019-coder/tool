/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { SchemaField } from "./types";

// 1. Taiwanese Last Names (百家姓常見組合)
const LAST_NAMES = [
  "陳", "林", "黃", "張", "李", "王", "吳", "劉", "蔡", "楊", 
  "許", "鄭", "謝", "洪", "郭", "邱", "曾", "廖", "賴", "徐", 
  "周", "葉", "莊", "東", "簡", "何", "蕭", "潘", "高", "田"
];

// 2. Taiwanese Male Names
const MALE_NAMES = [
  "冠宇", "家豪", "建宏", "俊傑", "承翰", "書豪", "宗翰", "志豪", 
  "均傑", "偉廷", "宇軒", "子軒", "翔宇", "睿廷", "柏廷", "子捷", 
  "建儒", "德明", "國華", "文傑", "明勳", "志明", "勇志", "宏達", 
  "俊宏", "致遠", "哲維", "冠廷", "彥廷", "柏宇", "奕廷"
];

// 3. Taiwanese Female Names
const FEMALE_NAMES = [
  "雅婷", "怡君", "詩婷", "雅雯", "心怡", "淑芬", "美玲", "宛婷", 
  "鈺婷", "佳穎", "佩蓉", "欣妤", "詩雅", "雨晴", "曉婷", "麗華", 
  "秋香", "春嬌", "雅芳", "惠君", "淑菁", "靜怡", "郁婷", "妤蓁", 
  "宣予", "芝晴", "美惠", "雅琪", "佩君", "欣怡", "婷婷"
];

// 4. Neutral/Alternative Names
const NEUTRAL_NAMES = [
  "安之", "凡羽", "廷恩", "樂熙", "心然", "若一", "允中", "柏文"
];

// 5. Counties and Districts in Taiwan (縣市與行政區對應表)
const TAIWAN_LOCATIONS: Record<string, string[]> = {
  "台北市": ["大安區", "信義區", "中山區", "內湖區", "士林區", "松山區", "萬華區", "文山區", "北投區", "中正區", "大同區", "南港區"],
  "新北市": ["板橋區", "三重區", "中和區", "永和區", "新莊區", "新店區", "土城區", "蘆洲區", "汐止區", "樹林區", "淡水區", "林口區", "三峽區", "五股區", "泰山區"],
  "桃園市": ["桃園區", "中壢區", "八德區", "平鎮區", "龜山區", "蘆竹區", "大溪區", "楊梅區", "龍潭區", "大園區"],
  "台中市": ["西屯區", "北屯區", "南屯區", "東區", "西區", "南區", "北區", "豐原區", "大里區", "太平區", "沙鹿區", "潭子區", "大雅區", "清水區"],
  "台南市": ["永康區", "東區", "安平區", "中西區", "安南區", "北區", "南區", "新營區", "佳里區", "仁德區", "歸仁區"],
  "高雄市": ["三民區", "鳳山區", "左營區", "楠梓區", "前鎮區", "苓雅區", "小港區", "鼓山區", "新興區", "前金區", "鹽埕區", "大寮區", "岡山區"],
  "新竹市": ["東區", "北區", "香山區"],
  "基隆市": ["仁愛區", "信義區", "中正區", "中山區", "安樂區", "七堵區", "暖暖區"],
  "新竹縣": ["竹北市", "竹東鎮", "新埔鎮", "湖口鄉", "新豐鄉"],
  "彰化縣": ["彰化市", "員林市", "和美鎮", "鹿港鎮", "溪湖鎮", "田中鎮"],
  "宜蘭縣": ["宜蘭市", "羅東鎮", "礁溪鄉", "冬山鄉", "五結鄉", "蘇澳鎮"],
  "屏東縣": ["屏東市", "潮州鎮", "恆春鎮", "萬丹鄉", "長治鄉"],
  "花蓮縣": ["花蓮市", "吉安鄉", "新城鄉", "玉里鎮"],
  "台東縣": ["台東市", "卑南鄉", "鹿野鄉"],
  "苗栗縣": ["苗栗市", "竹南鎮", "頭份市", "後龍鎮", "苑裡鎮"],
  "雲林縣": ["斗六市", "虎尾鎮", "西螺鎮", "麥寮鄉", "斗南鎮"],
  "南投縣": ["南投市", "草屯鎮", "埔里鎮", "竹山鎮"],
  "嘉義市": ["東區", "西區"],
  "嘉義縣": ["民雄鄉", "水上鄉", "太保市", "朴子市"]
};

// 6. Commonly Seen Taiwan Road Names
const ROADS = [
  "中山路", "中正路", "復興路", "民生路", "民權路", "民族路", "建國路", "光明路", "成功路", "中華路", 
  "和平路", "光復路", "自強路", "信義路", "忠孝東路", "南京東路", "敦化南路", "八德路", "重慶南路", 
  "羅斯福路", "辛亥路", "和平東路", "復興南路", "民權東路", "市府路", "文心路", "台灣大道", "五權西路", 
  "博愛路", "九如一路", "一心一路", "三多三路", "大隆路", "公益路", "河南路", "光華路", "裕民路"
];

// 7. Standard Taiwan Phone Carrier Identifiers (09開頭之各電信碼)
const PHONE_CARRIERS = ["10", "11", "12", "15", "18", "20", "22", "25", "28", "32", "33", "35", "36", "37", "39", "52", "55", "58", "68", "70", "72", "75", "78", "88"];

// 8. Taiwan Diagnostic Symptoms & Product Names
const PRODUCT_TEMPLATES = [
  "經典手工黑糖珍珠鮮奶", "阿里山手採高山烏龍茶", "極致美白保濕安瓶精華", "無線ANC主動降噪藍牙耳機", 
  "人氣日式胡麻起司沙拉醬", "純棉網眼親膚涼感排汗衫", "頂級中烘焙精品咖啡豆 (1磅)", "時尚抗UV防風速乾連帽外套",
  "經典牛肉起司漢堡套餐 (大薯+中可)", "北歐極簡原木雙人茶几組", "高效防蚊植萃精油隨身噴霧", "多功能智慧防盜感應背包"
];

const SYMPTOM_TEMPLATES = [
  "急性上呼吸道感染 (感冒)", 
  "原發性高血壓追蹤",
  "深部齲齒 (根管治療評估)", 
  "急性異位性皮膚炎發作",
  "飛蚊症與視力模糊追蹤",
  "急性腸胃炎 (腹痛腹瀉)",
  "季節性過敏性鼻炎",
  "睡眠障礙與長期失眠",
  "張力性偏頭痛"
];

const REVIEW_TEMPLATES = [
  "出貨速度極快，包裝非常精美且附贈小禮物，極力推薦！", 
  "產品質感比預期中還要好，皮革柔軟、縫線也非常完美。",
  "音質乾淨清爽，重低音表現滿意，續航力也足夠，會再回購。", 
  "有一點小瑕疵，但與客服反映後立刻協助免費換新，效率極佳。"
];

const CAMPAIGN_TEMPLATES = [
  "雙11感謝祭", 
  "中秋感恩回饋祭", 
  "春季開幕禮", 
  "新會員入會禮", 
  "週年慶大聯歡", 
  "限時閃購補貼", 
  "黑色星期五狂歡", 
  "年終感謝大賞",
  "夏日消暑大集會", 
  "生活節限定促銷", 
  "年中大購慶", 
  "VIP尊榮會員感恩宴"
];

const TEXT_TEMPLATES = [
  ...PRODUCT_TEMPLATES,
  ...REVIEW_TEMPLATES,
  ...SYMPTOM_TEMPLATES,
  ...CAMPAIGN_TEMPLATES
];

// 9. Taiwan ID Card Letter Mapping for Checksum (行政區對應代號值)
const ID_LETTER_LOOKUP: Record<string, number> = {
  A: 10, B: 11, C: 12, D: 13, E: 14, F: 15, G: 16, H: 17, I: 34, J: 18, 
  K: 19, L: 20, M: 21, N: 22, O: 35, P: 23, Q: 24, R: 25, S: 26, T: 27, 
  U: 28, V: 29, W: 32, X: 30, Y: 31, Z: 33
};

/**
 * Generates a valid ROC (Taiwan) National ID Number adhering to official checksum algorithm.
 * G is 1 for Male, 2 for Female. If negative/unset, randomly picked.
 */
function generateTaiwanID(gender?: "男" | "女"): string {
  const letters = Object.keys(ID_LETTER_LOOKUP);
  const randomLetter = letters[Math.floor(Math.random() * letters.length)];
  
  let genderDigit = 1; // Male as default
  if (gender === "女") {
    genderDigit = 2;
  } else if (!gender) {
    genderDigit = Math.random() > 0.5 ? 1 : 2;
  }
  
  // Random 7 digits
  const d: number[] = [];
  for (let i = 0; i < 7; i++) {
    d.push(Math.floor(Math.random() * 10));
  }
  
  // Apply Checksum Algorithm
  // L = Letter numeric code
  const n = ID_LETTER_LOOKUP[randomLetter];
  const l1 = Math.floor(n / 10);
  const l2 = n % 10;
  
  let sum = l1 * 1 + l2 * 9 + genderDigit * 8;
  for (let i = 0; i < 7; i++) {
    sum += d[i] * (7 - i);
  }
  
  const remainder = sum % 10;
  const checkDigit = (10 - remainder) % 10;
  
  return `${randomLetter}${genderDigit}${d.join("")}${checkDigit}`;
}

/**
 * Generate highly realistic Taiwan address
 */
function generateTaiwanAddress(): string {
  const counties = Object.keys(TAIWAN_LOCATIONS);
  const county = counties[Math.floor(Math.random() * counties.length)];
  const districts = TAIWAN_LOCATIONS[county];
  const district = districts[Math.floor(Math.random() * districts.length)];
  const road = ROADS[Math.floor(Math.random() * ROADS.length)];
  
  const hasSection = Math.random() > 0.4;
  const sectionStr = hasSection ? ["一段", "二段", "三段", "四段"][Math.floor(Math.random() * 4)] : "";
  
  const num = Math.floor(Math.random() * 450) + 1;
  const numStr = `${num}號`;
  
  const hasLane = Math.random() > 0.6;
  const laneStr = hasLane ? `${Math.floor(Math.random() * 95) + 2}巷` : "";
  
  const hasAlley = hasLane && Math.random() > 0.5;
  const alleyStr = hasAlley ? `${Math.floor(Math.random() * 20) + 1}弄` : "";
  
  const hasFloor = Math.random() > 0.4;
  const floorTemplates = ["3樓", "5樓之1", "7樓之3", "12樓", "2樓之2", "B棟4樓", "9樓"];
  const floorStr = hasFloor ? ` ${floorTemplates[Math.floor(Math.random() * floorTemplates.length)]}` : "";
  
  return `${county}${district}${road}${sectionStr}${laneStr}${alleyStr}${numStr}${floorStr}`;
}

/**
 * Generate a random date string (YYYY-MM-DD) between dateMin and dateMax
 */
function generateRandomDate(minStr?: string, maxStr?: string): string {
  const minDate = minStr ? new Date(minStr) : new Date("2020-01-01");
  const maxDate = maxStr ? new Date(maxStr) : new Date("2026-06-02");
  
  const minMs = minDate.getTime();
  const maxMs = maxDate.getTime();
  
  const delta = Math.abs(maxMs - minMs);
  const randomOffset = Math.floor(Math.random() * (delta + 1));
  const generatedDate = new Date(Math.min(minMs, maxMs) + randomOffset);
  
  const year = generatedDate.getFullYear();
  const month = String(generatedDate.getMonth() + 1).padStart(2, "0");
  const day = String(generatedDate.getDate()).padStart(2, "0");
  
  return `${year}-${month}-${day}`;
}

/**
 * Replaces '#' with random numbers and '?' with uppercase alphabets
 */
function generatePattern(template: string): string {
  return template.replace(/./g, (char) => {
    if (char === "#") {
      return String(Math.floor(Math.random() * 10));
    }
    if (char === "?") {
      const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      return alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return char;
  });
}

/**
 * Topological Sort to resolve field generation execution order based on dependencies 
 */
export function sortFieldsByDependency(fields: SchemaField[]): SchemaField[] {
  const sorted: SchemaField[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(field: SchemaField) {
    if (visited.has(field.id)) return;
    if (visiting.has(field.id)) {
      // Prevent infinite loops on circular definitions
      return;
    }
    visiting.add(field.id);

    if (field.config?.relationTargetFieldId) {
      const parent = fields.find(f => f.id === field.config.relationTargetFieldId);
      if (parent) {
        visit(parent);
      }
    }

    // Dynamic name-based date calculation dependencies (e.g. age needs birthday field first)
    const lowerName = field.fieldName.toLowerCase();
    if (field.type === "integer") {
      if (lowerName.includes("年齡") || lowerName === "age" || lowerName === "年歲" || lowerName.includes("歲數")) {
        const birthField = fields.find(f => {
          const fn = f.fieldName.toLowerCase();
          return f.type === "date" && (fn.includes("生日") || fn.includes("出生") || fn.includes("birthday") || fn.includes("birth"));
        });
        if (birthField) {
          visit(birthField);
        }
      } else if (lowerName.includes("年資") || lowerName.includes("資歷") || lowerName.includes("在職年數") || lowerName.includes("seniority")) {
        const hireField = fields.find(f => {
          const fn = f.fieldName.toLowerCase();
          return f.type === "date" && (fn.includes("入職") || fn.includes("到職") || fn.includes("加入") || fn.includes("註冊") || fn.includes("hire") || fn.includes("join") || fn.includes("start"));
        });
        if (hireField) {
          visit(hireField);
        }
      }
    }

    visiting.delete(field.id);
    visited.add(field.id);
    sorted.push(field);
  }

  for (const f of fields) {
    visit(f);
  }
  return sorted;
}

interface ProductItem {
  category: string;
  name: string;
  priceMin: number;
  priceMax: number;
}

const PRODUCTS_DATA: ProductItem[] = [
  { category: "精緻飲品", name: "經典手工黑糖珍珠鮮奶", priceMin: 70, priceMax: 85 },
  { category: "精緻飲品", name: "阿里山手採高山烏龍茶", priceMin: 120, priceMax: 150 },
  { category: "精緻飲品", name: "頂級中烘焙精品咖啡豆 (1磅)", priceMin: 450, priceMax: 600 },
  { category: "美妝保養", name: "極致美白保濕安瓶精華", priceMin: 1200, priceMax: 1800 },
  { category: "美妝保養", name: "高效防蚊植萃精油隨身噴霧", priceMin: 250, priceMax: 350 },
  { category: "3C電子", name: "無線ANC主動降噪藍牙耳機", priceMin: 1980, priceMax: 2980 },
  { category: "時尚包款", name: "多功能智慧防盜感應背包", priceMin: 1280, priceMax: 1680 },
  { category: "食品配料", name: "人氣日式胡麻起司沙拉醬", priceMin: 120, priceMax: 160 },
  { category: "鮮食餐飲", name: "經典牛肉起司漢堡套餐 (大薯+中可)", priceMin: 149, priceMax: 199 },
  { category: "潮流服飾", name: "純棉網眼親膚涼感排汗衫", priceMin: 390, priceMax: 590 },
  { category: "潮流服飾", name: "時尚抗UV防風速乾連帽外套", priceMin: 790, priceMax: 1200 },
  { category: "家居生活", name: "北歐極簡原木雙人茶几組", priceMin: 3200, priceMax: 4800 }
];

interface ProductRowContext {
  product: ProductItem;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  cost: number;
  discount: number;
  roi: number;
}

function getProductContext(rowSoFar?: Record<string, any>): ProductRowContext | null {
  if (!rowSoFar) return null;
  if (rowSoFar._prodCtx) return rowSoFar._prodCtx;

  const product = PRODUCTS_DATA[Math.floor(Math.random() * PRODUCTS_DATA.length)];
  const quantity = Math.floor(Math.random() * 8) + 1; // 1 to 8 units
  const unitPrice = Math.floor(Math.random() * (product.priceMax - product.priceMin + 1)) + product.priceMin;
  const totalPrice = quantity * unitPrice;
  const cost = Math.floor(unitPrice * (0.5 + Math.random() * 0.25)); // 50% to 75% cost
  const profit = totalPrice - (cost * quantity);
  const discount = Math.random() > 0.5 ? Math.floor(unitPrice * 0.05 * (Math.floor(Math.random() * 3) + 1)) * quantity : 0;
  const finalTotal = Math.max(0, totalPrice - discount);
  const roi = Math.round((profit / (cost * quantity)) * 100) / 100;

  const ctx: ProductRowContext = {
    product,
    quantity,
    unitPrice,
    totalPrice: finalTotal,
    cost,
    discount,
    roi
  };
  rowSoFar._prodCtx = ctx;
  return ctx;
}

/**
 * Main generator loop
 */
/**
 * Generates an individual random field value compliant with configuration constraints.
 */
function generateIndividualValue(
  field: SchemaField,
  aiTextData: Record<string, string[]> = {},
  rowGender?: "男" | "女",
  rowSoFar?: Record<string, any>,
  allFields?: SchemaField[]
): any {
  const fName = field.fieldName;
  const cleanFieldName = fName.split("_")[0];

  // Aligned Product Category and Sales KPI correlation engine
  const hasProductFields = allFields?.some(f => /商品|產品|品項|品類|類別|名稱/i.test(f.fieldName));
  if (hasProductFields) {
    const ctx = getProductContext(rowSoFar);
    if (ctx) {
      if (/類別|品類|種類|分類/i.test(cleanFieldName) && /產品|商品|品項|商品品類|產品類別/i.test(cleanFieldName)) {
        return ctx.product.category;
      }
      if (/名稱|品項|商品|產品|品目|貨品/i.test(cleanFieldName) && !/類別|品類|種類|分類/i.test(cleanFieldName) && !/數量|單價|金額|成本|折扣|報價/i.test(cleanFieldName)) {
        return ctx.product.name;
      }
      if (/數量|件數|個數|銷量/i.test(cleanFieldName)) {
        return ctx.quantity;
      }
      if (/單價|定價/i.test(cleanFieldName)) {
        return ctx.unitPrice;
      }
      if (/成本/i.test(cleanFieldName)) {
        return ctx.cost;
      }
      if (/折扣|優惠金額|折抵/i.test(cleanFieldName)) {
        return ctx.discount;
      }
      if (/總價|總金額|交易金額|交易總額|金額|消費額|營收|實收金額|銷售總額|銷售額|銷售收入/i.test(cleanFieldName) && !/單價/i.test(cleanFieldName)) {
        return ctx.totalPrice;
      }
      if (/報酬率|投報率|利潤率|ROI|投資報酬/i.test(cleanFieldName)) {
        return ctx.roi;
      }
    }
  }

  // 1. Process custom lookup conditional mappings first if applicable
  if (field.config?.relationTargetFieldId && field.config.relationType === "lookup") {
    const targetField = allFields?.find(f => f.id === field.config.relationTargetFieldId);
    if (targetField) {
      const targetVal = rowSoFar?.[targetField.fieldName];
      if (targetVal !== undefined && targetVal !== null) {
        const mapText = field.config?.relationLookupMap || "";
        const pairs = mapText.split(";").map(p => p.trim()).filter(Boolean);
        const lookupTable: Record<string, string[]> = {};
        for (const pair of pairs) {
          const idx = pair.indexOf(":");
          if (idx !== -1) {
            const key = pair.slice(0, idx).trim();
            const valsStr = pair.slice(idx + 1).trim();
            const vals = valsStr.split(/[,，]/).map(v => v.trim()).filter(Boolean);
            if (key && vals.length > 0) {
              lookupTable[key] = vals;
            }
          }
        }
        const candidates = lookupTable[String(targetVal).trim()];
        if (candidates && candidates.length > 0) {
          return candidates[Math.floor(Math.random() * candidates.length)];
        }
      }
    }
  }

  // 2. Custom fixed categorical options support
  if (field.config?.options) {
    const opts = field.config.options.split(/[,，]/).map(x => x.trim()).filter(Boolean);
    if (opts.length > 0) {
      return opts[Math.floor(Math.random() * opts.length)];
    }
  }

  switch (field.type) {
    case "name": {
      const family = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
      let first = "";
      const activeGender = rowGender || (Math.random() > 0.5 ? "男" : "女");
      if (activeGender === "男") {
        first = MALE_NAMES[Math.floor(Math.random() * MALE_NAMES.length)];
      } else {
        first = FEMALE_NAMES[Math.floor(Math.random() * FEMALE_NAMES.length)];
      }
      return `${family}${first}`;
    }

    case "id_card": {
      return generateTaiwanID(rowGender);
    }

    case "address": {
      return generateTaiwanAddress();
    }

    case "phone": {
      const carrier = PHONE_CARRIERS[Math.floor(Math.random() * PHONE_CARRIERS.length)];
      const rest1 = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
      const rest2 = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
      const format = field.config?.phoneFormat || "dashed";
      if (format === "dashed") {
        return `09${carrier}-${rest1}-${rest2}`;
      } else {
        return `09${carrier}${rest1}${rest2}`;
      }
    }

    case "email": {
      const prefixTemplates = [
        "peter", "chen", "lin", "andy", "sam", "mary", "jack", "kevin", 
        "david", "jason", "lily", "zoe", "amy", "jerry", "leo", "grace"
      ];
      const suffixRandom = Math.floor(Math.random() * 900) + 100;
      const userPrefix = `${prefixTemplates[Math.floor(Math.random() * prefixTemplates.length)]}${suffixRandom}`;
      const domain = [
        "gmail.com", "yahoo.com.tw", "outlook.com", "hinet.net", "mail.ntu.edu.tw", "hotmail.com"
      ][Math.floor(Math.random() * 6)];
      return `${userPrefix}@${domain}`;
    }

    case "integer": {
      const lowerName = field.fieldName.toLowerCase();
      const currentDate = new Date().getFullYear() >= 2026 ? new Date() : new Date("2026-06-02");

      // 1. Check if there is a date field link or name match for "年齡" / "Age"
      let birthField = allFields?.find(f => f.id === field.config?.relationTargetFieldId && f.type === "date");
      if (!birthField && (lowerName.includes("年齡") || lowerName === "age" || lowerName === "年歲" || lowerName.includes("歲數"))) {
        birthField = allFields?.find(f => {
          const fn = f.fieldName.toLowerCase();
          return f.type === "date" && (fn.includes("生日") || fn.includes("出生") || fn.includes("birthday") || fn.includes("birth"));
        });
      }

      if (birthField) {
        const birthVal = rowSoFar?.[birthField.fieldName];
        if (birthVal && typeof birthVal === "string") {
          const birthDate = new Date(birthVal);
          if (!isNaN(birthDate.getTime())) {
            let age = currentDate.getFullYear() - birthDate.getFullYear();
            const m = currentDate.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && currentDate.getDate() < birthDate.getDate())) {
              age--;
            }
            return Math.max(0, age);
          }
        }
      }

      // 2. Check if there is a date field link or name match for "年資" / "資歷" / "在職年數"
      let hireField = allFields?.find(f => f.id === field.config?.relationTargetFieldId && f.type === "date");
      if (!hireField && (lowerName.includes("年資") || lowerName.includes("資歷") || lowerName.includes("在職年數") || lowerName.includes("seniority"))) {
        hireField = allFields?.find(f => {
          const fn = f.fieldName.toLowerCase();
          return f.type === "date" && (fn.includes("入職") || fn.includes("到職") || fn.includes("加入") || fn.includes("註冊") || fn.includes("hire") || fn.includes("join") || fn.includes("start"));
        });
      }

      if (hireField) {
        const hireVal = rowSoFar?.[hireField.fieldName];
        if (hireVal && typeof hireVal === "string") {
          const hireDate = new Date(hireVal);
          if (!isNaN(hireDate.getTime())) {
            let years = currentDate.getFullYear() - hireDate.getFullYear();
            const m = currentDate.getMonth() - hireDate.getMonth();
            if (m < 0 || (m === 0 && currentDate.getDate() < hireDate.getDate())) {
              years--;
            }
            return Math.max(0, years);
          }
        }
      }

      // 3. Or default integer behavior with comparative relation targets
      let min = field.config?.min !== undefined ? field.config.min : 0;
      let max = field.config?.max !== undefined ? field.config.max : 1000;

      // Handle comparative limits
      if (field.config?.relationTargetFieldId && field.config.relationType) {
        const targetField = allFields?.find(f => f.id === field.config.relationTargetFieldId);
        if (targetField) {
          const targetVal = rowSoFar?.[targetField.fieldName];
          if (targetVal !== undefined && targetVal !== null && !isNaN(Number(targetVal))) {
            const numVal = Number(targetVal);
            if (field.config.relationType === "greater_than") {
              min = Math.max(min, Math.floor(numVal) + 1);
            } else if (field.config.relationType === "less_than") {
              max = Math.min(max, Math.ceil(numVal) - 1);
            }
          }
        }
      }

      const range = Math.max(0, max - min);
      return Math.floor(Math.random() * (range + 1)) + min;
    }

    case "decimal": {
      let min = field.config?.min !== undefined ? field.config.min : 0.0;
      let max = field.config?.max !== undefined ? field.config.max : 100.0;
      const decimals = field.config?.decimals !== undefined ? field.config.decimals : 2;

      // Handle comparative limits
      if (field.config?.relationTargetFieldId && field.config.relationType) {
        const targetField = allFields?.find(f => f.id === field.config.relationTargetFieldId);
        if (targetField) {
          const targetVal = rowSoFar?.[targetField.fieldName];
          if (targetVal !== undefined && targetVal !== null && !isNaN(Number(targetVal))) {
            const numVal = Number(targetVal);
            const offset = 1 / Math.pow(10, decimals);
            if (field.config.relationType === "greater_than") {
              min = Math.max(min, numVal + offset);
            } else if (field.config.relationType === "less_than") {
              max = Math.min(max, numVal - offset);
            }
          }
        }
      }

      const factor = Math.pow(10, decimals);
      const range = Math.max(0, max - min);
      const val = Math.random() * range + min;
      return Math.round(val * factor) / factor;
    }

    case "pattern": {
      const template = field.config?.pattern || "TX-####-??";
      return generatePattern(template);
    }

    case "text": {
      let textVal = "";
      const aiPhrases = aiTextData[field.fieldName];
      if (aiPhrases && aiPhrases.length > 0) {
        textVal = aiPhrases[Math.floor(Math.random() * aiPhrases.length)];
      } else {
        const fName = field.fieldName;
        if (fName.includes("使用分區") || fName.includes("都市")) {
          textVal = ["特定農業區", "一般農業區", "山坡地保育區", "森林區", "住宅區", "商業區", "工業區", "特定專用區"][Math.floor(Math.random() * 8)];
        } else if (fName.includes("編定") || fName.includes("編組")) {
          textVal = ["甲種建築用地", "乙種建築用地", "丙種建築用地", "丁種建築用地", "農牧用地", "林業用地", "養殖用地", "交通用地"][Math.floor(Math.random() * 8)];
        } else if (fName.includes("用途") || fName.includes("主要用途")) {
          textVal = ["住家用", "商業用", "住商用", "辦公室", "國民住宅", "工業用", "見使用執照", "停車空間"][Math.floor(Math.random() * 8)];
        } else if (fName.includes("建材") || fName.includes("主要建材")) {
          textVal = ["鋼筋混凝土造", "鋼骨混凝土造", "加強磚造", "見其他登記事項", "磚造", "木造"][Math.floor(Math.random() * 6)];
        } else if (fName.includes("樓層") || fName.includes("移轉") || fName.includes("層")) {
          textVal = ["一層", "二層", "三層", "四層", "五層", "六層", "頂層", "全", "地下室"][Math.floor(Math.random() * 9)];
        } else if (fName.includes("筆棟數")) {
          textVal = `土地${Math.floor(Math.random()*3)+1}建物${Math.floor(Math.random()*2)+1}車位${Math.floor(Math.random()*2)}`;
        } else if (fName.includes("類別") || fName.includes("車位")) {
          textVal = ["坡道平面", "坡道機械", "升降平面", "升降機械", "塔式車位"][Math.floor(Math.random() * 5)];
        } else if (fName.includes("標的")) {
          textVal = ["房地(土地+建物)", "房地(土地+建物)+車位", "土地", "建物", "車位"][Math.floor(Math.random() * 5)];
        } else if (fName.includes("型態") || fName.includes("建物型態")) {
          textVal = ["住宅大樓(11層含以上有電梯)", "公寓(5樓含以下無電梯)", "華廈(10層含以下有電梯)", "透天厝", "店面(店鋪)", "辦公商業大樓", "套房(1房1廳1衛)", "其他"][Math.floor(Math.random() * 8)];
        } else if (fName.includes("診斷") || fName.includes("症狀") || fName.includes("病名")) {
          textVal = SYMPTOM_TEMPLATES[Math.floor(Math.random() * SYMPTOM_TEMPLATES.length)];
        } else if (fName.includes("預約") || fName.includes("看診") || fName.includes("科別")) {
          textVal = ["牙醫科", "一般內科", "小兒專科", "眼科門診", "皮膚外科", "心臟內科"][Math.floor(Math.random() * 6)];
        } else if (fName.includes("活動") || fName.includes("Campaign") || fName.includes("促銷")) {
          textVal = CAMPAIGN_TEMPLATES[Math.floor(Math.random() * CAMPAIGN_TEMPLATES.length)];
        } else if (fName.includes("商品") || fName.includes("品項") || fName.includes("藥品") || fName.includes("產品") || fName.includes("商品名稱") || fName.includes("品目") || fName.includes("貨品")) {
          textVal = PRODUCT_TEMPLATES[Math.floor(Math.random() * PRODUCT_TEMPLATES.length)];
        } else if (fName.includes("備註") || fName.includes("留言") || fName.includes("評論") || fName.includes("評價") || fName.includes("反饋")) {
          textVal = REVIEW_TEMPLATES[Math.floor(Math.random() * REVIEW_TEMPLATES.length)];
        } else {
          textVal = TEXT_TEMPLATES[Math.floor(Math.random() * TEXT_TEMPLATES.length)];
        }
      }

      // Restrict by custom character limit if specified
      if (field.config?.charLength !== undefined && field.config.charLength > 0) {
        const len = field.config.charLength;
        if (textVal.length > len) {
          textVal = textVal.slice(0, len);
        } else {
          // If too short, repeat or pad it to reach target word length
          while (textVal.length < len) {
            textVal += " " + textVal;
          }
          textVal = textVal.slice(0, len);
        }
      }
      return textVal;
    }

    case "date": {
      let dMin = field.config?.dateMin;
      let dMax = field.config?.dateMax;

      if (field.config?.relationTargetFieldId && field.config.relationType) {
        const targetField = allFields?.find(f => f.id === field.config.relationTargetFieldId);
        if (targetField) {
          const targetVal = rowSoFar?.[targetField.fieldName];
          if (targetVal && typeof targetVal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(targetVal)) {
            if (field.config.relationType === "greater_than") {
              dMin = targetVal;
            } else if (field.config.relationType === "less_than") {
              dMax = targetVal;
            }
          }
        }
      }

      const randomDate = generateRandomDate(dMin, dMax);
      const isMon = field.config?.isMonth ?? /月份|Month|cohort/i.test(field.fieldName);
      if (isMon && randomDate.length >= 7) {
        return randomDate.slice(0, 7);
      }
      return randomDate;
    }

    default:
      return "";
  }
}

/**
 * Main generator loop
 */
export function generateMockData(
  fields: SchemaField[],
  count: number,
  aiTextData: Record<string, string[]> = {}
): Record<string, any>[] {
  const rows: Record<string, any>[] = [];

  // Pre-seed restricted category pools for columns that specify maxCategories limit
  const restrictedPools: Record<string, any[]> = {};
  for (const field of fields) {
    if (field.config?.maxCategories !== undefined && field.config.maxCategories > 0) {
      const slots = field.config.maxCategories;
      const pool: any[] = [];
      for (let j = 0; j < slots; j++) {
        pool.push(generateIndividualValue(field, aiTextData, Math.random() > 0.5 ? "男" : "女", {}, fields));
      }
      restrictedPools[field.fieldName] = pool;
    }
  }

  // Sort fields block to guarantee topological execution order
  const sortedFieldsForGen = sortFieldsByDependency(fields);

  for (let i = 0; i < count; i++) {
    const row: Record<string, any> = {};

    // First alignment pass for sex/gender 
    let rowGender: "男" | "女" | undefined = undefined;
    const genderField = fields.find((f) => 
      f.fieldName.includes("性別") || 
      f.fieldName.toLowerCase() === "gender" || 
      f.fieldName.toLowerCase() === "sex"
    );

    if (genderField) {
      // If the gender column itself has restricted categories, follow that!
      if (restrictedPools[genderField.fieldName]) {
        const pool = restrictedPools[genderField.fieldName];
        const val = pool[Math.floor(Math.random() * pool.length)];
        rowGender = val === "女" ? "女" : "男";
        row[genderField.fieldName] = val;
      } else {
        const coin = Math.random() > 0.5;
        rowGender = coin ? "男" : "女";
        row[genderField.fieldName] = rowGender;
      }
    }

    // Generate fields in topological sorted order
    for (const field of sortedFieldsForGen) {
      const key = field.fieldName;
      
      // If we already populated gender, skip doing it again
      if (genderField && field.fieldName === genderField.fieldName) {
        continue;
      }

      // If a pool exists AND it is NOT a dynamic relation-dependent field, use the pool
      if (restrictedPools[key] && !field.config?.relationTargetFieldId) {
        const pool = restrictedPools[key];
        row[key] = pool[Math.floor(Math.random() * pool.length)];
      } else {
        row[key] = generateIndividualValue(field, aiTextData, rowGender, row, fields);
      }
    }
    
    delete row._prodCtx;
    rows.push(row);
  }

  return rows;
}
