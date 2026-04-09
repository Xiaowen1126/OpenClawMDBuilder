const FILE_ORDER = ["SOUL.md", "AGENTS.md", "TOOLS.md", "MEMORY.md", "IDENTITY.md"];
const CORE_TOOLS = ["shell", "ssh", "udp"];

const UI = {
  title: "OpenClaw Preset Builder (OpenClaw \u9884\u8bbe\u6784\u5efa\u5668)",
  subtitle: "Compile human intent into OpenClaw workspace configs (\u5c06\u4eba\u7c7b\u610f\u56fe\u7f16\u8bd1\u4e3a OpenClaw \u5de5\u4f5c\u533a\u914d\u7f6e)",
  import: "Import MD/ZIP/JSON (\u5bfc\u5165 MD/ZIP/JSON)",
  exportJson: "Export JSON (\u5bfc\u51fa JSON)",
  exportZip: "Export Workspace ZIP (\u5bfc\u51fa Workspace ZIP)",
  presetCategory: "Preset Category (\u9884\u8bbe\u5927\u7c7b)",
  presetType: "Preset Type (\u7ec6\u5206\u7c7b\u578b)",
  applyPreset: "Apply Preset (\u5e94\u7528\u6a21\u677f)",
  source: "View Source (\u67e5\u770b\u6765\u6e90)",
  ready: "Ready. Loaded {n} presets. (\u5c31\u7eea\uff0c\u5df2\u52a0\u8f7d {n} \u4e2a\u6a21\u677f)",
  catalogFailed: "Failed to load preset catalog. (\u6a21\u677f\u5e93\u52a0\u8f7d\u5931\u8d25)",
  zipDone: "ZIP exported. (ZIP \u5df2\u5bfc\u51fa)",
  jsonDone: "JSON exported. (JSON \u5df2\u5bfc\u51fa)",
  jsonImported: "JSON imported. (JSON \u5df2\u5bfc\u5165)",
  mdImported: "Imported: {names} (\u5df2\u5bfc\u5165: {names})",
  mdNotFound: "No recognizable MD file found. (\u672a\u68c0\u6d4b\u5230\u53ef\u8bc6\u522b MD \u6587\u4ef6)",
  presetApplied: "Preset applied: {name} (\u5df2\u5e94\u7528\u6a21\u677f: {name})",
  noMatch: "No matching options (\u65e0\u5339\u914d\u9879)",
  none: "(none) (\u6682\u65e0)",
};

const DEFAULT_POOL = {
  personality: ["Calm", "Engineer", "Patient", "Direct"],
  tones: ["Concise", "Professional", "Friendly", "Rigorous"],
  skills: ["linux", "network", "python", "docker"],
  rules: ["Actionable solutions first", "Provide code examples", "Step-by-step explanation", "Call out risks when needed"],
  toolSuggestions: ["Web research", "Documentation lookup"],
};

const SKILL_LABEL_MAP = {
  linux: "Linux system management",
  network: "Network diagnostics",
  python: "Python scripting",
  docker: "Container operations",
};

const REVERSE_SKILL_LABEL_MAP = Object.fromEntries(Object.entries(SKILL_LABEL_MAP).map(([k, v]) => [v.toLowerCase(), k]));
const REVERSE_RULE_LABEL_MAP = Object.fromEntries(Object.entries({
  "Actionable solutions first": "Always give actionable solutions",
  "Provide code examples": "Provide code examples",
  "Step-by-step explanation": "Prefer step-by-step explanation",
  "Call out risks when needed": "Call out risks when needed",
}).map(([k, v]) => [v.toLowerCase(), k]));

const state = {
  activeTab: "SOUL.md",
  pool: { ...DEFAULT_POOL },
  extra: { personality: [], skills: [], rules: [], toolSuggest: [] },
  catalog: { categories: [], map: {} },
  workspaceFiles: [],
  workspaceDocs: {},
  backupPromptedForEdit: false,
};

const n = {
  tone: id("toneSelect"), humor: id("humorInput"), strict: id("strictInput"),
  customPersonality: id("customPersonalityInput"), soulExtra: id("soulExtraInput"),
  customSkills: id("customSkillsInput"), customRules: id("customRulesInput"), customTools: id("customToolsInput"),
  name: id("identityName"), role: id("identityRole"), desc: id("identityDesc"),
  personality: id("personalityGroup"), personalityExtra: id("personalityExtraGroup"), personalitySearch: id("personalityExtraSearch"), personalitySelected: id("personalitySelected"),
  skills: id("skillsGroup"), skillsExtra: id("skillsExtraGroup"), skillsSearch: id("skillsExtraSearch"), skillsSelected: id("skillsSelected"),
  rules: id("rulesGroup"), rulesExtra: id("rulesExtraGroup"), rulesSearch: id("rulesExtraSearch"), rulesSelected: id("rulesSelected"),
  toolCore: id("toolCoreGroup"), toolSuggest: id("toolSuggestGroup"), toolSuggestExtra: id("toolSuggestExtraGroup"), toolSuggestSearch: id("toolSuggestExtraSearch"), toolSuggestSelected: id("toolSuggestSelected"),
  tab: id("tabGroup"), preview: id("previewOutput"), status: id("statusText"),
  testPromptList: id("testPromptList"), copyAllPromptsBtn: id("copyAllPromptsBtn"),
  category: id("presetCategorySelect"), preset: id("presetSelect"), presetDesc: id("presetDesc"), presetSource: id("presetSourceLink"),
  applyPreset: id("applyPresetBtn"), exportZip: id("exportZipBtn"), exportJson: id("exportJsonBtn"), importBtn: id("importBtn"), importFile: id("importFileInput"),
  backupNowBtn: id("backupNowBtn"), backupVersionSelect: id("backupVersionSelect"), refreshBackupsBtn: id("refreshBackupsBtn"), restoreBackupBtn: id("restoreBackupBtn"), restartGatewayBtn: id("restartGatewayBtn"),
  backupNameInput: id("backupNameInput"),
  quickEditor: id("quickEditor"), quickEditorFileName: id("quickEditorFileName"), quickSaveBtn: id("quickSaveBtn"),
  manualEditor: id("manualEditor"), manualSaveBtn: id("manualSaveBtn"),
  confirmModal: id("confirmModal"), confirmMessage: id("confirmMessage"), confirmOkBtn: id("confirmOkBtn"), confirmCancelBtn: id("confirmCancelBtn"),
  title: id("titleText"), subtitle: id("subtitleText"), categoryLabel: id("presetCategoryLabel"), presetLabel: id("presetLabel"),
};

function id(x) { return document.getElementById(x); }
function uniq(a) { return [...new Set((a || []).map((x) => String(x).trim()).filter(Boolean))]; }
function lines(t) { return uniq((t || "").split(/\r?\n/)); }
function tags(t) { return uniq((t || "").split(/[,\r\n]+/)); }
function checked(name) { return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((x) => x.value); }
function knownSet(name) { return new Set([...document.querySelectorAll(`input[name="${name}"]`)].map((x) => x.value)); }
function t(key, vars = {}) {
  let s = UI[key] || key;
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
function normalizeEn(v) { return String(v || "").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").trim(); }
function hasZh(v) { return /[\u4e00-\u9fff]/.test(String(v || "")); }
const TOKEN_ZH = {
  calm: "\u51b7\u9759", engineer: "\u5de5\u7a0b\u5e08", patient: "\u8010\u5fc3", direct: "\u76f4\u63a5",
  concise: "\u7b80\u6d01", professional: "\u4e13\u4e1a", friendly: "\u53cb\u597d", rigorous: "\u4e25\u8c28",
  linux: "Linux \u8fd0\u7ef4", network: "\u7f51\u7edc\u8bca\u65ad", python: "Python \u811a\u672c", docker: "Docker \u5bb9\u5668",
  shell: "\u7ec8\u7aef", ssh: "\u8fdc\u7a0b\u8fde\u63a5", udp: "UDP \u76d1\u63a7",
  web: "\u7f51\u7edc", research: "\u7814\u7a76", documentation: "\u6587\u6863", lookup: "\u68c0\u7d22",
  actionable: "\u53ef\u6267\u884c", solutions: "\u65b9\u6848", provide: "\u63d0\u4f9b", code: "\u4ee3\u7801", examples: "\u793a\u4f8b",
  step: "\u6b65\u9aa4", explanation: "\u8bf4\u660e", call: "\u6307\u51fa", risks: "\u98ce\u9669", when: "\u5728", needed: "\u5fc5\u8981\u65f6",
  preset: "\u6a21\u677f", apply: "\u5e94\u7528", category: "\u5206\u7c7b", type: "\u7c7b\u578b",
  custom: "\u81ea\u5b9a\u4e49", only: "\u4ec5", no: "\u4e0d",
  benefits: "\u798f\u5229", advisor: "\u987e\u95ee", compensation: "\u85aa\u916c", benchmarker: "\u5bf9\u6807",
  exit: "\u79bb\u804c", interview: "\u9762\u8c08", onboarding: "\u5165\u804c", performance: "\u7ee9\u6548",
  reviewer: "\u8bc4\u5ba1", recruiter: "\u62db\u8058\u5b98", resume: "\u7b80\u5386", optimizer: "\u4f18\u5316", screener: "\u7b5b\u9009",
  workflows: "\u5de5\u4f5c\u6d41", workflow: "\u5de5\u4f5c\u6d41", management: "\u7ba1\u7406", diagnostics: "\u8bca\u65ad",
  scripting: "\u811a\u672c", operations: "\u64cd\u4f5c", monitoring: "\u76d1\u63a7", system: "\u7cfb\u7edf",
  content: "\u5185\u5bb9", repurposer: "\u6539\u5199", competitor: "\u7ade\u54c1", watch: "\u76d1\u63a7",
  outreach: "\u5916\u8054", lead: "\u7ebf\u7d22", gen: "\u751f\u6210", geo: "\u5730\u7406",
  influencer: "\u8fbe\u4eba", linkedin: "\u9886\u82f1", localization: "\u672c\u5730\u5316", multi: "\u591a",
  account: "\u8d26\u53f7", social: "\u793e\u5a92", multimedia: "\u591a\u5a92\u4f53", pipeline: "\u6d41\u6c34\u7ebf",
  news: "\u8d44\u8baf", curator: "\u7b56\u5c55", newsletter: "\u7b80\u62a5", reddit: "Reddit",
  scout: "\u4fa6\u5bdf", seo: "SEO", telemarketer: "\u7535\u9500", tiktok: "TikTok", ugc: "UGC",
  youtube: "YouTube", twitter: "Twitter", churn: "\u6d41\u5931", predictor: "\u9884\u6d4b",
  deal: "\u6210\u4ea4", forecaster: "\u9884\u6d4b", invoice: "\u53d1\u7968", objection: "\u5f02\u8bae",
  whatsapp: "WhatsApp", copywriter: "\u6587\u6848", audio: "\u97f3\u9891", producer: "\u5236\u4f5c",
  brand: "\u54c1\u724c", music: "\u97f3\u4e50", podcast: "\u64ad\u5ba2", proofreader: "\u6821\u5bf9",
  short: "\u77ed", form: "\u5f62\u5f0f", video: "\u89c6\u9891", storyboard: "\u5206\u955c",
  thumbnail: "\u5c01\u9762", ad: "\u5e7f\u544a", anomaly: "\u5f02\u5e38", cleaner: "\u6e05\u6d17",
  entry: "\u5f55\u5165", tracker: "\u8ddf\u8e2a", analyzer: "\u5206\u6790", checker: "\u68c0\u67e5",
  detector: "\u68c0\u6d4b", optimizer: "\u4f18\u5316", scheduler: "\u8c03\u5ea6", reviewer: "\u8bc4\u5ba1",
  planner: "\u89c4\u5212", guard: "\u5b88\u62a4", security: "\u5b89\u5168", legal: "\u6cd5\u52a1",
  finance: "\u8d22\u52a1", marketing: "\u8425\u9500", sales: "\u9500\u552e", customer: "\u5ba2\u6237",
  success: "\u6210\u529f", support: "\u652f\u6301", healthcare: "\u533b\u7597", hr: "\u4eba\u529b",
  productivity: "\u751f\u4ea7\u529b", education: "\u6559\u80b2", supply: "\u4f9b\u5e94", chain: "\u94fe",
  estate: "\u5730\u4ea7", freelance: "\u81ea\u7531\u804c\u4e1a", creator: "\u521b\u4f5c\u8005",
  analyst: "\u5206\u6790\u5e08", specialist: "\u4e13\u5bb6", manager: "\u7ecf\u7406", assistant: "\u52a9\u624b",
  designer: "\u8bbe\u8ba1\u5e08", notes: "\u7b14\u8bb0", note: "\u7b14\u8bb0", coach: "\u6559\u7ec3",
  forecaster: "\u9884\u6d4b\u5e08", tester: "\u6d4b\u8bd5\u5458", tester2: "\u6d4b\u8bd5\u5458", preparer: "\u51c6\u5907\u5668",
  tracker: "\u8ddf\u8e2a\u5668", writer: "\u5199\u4f5c", generator: "\u751f\u6210\u5668", transcriber: "\u8f6c\u5199",
  incident: "\u6545\u969c", auditor: "\u5ba1\u8ba1", scanner: "\u626b\u63cf", researcher: "\u7814\u7a76\u5458",
  builder: "\u6784\u5efa\u5668", pricing: "\u5b9a\u4ef7", invoice: "\u53d1\u7968", responder: "\u54cd\u5e94",
  tutor: "\u5bfc\u5e08", tester: "\u6d4b\u8bd5", personal: "\u4e2a\u4eba", legal: "\u6cd5\u52a1",
  security: "\u5b89\u5168", customer: "\u5ba2\u6237", automation: "\u81ea\u52a8\u5316", compliance: "\u5408\u89c4",
  ecommerce: "\u7535\u5546", code: "\u4ee3\u7801", policy: "\u7b56\u7565", patent: "\u4e13\u5229",
  nda: "NDA", newsletter: "\u7b80\u62a5", media: "\u5a92\u4f53", instagram: "Instagram", reels: "Reels",
  finder: "\u53d1\u73b0", hackernews: "HackerNews", brief: "\u7b80\u62a5", meal: "\u996e\u98df",
  clinical: "\u4e34\u5e8a", upwork: "Upwork", symptom: "\u75c7\u72b6", triage: "\u5206\u8bca",
  intake: "\u63a5\u8bca", medication: "\u7528\u836f", trading: "\u4ea4\u6613", tax: "\u7a0e\u52a1",
  revenue: "\u6536\u5165", time: "\u65f6\u95f4", client: "\u5ba2\u6237", contract: "\u5408\u540c",
  benefits: "\u798f\u5229", workout: "\u952f\u70bc", wellness: "\u5065\u5eb7", flow: "\u6d41\u7a0b",
  feature: "\u529f\u80fd", request: "\u9700\u6c42", prevention: "\u9884\u9632", usage: "\u4f7f\u7528",
  analytics: "\u5206\u6790", release: "\u53d1\u5e03", scrum: "Scrum", qualifier: "\u8d44\u683c\u7b5b\u9009",
  commercial: "\u5546\u4e1a", property: "\u623f\u4ea7", market: "\u5e02\u573a", listing: "\u5217\u8868",
  vendor: "\u4f9b\u5e94\u5546", evaluator: "\u8bc4\u4f30", route: "\u8def\u7ebf", voicemail: "\u8bed\u97f3\u4fe1\u7bb1",
  phone: "\u7535\u8bdd", receptionist: "\u63a5\u5f85", phishing: "\u9493\u9c7c", logger: "\u65e5\u5fd7\u8bb0\u5f55",
  access: "\u8bbf\u95ee", vuln: "\u6f0f\u6d1e", threat: "\u5a01\u80c1", hardener: "\u52a0\u56fa",
  notion: "Notion", organizer: "\u7ec4\u7ec7\u8005", community: "\u793e\u533a", shorts: "\u77ed\u89c6\u9891",
  family: "\u5bb6\u5ead", coordinator: "\u534f\u8c03", x: "X", inbox: "\u6536\u4ef6\u7bb1",
  zero: "\u96f6", habit: "\u4e60\u60ef", focus: "\u4e13\u6ce8", timer: "\u8ba1\u65f6\u5668",
  metrics: "\u6307\u6807", journal: "\u65e5\u5fd7", prompter: "\u63d0\u793a", home: "\u5bb6\u5ead",
  fitness: "\u5065\u8eab", standup: "\u7ad9\u4f1a", travel: "\u65c5\u884c", reading: "\u9605\u8bfb",
  digest: "\u6458\u8981", thumbnail: "\u7f29\u7565\u56fe", storyboard: "\u5206\u955c", scripter: "\u811a\u672c\u5f00\u53d1",
  ux: "UX", proofreader: "\u6821\u5bf9", podcast: "\u64ad\u5ba2", sql: "SQL",
  report: "\u62a5\u544a", etl: "ETL", survey: "\u8c03\u7814", anomaly: "\u5f02\u5e38",
  guide: "\u6307\u5357", nps: "NPS", followup: "\u8ddf\u8fdb", dashboard: "\u770b\u677f",
  predictor: "\u9884\u6d4b", erp: "ERP", admin: "\u7ba1\u7406", job: "\u804c\u4f4d",
  applicant: "\u5019\u9009\u4eba", flight: "\u822a\u73ed", scraper: "\u6293\u53d6", discord: "Discord",
  overnight: "\u9694\u591c", coder: "\u7a0b\u5e8f\u5458", negotiation: "\u8c08\u5224", morning: "\u65e9\u62a5",
  briefing: "\u7b80\u62a5", ai: "AI", outbound: "\u5916\u547c", soc2: "SOC2", risk: "\u98ce\u9669",
  assessor: "\u8bc4\u4f30", gdpr: "GDPR", objection: "\u5f02\u8bae", handler: "\u5904\u7406",
  scheduler: "\u8c03\u5ea6\u5668", radar: "\u96f7\u8fbe", crm: "CRM", review: "\u8bc4\u5ba1",
  lister: "\u5217\u8868", flashcard: "\u95ea\u5361", essay: "\u4f5c\u6587", grader: "\u6253\u5206",
  curriculum: "\u8bfe\u7a0b", abandoned: "\u5f03\u8d2d", cart: "\u8d2d\u7269\u8f66", sla: "SLA",
  self: "\u81ea\u6211", healing: "\u7597\u6108", server: "\u670d\u52a1\u5668", price: "\u4ef7\u683c",
  dropshipping: "\u4ee3\u53d1\u8d27", financial: "\u91d1\u878d", expense: "\u652f\u51fa", copy: "\u6587\u6848",
  trader: "\u4ea4\u6613\u5458", portfolio: "\u6295\u8d44\u7ec4\u5408", rebalancer: "\u518d\u5e73\u8861",
  fraud: "\u6b3a\u8bc8", quiz: "\u6d4b\u9a8c", maker: "\u751f\u6210\u5668",
};
const PHRASE_ZH = {
  "benefits advisor": "\u798f\u5229\u987e\u95ee",
  "compensation benchmarker": "\u85aa\u916c\u5bf9\u6807",
  "exit interview": "\u79bb\u804c\u9762\u8c08",
  "onboarding": "\u5165\u804c\u5f15\u5bfc",
  "performance reviewer": "\u7ee9\u6548\u8bc4\u5ba1",
  "recruiter": "\u62db\u8058\u5b98",
  "resume optimizer": "\u7b80\u5386\u4f18\u5316",
  "resume screener": "\u7b80\u5386\u7b5b\u9009",
  "content repurposer": "\u5185\u5bb9\u6539\u5199\u5668",
  "competitor watch": "\u7ade\u54c1\u76d1\u63a7",
  "cold outreach": "\u51b7\u542f\u5916\u8054",
  "lead gen": "\u7ebf\u7d22\u751f\u6210",
  "news curator": "\u8d44\u8baf\u7b56\u5c55",
  "newsletter reddit scout": "\u7b80\u62a5Reddit\u4fa6\u5bdf",
  "seo telemarketer": "SEO\u7535\u9500",
  "tiktok ugc": "TikTok UGC",
  "performance reviewer": "\u7ee9\u6548\u8bc4\u5ba1",
  "resume screener": "\u7b80\u5386\u7b5b\u9009",
  "meeting notes writer": "\u4f1a\u8bae\u7b14\u8bb0\u5199\u4f5c",
  "meeting summary generator": "\u4f1a\u8bae\u6458\u8981\u751f\u6210",
  "incident responder": "\u6545\u969c\u54cd\u5e94",
  "security policy checker": "\u5b89\u5168\u7b56\u7565\u68c0\u67e5",
  "social media manager": "\u793e\u5a92\u7ecf\u7406",
  "api tester": "API \u6d4b\u8bd5",
  "sql report builder": "SQL \u62a5\u544a\u6784\u5efa",
  "customer support assistant": "\u5ba2\u670d\u52a9\u624b",
  "sales outreach assistant": "\u9500\u552e\u5916\u8054\u52a9\u624b",
  "onboarding flow designer": "\u5165\u804c\u6d41\u7a0b\u8bbe\u8ba1",
  "risk assessor": "\u98ce\u9669\u8bc4\u4f30",
};
const ZH_EN = {
  "\u51b7\u9759": "Calm", "\u5de5\u7a0b\u5e08": "Engineer", "\u8010\u5fc3": "Patient", "\u76f4\u63a5": "Direct",
  "\u7b80\u6d01": "Concise", "\u4e13\u4e1a": "Professional", "\u53cb\u597d": "Friendly", "\u4e25\u8c28": "Rigorous",
  "\u4f18\u5148\u7ed9\u89e3\u51b3\u65b9\u6848": "Actionable solutions first",
  "\u5fc5\u987b\u63d0\u4f9b\u4ee3\u7801": "Provide code examples",
  "\u6309\u6b65\u9aa4\u8bf4\u660e": "Step-by-step explanation",
  "\u5fc5\u8981\u65f6\u6307\u51fa\u98ce\u9669": "Call out risks when needed",
};
const TONE_CANON = {
  concise: "Concise", "\u7b80\u6d01": "Concise",
  professional: "Professional", "\u4e13\u4e1a": "Professional",
  friendly: "Friendly", "\u53cb\u597d": "Friendly",
  rigorous: "Rigorous", "\u4e25\u8c28": "Rigorous",
};
const PERSONALITY_CANON = {
  calm: "Calm", "\u51b7\u9759": "Calm",
  engineer: "Engineer", "\u5de5\u7a0b\u5e08": "Engineer",
  patient: "Patient", "\u8010\u5fc3": "Patient",
  direct: "Direct", "\u76f4\u63a5": "Direct",
};
function canonTone(v) {
  const raw = String(v || "").trim();
  if (!raw) return raw;
  return TONE_CANON[raw] || TONE_CANON[raw.toLowerCase()] || normalizeEn(raw);
}
function canonPersonality(v) {
  const raw = String(v || "").trim();
  if (!raw) return raw;
  return PERSONALITY_CANON[raw] || PERSONALITY_CANON[raw.toLowerCase()] || normalizeEn(raw);
}
function toZhGuess(en) {
  const phrase = normalizeEn(en).toLowerCase();
  if (PHRASE_ZH[phrase]) return PHRASE_ZH[phrase];
  let hits = 0;
  const out = normalizeEn(en)
    .split(/\s+/)
    .map((x) => {
      const mapped = TOKEN_ZH[x.toLowerCase()];
      if (mapped) hits += 1;
      return mapped ?? x;
    })
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  return hits > 0 ? out : normalizeEn(en);
}
function label(v) {
  const raw = String(v || "").trim();
  if (!raw) return "";
  if (hasZh(raw)) return `${ZH_EN[raw] || "Custom"} (${raw})`;
  const en = normalizeEn(raw);
  return `${en} (${toZhGuess(en)})`;
}
function setStatus(msg) { n.status.textContent = msg; }
async function apiFetchJson(url, options = {}) {
  const resp = await fetch(url, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await resp.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    const isHtml = /<!doctype html|<html/i.test(text || "");
    const unsupported = /unsupported method/i.test(text || "");
    if (!resp.ok && (resp.status === 501 || unsupported || isHtml)) {
      throw new Error("\u5f53\u524d\u670d\u52a1\u662f\u9759\u6001 HTTP \u670d\u52a1\uff0c\u4e0d\u652f\u6301 POST/PUT\u3002\u8bf7\u4f7f\u7528 npm start \u6216 node server.js \u542f\u52a8\u540e\u7aef\u3002");
    }
    data = { message: text || "Invalid response" };
  }
  if (!resp.ok) {
    throw new Error(data.message || `HTTP ${resp.status}`);
  }
  return data;
}
function showConfirm(message) {
  return new Promise((resolve) => {
    if (!n.confirmModal) {
      resolve(window.confirm(message));
      return;
    }
    n.confirmMessage.textContent = message;
    n.confirmModal.classList.remove("hidden");
    const cleanup = () => {
      n.confirmModal.classList.add("hidden");
      n.confirmOkBtn.onclick = null;
      n.confirmCancelBtn.onclick = null;
    };
    n.confirmOkBtn.onclick = () => { cleanup(); resolve(true); };
    n.confirmCancelBtn.onclick = () => { cleanup(); resolve(false); };
  });
}
function pad2(n0) { return String(n0).padStart(2, "0"); }
function defaultBackupName() {
  const d = new Date();
  return `backup-${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
}
function ensureBackupName() {
  if (!n.backupNameInput) return defaultBackupName();
  if (!n.backupNameInput.value.trim()) n.backupNameInput.value = defaultBackupName();
  return n.backupNameInput.value.trim();
}
function hasWorkspaceMode() {
  return Array.isArray(state.workspaceFiles) && state.workspaceFiles.length > 0;
}
function activeWorkspaceFile() {
  return state.activeTab && state.workspaceFiles.includes(state.activeTab) ? state.activeTab : (state.workspaceFiles[0] || "");
}
function activeWorkspaceContent() {
  const file = activeWorkspaceFile();
  return file ? String(state.workspaceDocs[file] || "") : "";
}
function syncWorkspaceEditors(skip = "") {
  const file = activeWorkspaceFile();
  const content = activeWorkspaceContent();
  if (n.quickEditorFileName) n.quickEditorFileName.value = file;
  if (n.quickEditor && skip !== "quick" && document.activeElement !== n.quickEditor) n.quickEditor.value = content;
  if (n.manualEditor && skip !== "manual" && document.activeElement !== n.manualEditor) n.manualEditor.value = content;
  if (n.preview) n.preview.textContent = content;
}
function updateWorkspaceContent(source) {
  const file = activeWorkspaceFile();
  if (!file) return;
  const content = source === "quick" ? String(n.quickEditor?.value || "") : String(n.manualEditor?.value || "");
  state.workspaceDocs[file] = content;
  syncWorkspaceEditors(source);
}
async function promptBackupBeforeEdit() {
  if (state.backupPromptedForEdit) return;
  state.backupPromptedForEdit = true;
  const backupName = ensureBackupName();
  const yes = await showConfirm(`\u51c6\u5907\u5f00\u59cb\u4fee\u6539\u6587\u4ef6\uff0c\u5efa\u8bae\u5148\u5907\u4efd\u3002\n\u73b0\u5728\u521b\u5efa\u5907\u4efd\uff1a${backupName}\uff1f`);
  if (yes) await createBackupNow();
}
async function saveActiveWorkspaceFile() {
  const file = activeWorkspaceFile();
  if (!file) {
    setStatus("No .md file found in workspace");
    return;
  }
  try {
    await apiFetchJson(`/api/workspace/file/${encodeURIComponent(file)}`, { method: "PUT", body: { content: String(state.workspaceDocs[file] || "") } });
    setStatus(`saved: ${file}`);
  } catch (err) {
    setStatus(`save failed: ${String(err.message || err)}`);
  }
}
function formatBackupOption(b) {
  const name = String(b.name || "").trim();
  const label0 = `${b.id}${name ? ` | ${name}` : ""}${b.fileCount ? ` | files:${b.fileCount}` : ""}`;
  return label0;
}
async function refreshBackupVersions() {
  if (!n.backupVersionSelect) return;
  try {
    const res = await apiFetchJson("/api/workspace/backups");
    const list = Array.isArray(res.backups) ? res.backups : [];
    n.backupVersionSelect.innerHTML = "";
    for (const b of list) {
      const op = document.createElement("option");
      op.value = b.id;
      op.textContent = formatBackupOption(b);
      n.backupVersionSelect.appendChild(op);
    }
    if (!list.length) {
      const op = document.createElement("option");
      op.value = "";
      op.textContent = "No backups";
      n.backupVersionSelect.appendChild(op);
    }
    setStatus(`Backups loaded (${list.length})`);
  } catch (err) {
    setStatus(`backup list failed: ${String(err.message || err)}`);
  }
}
async function createBackupNow() {
  try {
    const name = ensureBackupName();
    const res = await apiFetchJson("/api/workspace/backup", { method: "POST", body: { name } });
    setStatus(`backup created: ${res.backupId || "ok"}`);
    if (n.backupNameInput && !n.backupNameInput.dataset.lockedByUser) n.backupNameInput.value = defaultBackupName();
    await refreshBackupVersions();
  } catch (err) {
    setStatus(`backup failed: ${String(err.message || err)}`);
  }
}
async function restoreSelectedBackup() {
  const id0 = n.backupVersionSelect?.value;
  if (!id0) {
    setStatus("no backup selected");
    return;
  }
  const ok = await showConfirm(`\u786e\u8ba4\u6062\u590d\u5907\u4efd ${id0}\uff1f\u5f53\u524d workspace \u7684 Markdown \u6587\u4ef6\u5c06\u88ab\u8986\u76d6\u3002`);
  if (!ok) return;
  try {
    const res = await apiFetchJson(`/api/workspace/backups/${encodeURIComponent(id0)}/restore`, { method: "POST" });
    const restored = res.restoredBackupId || id0;
    await syncFromWorkspace(`backup restored: ${restored}`);
    await refreshBackupVersions();
  } catch (err) {
    setStatus(`restore failed: ${String(err.message || err)}`);
  }
}
async function restartGateway() {
  const ok = await showConfirm("\u786e\u8ba4\u73b0\u5728\u91cd\u542f OpenClaw \u7f51\u5173\uff1f");
  if (!ok) return;
  try {
    const res = await apiFetchJson("/api/system/restart-gateway", { method: "POST" });
    setStatus(`gateway restarted: ${res.message || "ok"}`);
  } catch (err) {
    setStatus(`gateway restart failed: ${String(err.message || err)}`);
  }
}

function applyStaticText() {
  if (n.title) n.title.textContent = t("title");
  if (n.subtitle) n.subtitle.textContent = t("subtitle");
  if (n.importBtn) n.importBtn.textContent = t("import");
  if (n.exportJson) n.exportJson.textContent = t("exportJson");
  if (n.exportZip) n.exportZip.textContent = t("exportZip");
  if (n.categoryLabel) n.categoryLabel.textContent = t("presetCategory");
  if (n.presetLabel) n.presetLabel.textContent = t("presetType");
  if (n.applyPreset) n.applyPreset.textContent = t("applyPreset");
  if (n.presetSource) n.presetSource.textContent = t("source");
  if (n.copyAllPromptsBtn) n.copyAllPromptsBtn.textContent = "\u590d\u5236\u5168\u90e8\u63d0\u793a\u8bcd";
  if (n.backupNowBtn) n.backupNowBtn.textContent = "\u7acb\u5373\u5907\u4efd";
  if (n.refreshBackupsBtn) n.refreshBackupsBtn.textContent = "\u5237\u65b0\u7248\u672c";
  if (n.restoreBackupBtn) n.restoreBackupBtn.textContent = "\u6062\u590d\u5907\u4efd";
  if (n.restartGatewayBtn) n.restartGatewayBtn.textContent = "\u91cd\u542f\u7f51\u5173";
  if (n.confirmCancelBtn) n.confirmCancelBtn.textContent = "\u53d6\u6d88";
  if (n.confirmOkBtn) n.confirmOkBtn.textContent = "\u786e\u8ba4";
}

function renderCheck(container, name, options, selected = []) {
  container.innerHTML = ""; const s = new Set(selected);
  for (const o of uniq(options)) {
    const l = document.createElement("label"); const i = document.createElement("input");
    i.type = "checkbox"; i.name = name; i.value = o; i.checked = s.has(o);
    l.appendChild(i); l.append(` ${label(o)}`); container.appendChild(l);
  }
}

function extraMeta(name) {
  return {
    personality: { c: n.personalityExtra, s: n.personalitySearch },
    skills: { c: n.skillsExtra, s: n.skillsSearch },
    rules: { c: n.rulesExtra, s: n.rulesSearch },
    toolSuggest: { c: n.toolSuggestExtra, s: n.toolSuggestSearch },
  }[name];
}

function renderExtra(name, selectedOverride = null) {
  const m = extraMeta(name); if (!m?.c) return;
  const q = String(m.s?.value || "").trim().toLowerCase(); const s = new Set(selectedOverride || checked(name));
  const opts = uniq(state.extra[name]).filter((x) => !q || String(x).toLowerCase().includes(q) || label(x).toLowerCase().includes(q));
  m.c.innerHTML = ""; m.c.classList.add("option-list");
  if (!opts.length) { const d = document.createElement("div"); d.className = "option-empty"; d.textContent = t("noMatch"); m.c.appendChild(d); return; }
  for (const x of opts) {
    const r = document.createElement("label"); r.className = "option-row";
    const i = document.createElement("input"); i.type = "checkbox"; i.name = name; i.value = x; i.checked = s.has(x);
    const p = document.createElement("span"); p.textContent = label(x);
    r.appendChild(i); r.appendChild(p); m.c.appendChild(r);
  }
}

function renderSplit(coreC, extraC, name, options, selected, limit) {
  const allRaw = uniq(options);
  const seen = new Set();
  const all = [];
  for (const o of allRaw) {
    const key = label(o).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    all.push(o);
  }
  const core = all.slice(0, limit), extra = all.slice(limit);
  renderCheck(coreC, name, core, selected); state.extra[name] = extra; renderExtra(name, selected);
  const d = extraC?.closest("details"); if (d) d.style.display = extra.length ? "block" : "none";
}

function renderSelected() {
  const show = (c, vals) => { c.innerHTML = ""; const v = uniq(vals); if (!v.length) { const e = document.createElement("label"); e.textContent = t("none"); c.appendChild(e); return; } for (const x of v) { const l = document.createElement("label"); l.textContent = label(x); c.appendChild(l); } };
  show(n.personalitySelected, checked("personality")); show(n.skillsSelected, checked("skills")); show(n.rulesSelected, checked("rules")); show(n.toolSuggestSelected, checked("toolSuggest"));
}

function renderTone(selected = "") {
  n.tone.innerHTML = "";
  const opts = uniq([...(state.pool.tones || []), selected].map((x) => canonTone(x)));
  for (const x of opts) { const op = document.createElement("option"); op.value = x; op.textContent = label(x); n.tone.appendChild(op); }
  const selectedTone = canonTone(selected);
  n.tone.value = selectedTone && opts.includes(selectedTone) ? selectedTone : (opts[0] || "");
}

function renderCoreTools(selected = []) {
  n.toolCore.innerHTML = ""; const s = new Set(selected);
  for (const k of CORE_TOOLS) { const l = document.createElement("label"), i = document.createElement("input"); i.type = "checkbox"; i.name = "coreTools"; i.value = k; i.checked = s.has(k); l.appendChild(i); l.append(` ${label(k)}`); n.toolCore.appendChild(l); }
}

function renderPool(pool, keep = true) {
  const merged = { ...state.pool, ...pool };
  merged.personality = uniq((merged.personality || []).map((x) => canonPersonality(x)));
  merged.tones = uniq((merged.tones || []).map((x) => canonTone(x)));
  state.pool = merged;
  const p = keep ? checked("personality") : [], s = keep ? checked("skills") : [], r = keep ? checked("rules") : [], ts = keep ? checked("toolSuggest") : [], core = keep ? checked("coreTools") : ["shell", "ssh"], tone = keep ? n.tone.value : "";
  renderSplit(n.personality, n.personalityExtra, "personality", state.pool.personality, p, 8);
  renderSplit(n.skills, n.skillsExtra, "skills", state.pool.skills, s, 10);
  renderSplit(n.rules, n.rulesExtra, "rules", state.pool.rules, r, 10);
  renderSplit(n.toolSuggest, n.toolSuggestExtra, "toolSuggest", state.pool.toolSuggestions, ts, 10);
  renderCoreTools(core); renderTone(tone || state.pool.tones[0]); renderSelected();
}

function parseCustomTools(text) {
  return lines(text).map((line) => {
    const m = line.match(/^(.*?)(?::|=)\s*(enabled|disabled|on|off|true|false|1|0)$/i);
    if (!m) return { name: line, enabled: true };
    return { name: m[1].trim(), enabled: ["enabled", "on", "true", "1"].includes(m[2].toLowerCase()) };
  }).filter((x) => x.name);
}

function buildConfig() {
  const customTools = parseCustomTools(n.customTools.value);
  for (const x of checked("toolSuggest")) if (!customTools.some((t0) => t0.name === x)) customTools.push({ name: x, enabled: true });
  const core = new Set(checked("coreTools"));
  const customPersonality = tags(n.customPersonality.value).map((x) => canonPersonality(x));
  return {
    soul: { personality: uniq([...checked("personality"), ...customPersonality]), customPersonality, tone: canonTone(n.tone.value), humor: n.humor.checked, strict: n.strict.checked, extraDirectives: lines(n.soulExtra.value) },
    agent: { skills: uniq([...checked("skills"), ...lines(n.customSkills.value)]), customSkills: lines(n.customSkills.value), rules: uniq([...checked("rules"), ...lines(n.customRules.value)]), customRules: lines(n.customRules.value) },
    tools: { shell: core.has("shell"), ssh: core.has("ssh"), udp: core.has("udp"), custom: customTools },
    identity: { name: n.name.value.trim() || "Unnamed Agent", role: n.role.value.trim() || "General Assistant", description: n.desc.value.trim() || "No description provided." },
  };
}

function applyConfig(cfg) {
  if (cfg.soul) { const v = uniq([...(cfg.soul.personality || []), ...(cfg.soul.customPersonality || [])].map((x) => canonPersonality(x))); const k = knownSet("personality"); renderSplit(n.personality, n.personalityExtra, "personality", uniq([...k, ...v.filter((x) => k.has(x))]), v.filter((x) => k.has(x)), 8); n.customPersonality.value = v.filter((x) => !k.has(x)).join(", "); if (cfg.soul.tone) renderTone(canonTone(cfg.soul.tone)); if (typeof cfg.soul.humor === "boolean") n.humor.checked = cfg.soul.humor; if (typeof cfg.soul.strict === "boolean") n.strict.checked = cfg.soul.strict; if (Array.isArray(cfg.soul.extraDirectives)) n.soulExtra.value = uniq(cfg.soul.extraDirectives).join("\n"); }
  if (cfg.agent) { const sv = uniq([...(cfg.agent.skills || []), ...(cfg.agent.customSkills || [])]), sk = knownSet("skills"); renderSplit(n.skills, n.skillsExtra, "skills", uniq([...sk, ...sv.filter((x) => sk.has(x))]), sv.filter((x) => sk.has(x)), 10); n.customSkills.value = sv.filter((x) => !sk.has(x)).join("\n"); const rv = uniq([...(cfg.agent.rules || []), ...(cfg.agent.customRules || [])]), rk = knownSet("rules"); renderSplit(n.rules, n.rulesExtra, "rules", uniq([...rk, ...rv.filter((x) => rk.has(x))]), rv.filter((x) => rk.has(x)), 10); n.customRules.value = rv.filter((x) => !rk.has(x)).join("\n"); }
  if (cfg.tools) { renderCoreTools(CORE_TOOLS.filter((k) => cfg.tools[k])); const tk = knownSet("toolSuggest"), suggest = [], manual = []; for (const x of (cfg.tools.custom || [])) { if (tk.has(x.name) && x.enabled) suggest.push(x.name); else manual.push(`${x.name}: ${x.enabled ? "enabled" : "disabled"}`); } renderSplit(n.toolSuggest, n.toolSuggestExtra, "toolSuggest", [...tk], suggest, 10); n.customTools.value = manual.join("\n"); }
  if (cfg.identity) { if (typeof cfg.identity.name === "string") n.name.value = cfg.identity.name; if (typeof cfg.identity.role === "string") n.role.value = cfg.identity.role; if (typeof cfg.identity.description === "string") n.desc.value = cfg.identity.description; }
  renderExtra("personality"); renderExtra("skills"); renderExtra("rules"); renderExtra("toolSuggest"); renderSelected();
}

function toSoulMd(c) {
  const p = c.soul.personality.length ? c.soul.personality.join(", ") : "steady";
  const lines0 = ["# Personality", "", `You are a ${p} style AI assistant.`, "", "## Tone", `- ${c.soul.tone}`, "- Avoid fluff", "", "## Behavior", "- Clear opinions", "- Direct answers", c.soul.strict ? "- Follow constraints strictly" : "- Stay flexible within constraints", "", "## Style", c.soul.humor ? "- Use light humor when useful" : "- Keep humor off", ""];
  if (c.soul.extraDirectives.length) lines0.push("## Extra Directives", "", ...c.soul.extraDirectives.map((x) => `- ${x}`), "");
  return lines0.join("\n");
}

function toAgentsMd(c) { const cap = c.agent.skills.length ? c.agent.skills.map((x) => `- ${SKILL_LABEL_MAP[x] || x}`) : ["- General task assistance"]; const rules = c.agent.rules.length ? c.agent.rules.map((x) => `- ${x}`) : ["- Follow user instructions clearly"]; return ["# Capabilities", "", ...cap, "", "# Rules", "", ...rules, "", "# Startup", "", "On each session:", "1. Read SOUL.md", "2. Load MEMORY.md", ""].join("\n"); }
function toToolsMd(c) { const lines0 = ["# Tools", "", `- Shell access ${c.tools.shell ? "enabled" : "disabled"}`, `- SSH ${c.tools.ssh ? "enabled" : "disabled"}`, `- UDP monitoring ${c.tools.udp ? "enabled" : "disabled"}`]; for (const x of c.tools.custom) lines0.push(`- ${x.name} ${x.enabled ? "enabled" : "disabled"}`); lines0.push(""); return lines0.join("\n"); }
function toIdentityMd(c) { return ["# Identity", "", `Name: ${c.identity.name}`, `Role: ${c.identity.role}`, "", "Description:", c.identity.description, ""].join("\n"); }
function bundle(c) { return { "SOUL.md": toSoulMd(c), "AGENTS.md": toAgentsMd(c), "TOOLS.md": toToolsMd(c), "MEMORY.md": "# Memory\n\nNo stored memory yet.\n", "IDENTITY.md": toIdentityMd(c) }; }

function renderTabs() {
  if (!n.tab) return;
  n.tab.innerHTML = "";
  const files = hasWorkspaceMode() ? state.workspaceFiles : FILE_ORDER;
  for (const f of files) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `tab${state.activeTab === f ? " active" : ""}`;
    b.textContent = f;
    b.onclick = () => {
      state.activeTab = f;
      render();
    };
    n.tab.appendChild(b);
  }
}
function buildValidationPromptGroups(cfg) {
  const groups = [];
  const personalityItems = (cfg.soul.personality || []).slice(0, 8).map((p) =>
    `Use ${label(p)} style. Give a CPU spike troubleshooting checklist with conclusion first, then steps.`,
  );
  if (personalityItems.length) groups.push({ title: "Personality Check", items: personalityItems });

  const toneItems = [];
  if (cfg.soul.tone) toneItems.push(`Use ${label(cfg.soul.tone)} tone to explain why a release failed, in at most 5 sentences.`);
  toneItems.push(cfg.soul.humor ? "Add slight humor without reducing actionability." : "Keep the answer serious and professional.");
  toneItems.push(cfg.soul.strict ? "If information is missing, ask for minimum required details first." : "If information is missing, provide assumptions and mark them clearly.");
  groups.push({ title: "Tone & Behavior", items: toneItems });

  const skills = uniq([...(cfg.agent.skills || []), ...(cfg.agent.customSkills || [])]).slice(0, 12);
  const skillItems = skills.map((s) => `Skill check - ${label(s)}: provide a minimal executable solution and validation steps.`);
  if (skillItems.length) groups.push({ title: "Skills Check", items: skillItems });

  const rules = uniq([...(cfg.agent.rules || []), ...(cfg.agent.customRules || [])]).slice(0, 12);
  const ruleItems = rules.map((r) => `Rule check - ${label(r)}: show this rule explicitly in one response.`);
  if (ruleItems.length) groups.push({ title: "Rules Check", items: ruleItems });

  const toolItems = [];
  if (cfg.tools.shell) toolItems.push("Tool check - Shell: provide 3 executable troubleshooting commands with expected outputs.");
  if (cfg.tools.ssh) toolItems.push("Tool check - SSH: provide a minimal remote troubleshooting flow (connect, inspect, rollback).");
  if (cfg.tools.udp) toolItems.push("Tool check - UDP: provide UDP link diagnostics and packet capture verification.");
  for (const t0 of (cfg.tools.custom || []).filter((x) => x.enabled).slice(0, 8)) {
    toolItems.push(`Tool check - ${label(t0.name)}: design an executable validation task with input, execution, and acceptance criteria.`);
  }
  if (toolItems.length) groups.push({ title: "Tools Check", items: toolItems });

  return groups;
}
function copyText(text) {
  if (!text) return;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => setStatus("\u5df2\u590d\u5236")).catch(() => setStatus("\u590d\u5236\u5931\u8d25"));
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    setStatus("\u5df2\u590d\u5236");
  } catch {
    setStatus("\u590d\u5236\u5931\u8d25");
  }
  document.body.removeChild(ta);
}
function renderValidationPrompts(cfg) {
  if (!n.testPromptList) return;
  const groups = buildValidationPromptGroups(cfg);
  n.testPromptList.innerHTML = "";

  if (!groups.length) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "No prompts yet. Select some personality / skills / rules / tools first.";
    n.testPromptList.appendChild(empty);
    return;
  }

  for (const g of groups) {
    const box = document.createElement("div");
    box.className = "test-group";
    const title = document.createElement("div");
    title.className = "test-title";
    title.textContent = g.title;
    box.appendChild(title);

    for (const item of g.items) {
      const row = document.createElement("div");
      row.className = "prompt-item";

      const text = document.createElement("div");
      text.className = "prompt-text";
      text.textContent = item;

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "copy-btn";
      btn.textContent = "\u590d\u5236";
      btn.addEventListener("click", () => copyText(item));

      row.appendChild(text);
      row.appendChild(btn);
      box.appendChild(row);
    }
    n.testPromptList.appendChild(box);
  }

  if (n.copyAllPromptsBtn) {
    const all = groups.flatMap((g) => g.items.map((x) => `[${g.title}] ${x}`)).join("\n");
    n.copyAllPromptsBtn.onclick = () => copyText(all);
  }
}
function render() {
  if (hasWorkspaceMode()) {
    const editingWorkspaceText =
      document.activeElement === n.quickEditor ||
      document.activeElement === n.manualEditor;
    if (!editingWorkspaceText) {
      try {
        const cfg = buildConfig();
        const generated = bundle(cfg);
        for (const f of FILE_ORDER) {
          if (state.workspaceFiles.includes(f)) {
            state.workspaceDocs[f] = generated[f];
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
    renderTabs();
    syncWorkspaceEditors();
    return;
  }
  try {
    const cfg = buildConfig();
    const b = bundle(cfg);
    renderTabs();
    renderExtra("personality");
    renderExtra("skills");
    renderExtra("rules");
    renderExtra("toolSuggest");
    renderSelected();
    renderValidationPrompts(cfg);
    n.preview.textContent = b[state.activeTab] || b["SOUL.md"] || "# Empty preview";
  } catch (err) {
    console.error(err);
    n.preview.textContent = `# Render Error\n\n${String(err && err.message ? err.message : err)}`;
    setStatus(`render failed: ${String(err && err.message ? err.message : err)}`);
  }
}

function sanitizeName(s) { return (s.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "agent"); }
async function exportZip() { const c = buildConfig(), b = bundle(c), z = new JSZip(), w = z.folder("workspace"); for (const f of FILE_ORDER) w.file(f, b[f]); const blob = await z.generateAsync({ type: "blob" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${sanitizeName(c.identity.name)}.zip`; a.click(); URL.revokeObjectURL(a.href); setStatus(t("zipDone")); }
function exportJson() { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([JSON.stringify(buildConfig(), null, 2)], { type: "application/json" })); a.download = "openclaw-config.json"; a.click(); URL.revokeObjectURL(a.href); setStatus(t("jsonDone")); }

function bullets(sec) { return sec.split("\n").map((x) => x.trim()).filter((x) => x.startsWith("- ")).map((x) => x.slice(2).trim()); }
function headingBlock(content, headingLevel, headingText) {
  const lines0 = String(content || "").replace(/\r\n/g, "\n").replace(/^\uFEFF/, "").split("\n");
  const target = `${"#".repeat(headingLevel)} ${String(headingText || "").trim()}`.toLowerCase();
  const isH1 = (line) => line.trim().startsWith("# ");
  const isH2 = (line) => line.trim().startsWith("## ");

  let start = -1;
  for (let i = 0; i < lines0.length; i++) {
    if (lines0[i].trim().toLowerCase() === target) {
      start = i;
      break;
    }
  }
  if (start < 0) return "";

  const out = [lines0[start]];
  for (let i = start + 1; i < lines0.length; i++) {
    const line = lines0[i];
    if (headingLevel === 1 && isH1(line)) break;
    if (headingLevel === 2 && (isH2(line) || isH1(line))) break;
    out.push(line);
  }
  return out.join("\n");
}
function section(content, h1) { return headingBlock(content, 1, h1); }
function sectionH2(content, h2) { return headingBlock(content, 2, h2); }
function parseSoulMd(content) {
  const s = { personality: [], extraDirectives: [] };

  const p1 = content.match(/You are a\s+(.+?)\s+style AI assistant\./i);
  if (p1) s.personality = p1[1].split(",").map((x) => x.trim()).filter(Boolean);

  // Compatibility with imported SOUL variants like:
  // "You are an engineering execution agent."
  if (!s.personality.length) {
    const p2 = content.match(/You are an?\s+(.+?)\./i);
    if (p2) s.personality = [p2[1].trim()];
  }

  const tone = content.match(/## Tone[\s\S]*?-\s*(.+)/m);
  if (tone) s.tone = tone[1].trim();

  if (content.includes("Use light humor")) s.humor = true;
  if (content.includes("Keep humor off")) s.humor = false;
  if (content.includes("Follow constraints strictly")) s.strict = true;
  if (content.includes("Stay flexible within constraints")) s.strict = false;

  const extra = (content.match(/^## Extra Directives[\s\S]*?(?=^## |^# |$)/m) || [""])[0];
  s.extraDirectives = bullets(extra);

  // Fallback: collect hard rules as extra directives.
  if (!s.extraDirectives.length) {
    const hardRules = sectionH2(content, "Hard Rules");
    if (hardRules) {
      const numbered = hardRules
        .split("\n")
        .map((x) => x.trim())
        .filter((x) => /^\d+\.\s+/.test(x))
        .map((x) => x.replace(/^\d+\.\s+/, ""));
      s.extraDirectives = uniq(numbered);
    }
  }
  return s;
}
function parseAgentsMd(content) {
  const skills = [], customSkills = [], rules = [], customRules = [];
  for (const b of bullets(section(content, "Capabilities"))) {
    const k = REVERSE_SKILL_LABEL_MAP[b.toLowerCase()];
    if (k) skills.push(k); else customSkills.push(b);
  }
  for (const b of bullets(section(content, "Rules"))) {
    const k = REVERSE_RULE_LABEL_MAP[b.toLowerCase()];
    if (k) rules.push(k); else customRules.push(b);
  }

  // Compatibility fallback for AGENTS that don't have #Capabilities/#Rules.
  if (!skills.length && !customSkills.length) {
    if (/linux/i.test(content)) skills.push("linux");
    if (/network/i.test(content)) skills.push("network");
    if (/python/i.test(content)) skills.push("python");
    if (/docker/i.test(content)) skills.push("docker");
  }
  if (!rules.length && !customRules.length) {
    const fallbackRules = [
      ...bullets(sectionH2(content, "Task Flow")),
      ...bullets(sectionH2(content, "Latch")),
      ...bullets(sectionH2(content, "Priority")),
      ...bullets(sectionH2(content, "Output Constraints")),
    ];
    customRules.push(...uniq(fallbackRules));
  }
  return { skills: uniq(skills), customSkills: uniq(customSkills), rules: uniq(rules), customRules: uniq(customRules) };
}
function parseToolsMd(content) { const tools = { shell: false, ssh: false, udp: false, custom: [] }; for (const b of bullets(section(content, "Tools"))) { const l = b.toLowerCase(); if (l.startsWith("shell access ")) { tools.shell = l.endsWith("enabled"); continue; } if (l.startsWith("ssh ")) { tools.ssh = l.endsWith("enabled"); continue; } if (l.startsWith("udp monitoring ")) { tools.udp = l.endsWith("enabled"); continue; } const m = b.match(/^(.*)\s+(enabled|disabled)$/i); tools.custom.push(m ? { name: m[1].trim(), enabled: m[2].toLowerCase() === "enabled" } : { name: b.trim(), enabled: true }); } tools.custom = tools.custom.filter((x) => x.name); return tools; }
function parseIdentityMd(content) {
  const n0 = content.match(/^Name:\s*(.+)$/m), r0 = content.match(/^Role:\s*(.+)$/m), d0 = content.match(/Description:\s*\n([\s\S]*)$/m);
  const role = r0 ? r0[1].trim() : "";
  let desc = d0 ? d0[1].trim() : "";
  if (!desc) {
    const style = (content.match(/^Style:\s*(.+)$/m) || [null, ""])[1].trim();
    const lang = (content.match(/^Language:\s*(.+)$/m) || [null, ""])[1].trim();
    desc = [style, lang].filter(Boolean).join(" | ");
  }
  return { name: n0 ? n0[1].trim() : "", role, description: desc };
}

const IMPORT_NAME_MAP = {
  "SOUL.MD": "SOUL.md",
  "AGENTS.MD": "AGENTS.md",
  "TOOLS.MD": "TOOLS.md",
  "MEMORY.MD": "MEMORY.md",
  "IDENTITY.MD": "IDENTITY.md",
};
function normName(path) {
  const p = String(path || "").replace(/\\/g, "/").split("/");
  const base = (p[p.length - 1] || "").trim().toUpperCase();
  return IMPORT_NAME_MAP[base] || null;
}
async function readZip(file) {
  const z = await JSZip.loadAsync(file), out = {};
  for (const e of Object.values(z.files)) {
    if (e.dir) continue;
    const n0 = normName(e.name);
    if (!n0) continue;
    out[n0] = await e.async("string");
  }
  return out;
}
async function readImported(files) {
  const out = {};
  for (const f of files) {
    const name = f.name.toLowerCase();
    if (name.endsWith(".zip")) { Object.assign(out, await readZip(f)); continue; }
    if (name.endsWith(".md")) {
      const n0 = normName(f.name);
      if (n0) out[n0] = await f.text();
      continue;
    }
    if (name.endsWith(".json")) {
      applyConfig(JSON.parse(await f.text()));
      setStatus(t("jsonImported"));
      render();
    }
  }
  return out;
}
async function importFiles() {
  const files = [...n.importFile.files];
  if (!files.length) return;
  const md = await readImported(files);
  const parsed = applyMdMap(md);
  const names = Object.keys(md);
  if (names.length) {
    if (parsed.length) setStatus(`${t("mdImported", { names: names.join(", ") })} | parsed: ${parsed.join(", ")}`);
    else setStatus(`${t("mdImported", { names: names.join(", ") })} | parsed: none (format mismatch)`);
  }
  else if (!files.some((f) => f.name.toLowerCase().endsWith(".json"))) setStatus(t("mdNotFound"));
  n.importFile.value = "";
}

function applyMdMap(md) {
  const patch = {};
  if (md["SOUL.md"]) patch.soul = parseSoulMd(md["SOUL.md"]);
  if (md["AGENTS.md"]) patch.agent = parseAgentsMd(md["AGENTS.md"]);
  if (md["TOOLS.md"]) patch.tools = parseToolsMd(md["TOOLS.md"]);
  if (md["IDENTITY.md"]) patch.identity = parseIdentityMd(md["IDENTITY.md"]);

  const parsed = [];
  if (patch.soul && (patch.soul.personality?.length || patch.soul.extraDirectives?.length || patch.soul.tone)) parsed.push("SOUL");
  if (patch.agent && (patch.agent.skills?.length || patch.agent.customSkills?.length || patch.agent.rules?.length || patch.agent.customRules?.length)) parsed.push("AGENTS");
  if (patch.tools && (patch.tools.shell || patch.tools.ssh || patch.tools.udp || patch.tools.custom?.length)) parsed.push("TOOLS");
  if (patch.identity && (patch.identity.name || patch.identity.role || patch.identity.description)) parsed.push("IDENTITY");

  applyConfig(patch);
  state.activeTab = "SOUL.md";
  render();
  return parsed;
}

async function syncFromWorkspace(statusPrefix = "workspace loaded") {
  const res = await apiFetchJson("/api/workspace/snapshot");
  const md = res && typeof res.files === "object" && res.files ? res.files : {};
  const names = Object.keys(md).sort((a, b) => a.localeCompare(b, "en"));
  state.workspaceFiles = names;
  state.workspaceDocs = { ...md };
  if (!names.length) {
    setStatus(`${statusPrefix} | no md files found`);
    render();
    return;
  }
  if (!state.activeTab || !names.includes(state.activeTab)) state.activeTab = names[0];
  render();
  setStatus(`${statusPrefix} | files: ${names.length}`);
}

function topFreq(items, limit = 12) { const m = new Map(); for (const x of items || []) { const k = String(x || "").trim(); if (!k) continue; m.set(k, (m.get(k) || 0) + 1); } return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "en")).slice(0, limit).map((x) => x[0]); }
function buildPool(category, full = false) { const prs = category.presets || [], p = [], tones = [], sk = [], rl = [], tl = []; for (const pr of prs) { const c = pr.config || {}; p.push(...(c.soul?.personality || []), ...(c.soul?.customPersonality || [])); if (c.soul?.tone) tones.push(c.soul.tone); sk.push(...(c.agent?.skills || []), ...(c.agent?.customSkills || [])); rl.push(...(c.agent?.rules || []), ...(c.agent?.customRules || [])); for (const t0 of c.tools?.custom || []) if (t0?.name) tl.push(t0.name); } const pick = (a, n0) => full ? uniq(a) : topFreq(a, n0); return { personality: uniq([...DEFAULT_POOL.personality, ...pick(p, 20)]), tones: uniq([...DEFAULT_POOL.tones, ...pick(tones, 12)]), skills: uniq([...DEFAULT_POOL.skills, ...pick(sk, 24)]), rules: uniq([...DEFAULT_POOL.rules, ...pick(rl, 24)]), toolSuggestions: uniq([...DEFAULT_POOL.toolSuggestions, ...pick(tl, 24)]) }; }
function normalizeCatalog(raw) { const map = {}, cs = Array.isArray(raw?.categories) ? raw.categories : [], ps = Array.isArray(raw?.presets) ? raw.presets : []; for (const c of cs) map[c.id] = { id: c.id, name: c.name || c.id, description: c.description || "", presets: [], optionPool: null }; for (const p of ps) { if (!map[p.categoryId]) map[p.categoryId] = { id: p.categoryId, name: p.categoryId, description: "", presets: [], optionPool: null }; map[p.categoryId].presets.push(p); } const categories = Object.values(map).sort((a, b) => a.name.localeCompare(b.name, "en")); for (const c of categories) { c.presets.sort((a, b) => (a.name || "").localeCompare(b.name || "", "en")); c.optionPool = buildPool(c, false); } const all = categories.flatMap((x) => x.presets), custom = { id: "custom-all", name: "Custom (All Options)", description: "No category restrictions; show all options.", presets: [{ id: "__custom_none__", name: "Custom only (仅自定义，不套模板)", description: "Keep current config and only use manual selections.", source: { url: "" }, config: null }, ...all], optionPool: buildPool({ presets: all }, true) }; categories.unshift(custom); map[custom.id] = custom; return { categories, map }; }
function selCategory() { return state.catalog.map[n.category.value] || null; }
function selPreset() { const c = selCategory(); return c ? (c.presets.find((x) => x.id === n.preset.value) || null) : null; }
function catLabel(c) {
  const en = normalizeEn((c.id || "").replace(/-/g, " "));
  const zh = hasZh(c.name || "") ? String(c.name) : toZhGuess(en);
  return `${en} (${zh})`;
}
function presetLabel(p) {
  if (p?.id === "__custom_none__") return "Custom only (\u4ec5\u81ea\u5b9a\u4e49\uff0c\u4e0d\u5957\u6a21\u677f)";
  return label(p?.name || "");
}
function renderPresetDetails() { const c = selCategory(), p = selPreset(); n.presetDesc.textContent = [c?.description || "", p?.description || ""].filter(Boolean).join(" | "); if (p?.source?.url) { n.presetSource.href = p.source.url; n.presetSource.style.display = "inline-block"; } else n.presetSource.style.display = "none"; }
function renderPresetList() { const c = selCategory(); n.preset.innerHTML = ""; if (!c) { renderPresetDetails(); return; } for (const p of c.presets) { const op = document.createElement("option"); op.value = p.id; op.textContent = presetLabel(p); n.preset.appendChild(op); } renderPool(c.optionPool || state.pool, true); renderPresetDetails(); }
function initCatalog(raw) { state.catalog = normalizeCatalog(raw); n.category.innerHTML = ""; for (const c of state.catalog.categories) { const op = document.createElement("option"); op.value = c.id; op.textContent = `${catLabel(c)} (${c.presets.length})`; n.category.appendChild(op); } renderPresetList(); }
async function loadCatalog() { const resp = await fetch(`./data/preset-catalog.json?v=${Date.now()}`, { cache: "no-store" }); if (!resp.ok) throw new Error(`catalog ${resp.status}`); return JSON.parse((await resp.text()).replace(/^\uFEFF/, "")); }

function bind() {
  document.addEventListener("input", (e) => { if (e.target && e.target.matches("input, select, textarea")) render(); });
  document.addEventListener("change", (e) => { if (e.target && e.target.matches("input, select, textarea")) render(); });
  if (n.exportZip) n.exportZip.onclick = exportZip;
  if (n.exportJson) n.exportJson.onclick = exportJson;
  if (n.importBtn && n.importFile) {
    n.importBtn.onclick = () => n.importFile.click();
    n.importFile.onchange = importFiles;
  }
  if (n.backupNowBtn) n.backupNowBtn.onclick = createBackupNow;
  if (n.refreshBackupsBtn) n.refreshBackupsBtn.onclick = refreshBackupVersions;
  if (n.restoreBackupBtn) n.restoreBackupBtn.onclick = restoreSelectedBackup;
  if (n.restartGatewayBtn) n.restartGatewayBtn.onclick = restartGateway;
  if (n.category) n.category.onchange = renderPresetList;
  if (n.preset) n.preset.onchange = renderPresetDetails;
  n.personalitySearch?.addEventListener("input", () => renderExtra("personality"));
  n.skillsSearch?.addEventListener("input", () => renderExtra("skills"));
  n.rulesSearch?.addEventListener("input", () => renderExtra("rules"));
  n.toolSuggestSearch?.addEventListener("input", () => renderExtra("toolSuggest"));
  if (n.applyPreset) n.applyPreset.onclick = () => { const p = selPreset(); if (!p?.config) return; applyConfig(p.config); render(); setStatus(t("presetApplied", { name: presetLabel(p) })); };

  if (n.quickEditor) {
    n.quickEditor.addEventListener("focus", () => { promptBackupBeforeEdit(); });
    n.quickEditor.addEventListener("input", () => updateWorkspaceContent("quick"));
  }
  if (n.manualEditor) {
    n.manualEditor.addEventListener("focus", () => { promptBackupBeforeEdit(); });
    n.manualEditor.addEventListener("input", () => updateWorkspaceContent("manual"));
  }
  if (n.quickSaveBtn) n.quickSaveBtn.onclick = saveActiveWorkspaceFile;
  if (n.manualSaveBtn) n.manualSaveBtn.onclick = saveActiveWorkspaceFile;
  if (n.backupNameInput) {
    n.backupNameInput.addEventListener("input", () => {
      if (n.backupNameInput.value.trim()) n.backupNameInput.dataset.lockedByUser = "1";
      else delete n.backupNameInput.dataset.lockedByUser;
    });
  }
}

async function bootstrap() {
  applyStaticText();
  ensureBackupName();
  renderPool(DEFAULT_POOL, false);
  bind();
  render();
  await refreshBackupVersions();
  try {
    await syncFromWorkspace("workspace synced");
  } catch (e) {
    console.warn("workspace sync skipped:", e);
  }
  try {
    const catalog = await loadCatalog();
    initCatalog(catalog);
    setStatus(t("ready", { n: Array.isArray(catalog.presets) ? catalog.presets.length : 0 }));
  } catch (e) {
    console.error(e);
    setStatus(t("catalogFailed"));
  }
}

bootstrap();
