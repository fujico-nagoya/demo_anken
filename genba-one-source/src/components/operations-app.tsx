"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import clsx from "clsx";
import {
  BarChart3,
  Building2,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardList,
  Coins,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Gauge,
  Home,
  Import,
  LockKeyhole,
  Plus,
  Printer,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cloneInitialData } from "@/lib/sample-data";
import {
  appendMissingCustomers,
  mergeCustomerLists,
  normalizeCustomerName,
  parseFujikoCustomerRows,
  type SpreadsheetRow,
} from "@/lib/customer-csv";
import {
  calculateMetrics,
  canEditAccounting,
  canManageProjects,
  compactYen,
  costCategoryLabel,
  dateTimeLabel,
  invoiceBalance,
  invoiceStatusLabel,
  projectProfitRows,
  projectStatusLabel,
  roleLabel,
  toCsv,
  yen,
} from "@/lib/metrics";
import type {
  AppData,
  CatalogItem,
  CatalogKind,
  CostCategory,
  CostEntry,
  Customer,
  DailyReport,
  Estimate,
  EstimateItem,
  FileKind,
  Invoice,
  MediaFile,
  Project,
  ProjectStatus,
} from "@/lib/types";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH?.replace(/\/$/, "") ?? "";
const publicPath = (path: `/${string}`) => `${basePath}${path}`;

type View =
  | "newProject"
  | "dashboard"
  | "customers"
  | "projects"
  | "schedule"
  | "reports"
  | "files"
  | "billing"
  | "profit"
  | "imports"
  | "settings";

type ProjectForm = {
  customerSearch: string;
  siteName: string;
  constructionName: string;
  constructionCategory: string;
  estimateRequestDate: string;
  primeContractorName: string;
  clientContactName: string;
  siteAddress: string;
  receptionStaff: string;
  surveyStaff: string;
  estimateStaff: string;
  inquiryType: string;
  memo: string;
  customerId: string;
};

type ProjectEditForm = {
  customerSearch: string;
  customerId: string;
  estimateRequestDate: string;
  ordererCategory: string;
  completionDate: string;
  status: ProjectStatus;
  progress: string;
  siteName: string;
  constructionName: string;
  constructionCategory: string;
  primeContractorName: string;
  clientContactName: string;
  receptionStaff: string;
  surveyStaff: string;
  estimateStaff: string;
  inquiryType: string;
  siteAddress: string;
  contractAmount: string;
  estimatedCost: string;
  memo: string;
};

type CustomerForm = {
  id?: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  paymentTerm: string;
  notes: string;
};

type ReportForm = {
  projectId: string;
  date: string;
  weather: string;
  workers: string;
  workHours: string;
  summary: string;
  safetyNotes: string;
};

type CostForm = {
  projectId: string;
  date: string;
  category: CostCategory;
  vendor: string;
  description: string;
  amount: string;
};

type PaymentForm = {
  invoiceId: string;
  amount: string;
  date: string;
  memo: string;
};

type EstimateDraftItem = {
  id: string;
  catalogItemId: string;
  quantity: string;
};

type EstimatePickerForm = {
  catalogItemId: string;
  quantity: string;
};

type CatalogForm = {
  kind: CatalogKind;
  category: string;
  name: string;
  unit: string;
  unitPrice: string;
  costPrice: string;
  notes: string;
};

const storageKey = "genba-one-data-v1";

const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" });

const constructionCategories = [
  "改修工事",
  "調査工",
  "配管洗浄",
  "その他",
  "新築工事",
  "改装工事",
  "下水切替",
  "直結化工事",
  "申請手続き",
  "CADトレース",
  "設備設計",
  "未確定",
];

const primeContractorCandidates = [
  "株式会社第一住建 メンテナンス事業部",
  "太田産業株式会社",
  "積村ビル管理株式会社分譲管理事業部",
  "積村ビル管理株式会社ﾒﾝﾃﾅﾝｽｾﾝﾀｰ",
  "積村ビル管理株式会社BM事業部",
  "葵建設株式会社",
  "株式会社ナガワ 名古屋支店",
  "宝建設株式会社",
  "株式会社サンリツホーム",
  "株式会社ナガワ 岐阜営業所",
  "株式会社 ナガワ 安城営業所",
  "株式会社 長谷工リフォーム",
  "ライノセラス総業株式会社",
  "株式会社ナナイロ",
  "株式会社ライフDesign",
  "株式会社カナイワ",
  "株式会社塗Ｍ",
  "株式会社 松の木住建",
  "株式会社システック",
  "株式会社NextInnovation",
  "サンリメンテ株式会社",
  "株式会社ソーア",
  "株式会社オアシスソリューション",
  "株式会社ナガワ 三重営業所",
  "宝コミュニティサービス株式会社",
  "株式会社 木村工務店",
  "日本設備工業株式会社名古屋支店",
  "鹿島建物総合管理株式会社",
  "プラミング設備合同会社",
  "八神建築株式会社",
  "株式会社ZenCraft",
  "ＭＳサービス",
  "三隆工業株式会社",
  "株式会社軸輝（シンギ）",
  "株式会社日栄工務店",
  "株式会社ｱｲｺｰﾋﾞﾙｻｰﾋﾞｽ名古屋支店",
  "株式会社新晃産業",
  "積和不動産中部株式会社MASTリフォーム事業部",
];

const staffOptions = ["社長", "智明", "玉木", "大無田", "小園", "和田", "山田", "副田", "水谷"];

const inquiryTypes = ["メール", "電話", "HP", "来社", "その他"];
const ordererCategories = ["工事業者", "管理会社", "直請", "その他", "未設定"];
const editableProjectStatuses: ProjectStatus[] = [
  "planning",
  "estimating",
  "contracted",
  "in_progress",
  "inspection",
  "completed",
  "on_hold",
];

const navItems: {
  id: View;
  label: string;
  mobileLabel?: string;
  icon: typeof Home;
  mobile: boolean;
}[] = [
  { id: "newProject", label: "新規案件登録", mobileLabel: "新規", icon: Plus, mobile: true },
  { id: "projects", label: "案件管理", mobileLabel: "案件", icon: Building2, mobile: true },
  { id: "dashboard", label: "ダッシュボード", mobileLabel: "ダッシュ", icon: Home, mobile: true },
  { id: "customers", label: "顧客マスタ", mobileLabel: "顧客", icon: Users, mobile: true },
  { id: "schedule", label: "予定", icon: CalendarDays, mobile: true },
  { id: "reports", label: "日報", icon: ClipboardList, mobile: true },
  { id: "files", label: "写真/図面", icon: Camera, mobile: false },
  { id: "billing", label: "見積/請求", icon: ReceiptText, mobile: false },
  { id: "profit", label: "原価/粗利", icon: BarChart3, mobile: false },
  { id: "imports", label: "取込/出力", icon: Import, mobile: false },
  { id: "settings", label: "設定/監査", icon: Settings, mobile: false },
];

const defaultProjectForm = (data: AppData): ProjectForm => ({
  customerSearch: data.customers[0]?.name ?? "",
  siteName: "",
  constructionName: "",
  constructionCategory: "未確定",
  estimateRequestDate: today,
  primeContractorName: data.customers[0]?.name ?? "",
  clientContactName: data.customers[0]?.contact ?? "",
  siteAddress: data.customers[0]?.address ?? "",
  receptionStaff: "",
  surveyStaff: "",
  estimateStaff: "",
  inquiryType: "メール",
  memo: "",
  customerId: data.customers[0]?.id ?? "",
});

const defaultCustomerForm: CustomerForm = {
  name: "",
  contact: "",
  phone: "",
  email: "",
  address: "",
  paymentTerm: "未設定",
  notes: "",
};

const defaultCatalogForm: CatalogForm = {
  kind: "material",
  category: "",
  name: "",
  unit: "個",
  unitPrice: "",
  costPrice: "",
  notes: "",
};

const createAudit = (userId: string, summary: string, target: string, action = "create") => ({
  id: `audit-${crypto.randomUUID()}`,
  action: action as "create" | "update" | "delete" | "export" | "import",
  target,
  userId,
  at: new Date().toISOString(),
  summary,
});

const parseAmount = (value: string) => Number(value.replaceAll(",", "")) || 0;

const generateProjectCode = (projects: Project[]) => {
  const existingCodes = new Set(projects.map((project) => project.code));
  for (let index = 0; index < 100; index += 1) {
    const code = String(Math.floor(10000000 + Math.random() * 90000000));
    if (!existingCodes.has(code)) return code;
  }
  return String(Date.now()).slice(-8);
};

const addDays = (date: string, days: number) => {
  const target = new Date(`${date}T00:00:00+09:00`);
  target.setDate(target.getDate() + days);
  return target.toISOString().slice(0, 10);
};

const customerOrdererCategory = (customer?: Customer) => {
  if (!customer) return "未設定";
  const match = customer.notes.match(/分類:\s*([^\n/]+)/);
  const category = match?.[1]?.trim();
  return category && ordererCategories.includes(category) ? category : "未設定";
};

const completionMonthLabel = (date?: string) => {
  if (!date) return "";
  const month = Number(date.slice(5, 7));
  return Number.isFinite(month) && month > 0 ? String(month) : "";
};

const sheetProgressLabel = (project: Project) => {
  if (project.status === "planning") return "見積提出待ち";
  if (project.status === "estimating") return "見積提出済";
  if (project.status === "contracted") return "受注(日程調整待ち)";
  if (project.status === "in_progress") return "受注（仕掛り）";
  if (project.status === "inspection") return "請求書作成待ち";
  if (project.status === "completed") return project.paidAmount >= project.contractAmount ? "完了（入金済）" : "完了";
  return "取り消し";
};

const ordererToneClass = (category: string) => {
  if (category === "工事業者") return "orderer-contractor";
  if (category === "管理会社") return "orderer-manager";
  if (category === "直請") return "orderer-direct";
  return "orderer-other";
};

const projectToEditForm = (project: Project, customer?: Customer): ProjectEditForm => ({
  customerSearch: customer?.name ?? project.primeContractorName ?? "",
  customerId: project.customerId,
  estimateRequestDate: project.estimateRequestDate ?? project.startDate,
  ordererCategory: project.ordererCategory ?? customerOrdererCategory(customer),
  completionDate: project.completionDate ?? (project.status === "completed" ? project.endDate : ""),
  status: project.status,
  progress: String(project.progress),
  siteName: project.siteName ?? "",
  constructionName: project.name,
  constructionCategory: project.type,
  primeContractorName: project.primeContractorName ?? customer?.name ?? "",
  clientContactName: project.clientContactName ?? customer?.contact ?? "",
  receptionStaff: project.receptionStaff ?? "",
  surveyStaff: project.surveyStaff ?? "",
  estimateStaff: project.estimateStaff ?? "",
  inquiryType: project.inquiryType ?? "メール",
  siteAddress: project.siteAddress ?? customer?.address ?? "",
  contractAmount: project.contractAmount ? String(project.contractAmount) : "",
  estimatedCost: project.estimatedCost ? String(project.estimatedCost) : "",
  memo: project.memo ?? "",
});

const customerSearchKey = (value: string) =>
  normalizeCustomerName(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/株式会社|有限会社|合同会社|㈱|（株）|社会福祉法人|管理組合法人/g, "")
    .replace(/[^0-9a-zぁ-んァ-ン一-龠々ー]/g, "");

const findExactCustomer = (value: string, customers: Customer[]) => {
  const normalized = normalizeCustomerName(value);
  const key = customerSearchKey(value);
  return customers.find(
    (customer) => normalizeCustomerName(customer.name) === normalized || customerSearchKey(customer.name) === key,
  );
};

const filterCustomerCandidates = (value: string, customers: Customer[]) => {
  const key = customerSearchKey(value);
  if (!key) return [];

  return customers
    .map((customer) => {
      const nameKey = customerSearchKey(customer.name);
      const detailKey = customerSearchKey(`${customer.contact} ${customer.address} ${customer.phone}`);
      const score = nameKey === key ? 100 : nameKey.startsWith(key) ? 80 : nameKey.includes(key) ? 60 : detailKey.includes(key) ? 30 : 0;
      return { customer, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.customer.name.localeCompare(b.customer.name, "ja"))
    .slice(0, 8)
    .map((item) => item.customer);
};

const mergeSavedData = (saved: Partial<AppData>): AppData => {
  const base = cloneInitialData();
  return {
    ...base,
    ...saved,
    company: { ...base.company, ...saved.company },
    users: saved.users ?? base.users,
    customers: mergeCustomerLists(base.customers, saved.customers),
    sites: saved.sites ?? base.sites,
    projects: saved.projects ?? base.projects,
    schedules: saved.schedules ?? base.schedules,
    reports: saved.reports ?? base.reports,
    files: saved.files ?? base.files,
    estimates: saved.estimates ?? base.estimates,
    costs: saved.costs ?? base.costs,
    invoices: saved.invoices ?? base.invoices,
    payments: saved.payments ?? base.payments,
    auditLogs: saved.auditLogs ?? base.auditLogs,
    catalogItems: saved.catalogItems ?? base.catalogItems,
  };
};

const catalogKindLabel: Record<CatalogKind, string> = {
  material: "材料",
  fixed_cost: "固定費",
  labor: "労務",
  subcontract: "外注",
  other: "その他",
};

const fileKindLabel: Record<FileKind, string> = {
  photo: "写真",
  drawing: "図面",
  document: "書類",
  invoice: "請求",
  other: "その他",
};

const downloadText = (filename: string, content: string, type = "text/csv;charset=utf-8") => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const printDocument = (title: string, body: string) => {
  const printWindow = window.open("", "_blank", "width=960,height=720");
  if (!printWindow) return;
  printWindow.document.write(`
    <!doctype html>
    <html lang="ja">
      <head>
        <title>${title}</title>
        <style>
          body { font-family: "Yu Gothic", "Meiryo", sans-serif; color: #1f2937; padding: 32px; }
          h1 { font-size: 24px; margin: 0 0 24px; }
          h2 { font-size: 16px; margin: 24px 0 8px; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; font-size: 12px; }
          th { background: #f3f4f6; }
          .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; font-size: 13px; }
          .total { font-size: 20px; font-weight: 700; text-align: right; margin-top: 16px; }
          .seal { border: 2px solid #c2410c; color: #c2410c; width: 72px; height: 72px; display: grid; place-items: center; border-radius: 999px; margin-left: auto; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        ${body}
        <script>window.print()</script>
      </body>
    </html>
  `);
  printWindow.document.close();
};

export function OperationsApp() {
  const [data, setData] = useState<AppData>(() => cloneInitialData());
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [activeView, setActiveView] = useState<View>("dashboard");
  const [query, setQuery] = useState("");
  const [currentUserId, setCurrentUserId] = useState("u-admin");
  const [selectedProjectId, setSelectedProjectId] = useState("p-001");
  const [projectEditForm, setProjectEditForm] = useState<ProjectEditForm>(() => {
    const initial = cloneInitialData();
    return projectToEditForm(initial.projects[0]!, initial.customers[0]);
  });
  const [projectForm, setProjectForm] = useState<ProjectForm>(() => defaultProjectForm(cloneInitialData()));
  const [selectedCustomerId, setSelectedCustomerId] = useState("c-001");
  const [customerForm, setCustomerForm] = useState<CustomerForm>(() => {
    const customer = cloneInitialData().customers[0];
    return customer ? { ...customer } : defaultCustomerForm;
  });
  const [estimatePicker, setEstimatePicker] = useState<EstimatePickerForm>({
    catalogItemId: cloneInitialData().catalogItems[0]?.id ?? "",
    quantity: "1",
  });
  const [estimateDraftItems, setEstimateDraftItems] = useState<EstimateDraftItem[]>([]);
  const [catalogForm, setCatalogForm] = useState<CatalogForm>(defaultCatalogForm);
  const [reportForm, setReportForm] = useState<ReportForm>({
    projectId: "p-001",
    date: today,
    weather: "晴れ",
    workers: "3",
    workHours: "21",
    summary: "",
    safetyNotes: "",
  });
  const [costForm, setCostForm] = useState<CostForm>({
    projectId: "p-001",
    date: today,
    category: "material",
    vendor: "",
    description: "",
    amount: "",
  });
  const [paymentForm, setPaymentForm] = useState<PaymentForm>({
    invoiceId: "inv-001",
    amount: "",
    date: today,
    memo: "入金確認",
  });
  const [importRows, setImportRows] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) {
      window.requestAnimationFrame(() => setIsStorageReady(true));
      return;
    }
    window.requestAnimationFrame(() => {
      setData(mergeSavedData(JSON.parse(saved) as Partial<AppData>));
      setIsStorageReady(true);
    });
  }, []);

  useEffect(() => {
    if (!isStorageReady) return;
    window.localStorage.setItem(storageKey, JSON.stringify(data));
  }, [data, isStorageReady]);

  useEffect(() => {
    if (!isStorageReady) return;

    let isCancelled = false;

    const loadFujikoCustomers = async () => {
      try {
        const response = await fetch(publicPath("/data/fujiko-customers.csv"), { cache: "force-cache" });
        if (!response.ok) return;

        const csvText = await response.text();
        const workbook = XLSX.read(csvText, { type: "string", codepage: 65001 });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) return;
        const firstSheet = workbook.Sheets[firstSheetName];
        if (!firstSheet) return;

        const rows = XLSX.utils.sheet_to_json<SpreadsheetRow>(firstSheet, {
          header: 1,
          blankrows: false,
          defval: "",
        });
        const importedCustomers = parseFujikoCustomerRows(rows);
        if (isCancelled || importedCustomers.length === 0) return;

        setData((prev) => {
          const customers = appendMissingCustomers(prev.customers, importedCustomers);
          return customers === prev.customers ? prev : { ...prev, customers };
        });
      } catch (error) {
        console.warn("Failed to load seeded customer CSV", error);
      }
    };

    loadFujikoCustomers();

    return () => {
      isCancelled = true;
    };
  }, [isStorageReady]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register(publicPath("/sw.js")).catch(() => undefined);
  }, []);

  const currentUser = data.users.find((user) => user.id === currentUserId) ?? data.users[0]!;
  const currentRole = currentUser.role;
  const metrics = useMemo(() => calculateMetrics(data), [data]);
  const profitRows = useMemo(() => projectProfitRows(data), [data]);

  const customersById = useMemo(
    () => new Map(data.customers.map((customer) => [customer.id, customer])),
    [data.customers],
  );
  const selectedCustomer = customersById.get(selectedCustomerId);
  const usersById = useMemo(() => new Map(data.users.map((user) => [user.id, user])), [data.users]);
  const projectsById = useMemo(
    () => new Map(data.projects.map((project) => [project.id, project])),
    [data.projects],
  );
  const catalogById = useMemo(
    () => new Map(data.catalogItems.map((item) => [item.id, item])),
    [data.catalogItems],
  );

  const selectedProject = projectsById.get(selectedProjectId) ?? data.projects[0];
  const selectedProjectEstimates = data.estimates.filter((estimate) => estimate.projectId === selectedProject?.id);
  useEffect(() => {
    const project = data.projects.find((item) => item.id === selectedProjectId);
    if (!project) return;
    const customer = data.customers.find((item) => item.id === project.customerId);
    window.requestAnimationFrame(() => setProjectEditForm(projectToEditForm(project, customer)));
  }, [data.customers, data.projects, selectedProjectId]);

  const estimateDraftRows = estimateDraftItems
    .map((draft) => {
      const catalogItem = catalogById.get(draft.catalogItemId);
      const quantity = Number(draft.quantity) || 0;
      return catalogItem
        ? {
            ...draft,
            catalogItem,
            quantity,
            amount: quantity * catalogItem.unitPrice,
          }
        : null;
    })
    .filter(Boolean) as {
      id: string;
      catalogItemId: string;
      quantity: number;
      catalogItem: CatalogItem;
      amount: number;
    }[];
  const estimateDraftSubtotal = estimateDraftRows.reduce((sum, row) => sum + row.amount, 0);
  const estimateDraftTax = Math.round(estimateDraftSubtotal * data.company.taxRate);
  const estimateDraftTotal = estimateDraftSubtotal + estimateDraftTax;
  const filteredProjects = data.projects.filter((project) => {
    const customer = customersById.get(project.customerId)?.name ?? "";
    const haystack = `${project.code} ${project.name} ${customer} ${project.siteName ?? ""} ${project.primeContractorName ?? ""} ${project.clientContactName ?? ""} ${project.ordererCategory ?? ""} ${sheetProgressLabel(project)} ${project.tags.join(" ")}`;
    return haystack.toLowerCase().includes(query.toLowerCase());
  });

  const visibleSchedules = data.schedules
    .filter((schedule) => schedule.start.slice(0, 10) >= today)
    .sort((a, b) => a.start.localeCompare(b.start));

  const projectCustomerCandidates = useMemo(
    () => filterCustomerCandidates(projectForm.customerSearch, data.customers),
    [data.customers, projectForm.customerSearch],
  );
  const editCustomerCandidates = useMemo(
    () => filterCustomerCandidates(projectEditForm.customerSearch, data.customers),
    [data.customers, projectEditForm.customerSearch],
  );

  const fillNewProjectCustomer = (customer: Customer) => {
    const customerSite = data.sites.find((site) => site.customerId === customer.id);
    setProjectForm((prev) => ({
      ...prev,
      customerId: customer.id,
      customerSearch: customer.name,
      primeContractorName: customer.name,
      clientContactName: customer.contact,
      siteAddress: customerSite?.address ?? customer.address ?? prev.siteAddress,
      siteName: customerSite?.name ?? prev.siteName,
    }));
  };

  const updateNewProjectCustomerText = (value: string) => {
    const exactCustomer = findExactCustomer(value, data.customers);
    if (exactCustomer) {
      fillNewProjectCustomer(exactCustomer);
      return;
    }

    setProjectForm((prev) => ({
      ...prev,
      customerId: "",
      customerSearch: value,
      primeContractorName: value,
    }));
  };

  const fillEditProjectCustomer = (customer: Customer) => {
    setProjectEditForm((prev) => ({
      ...prev,
      customerId: customer.id,
      customerSearch: customer.name,
      ordererCategory: customerOrdererCategory(customer),
      primeContractorName: customer.name,
      clientContactName: customer.contact,
      siteAddress: customer.address || prev.siteAddress,
    }));
  };

  const updateEditProjectCustomerText = (value: string) => {
    const exactCustomer = findExactCustomer(value, data.customers);
    if (exactCustomer) {
      fillEditProjectCustomer(exactCustomer);
      return;
    }

    setProjectEditForm((prev) => ({
      ...prev,
      customerId: "",
      customerSearch: value,
      primeContractorName: value,
    }));
  };

  const openEstimatePrint = (project: Project) => {
    const estimate = data.estimates.find((item) => item.projectId === project.id);
    const customer = customersById.get(project.customerId);
    if (!estimate || !customer) return;
    const rows = estimate.items
      .map(
        (item) =>
          `<tr><td>${item.name}</td><td>${item.quantity}</td><td>${item.unit}</td><td>${yen.format(item.unitPrice)}</td><td>${yen.format(
            item.quantity * item.unitPrice,
          )}</td></tr>`,
      )
      .join("");
    printDocument(
      `見積書_${estimate.number}`,
      `<h1>見積書</h1>
      <div class="meta">
        <div>宛先: ${customer.name}</div><div>番号: ${estimate.number}</div>
        <div>案件: ${project.name}</div><div>発行日: ${estimate.issueDate}</div>
        <div>有効期限: ${estimate.validUntil}</div><div>${data.company.name}<br>${data.company.address}<br>${data.company.phone}</div>
      </div>
      <table><thead><tr><th>項目</th><th>数量</th><th>単位</th><th>単価</th><th>金額</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="total">税込合計 ${yen.format(estimate.total)}</div>
      <div class="seal">${data.company.sealLabel}</div>`,
    );
  };

  const openInvoicePrint = (invoice: Invoice) => {
    const project = projectsById.get(invoice.projectId);
    const customer = project ? customersById.get(project.customerId) : null;
    if (!project || !customer) return;
    printDocument(
      `請求書_${invoice.number}`,
      `<h1>請求書</h1>
      <div class="meta">
        <div>宛先: ${customer.name}</div><div>番号: ${invoice.number}</div>
        <div>案件: ${project.name}</div><div>発行日: ${invoice.issueDate}</div>
        <div>支払期日: ${invoice.dueDate}</div><div>${data.company.name}<br>${data.company.address}<br>${data.company.invoiceRegistrationNumber}</div>
      </div>
      <table><tbody>
        <tr><th>小計</th><td>${yen.format(invoice.subtotal)}</td></tr>
        <tr><th>消費税</th><td>${yen.format(invoice.tax)}</td></tr>
        <tr><th>税込合計</th><td>${yen.format(invoice.total)}</td></tr>
        <tr><th>入金済</th><td>${yen.format(invoice.paidAmount)}</td></tr>
        <tr><th>未収</th><td>${yen.format(invoiceBalance(invoice))}</td></tr>
      </tbody></table>
      <h2>振込先</h2>
      <p>${data.company.bank} ${data.company.branch} ${data.company.accountType} ${data.company.accountNumber}<br>${data.company.accountName}</p>
      <div class="seal">${data.company.sealLabel}</div>`,
    );
  };

  const openReportPrint = (report: DailyReport) => {
    const project = projectsById.get(report.projectId);
    const author = usersById.get(report.authorId);
    if (!project || !author) return;
    printDocument(
      `作業日報_${project.code}_${report.date}`,
      `<h1>作業日報</h1>
      <div class="meta">
        <div>案件: ${project.name}</div><div>日付: ${report.date}</div>
        <div>作成者: ${author.name}</div><div>天候: ${report.weather}</div>
        <div>人数: ${report.workers}名</div><div>工数: ${report.workHours}時間</div>
      </div>
      <h2>作業内容</h2><p>${report.summary}</p>
      <h2>安全・連絡事項</h2><p>${report.safetyNotes}</p>
      <p>写真枚数: ${report.photosCount}</p>`,
    );
  };

  const openPhotoLedgerPrint = (project: Project) => {
    const files = data.files.filter((file) => file.projectId === project.id && file.kind === "photo");
    const rows = files
      .map((file) => `<tr><td>${file.category}</td><td>${file.name}</td><td>${dateTimeLabel(file.uploadedAt)}</td></tr>`)
      .join("");
    printDocument(
      `写真台帳_${project.code}`,
      `<h1>写真台帳</h1>
      <div class="meta"><div>案件: ${project.name}</div><div>番号: ${project.code}</div></div>
      <table><thead><tr><th>区分</th><th>ファイル名</th><th>登録日時</th></tr></thead><tbody>${rows}</tbody></table>`,
    );
  };

  const submitProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canManageProjects(currentRole)) return;
    const typedCustomerName = projectForm.customerSearch.trim() || projectForm.primeContractorName.trim();
    const selectedCustomer = data.customers.find((customer) => customer.id === projectForm.customerId);
    const namedCustomer =
      findExactCustomer(typedCustomerName, data.customers) ?? findExactCustomer(projectForm.primeContractorName, data.customers);
    const existingCustomer = selectedCustomer ?? namedCustomer;
    const customer =
      existingCustomer ??
      ({
        id: `c-${crypto.randomUUID()}`,
        name: typedCustomerName || "未登録元請",
        contact: projectForm.clientContactName,
        phone: "",
        email: "",
        address: projectForm.siteAddress,
        paymentTerm: "未設定",
        notes: "案件登録時に自動追加",
      } satisfies AppData["customers"][number]);
    const site = {
      id: `s-${crypto.randomUUID()}`,
      customerId: customer.id,
      name: projectForm.siteName || projectForm.constructionName,
      address: projectForm.siteAddress,
      manager: projectForm.clientContactName,
      notes: projectForm.memo,
    } satisfies AppData["sites"][number];
    const project: Project = {
      id: `p-${crypto.randomUUID()}`,
      code: generateProjectCode(data.projects),
      customerId: customer.id,
      siteId: site.id,
      name: projectForm.constructionName,
      type: projectForm.constructionCategory,
      estimateRequestDate: projectForm.estimateRequestDate,
      ordererCategory: customerOrdererCategory(customer),
      primeContractorName: projectForm.primeContractorName || customer.name,
      clientContactName: projectForm.clientContactName,
      siteName: projectForm.siteName,
      siteAddress: projectForm.siteAddress,
      receptionStaff: projectForm.receptionStaff,
      surveyStaff: projectForm.surveyStaff,
      estimateStaff: projectForm.estimateStaff,
      inquiryType: projectForm.inquiryType,
      memo: projectForm.memo,
      status: "planning",
      priority: "normal",
      managerId: currentUser.id,
      startDate: projectForm.estimateRequestDate || today,
      endDate: addDays(projectForm.estimateRequestDate || today, 30),
      contractAmount: 0,
      estimatedCost: 0,
      billedAmount: 0,
      paidAmount: 0,
      progress: 0,
      tags: [projectForm.constructionCategory, projectForm.inquiryType, customerOrdererCategory(customer)].filter(Boolean),
    };
    setData((prev) => ({
      ...prev,
      customers: existingCustomer ? prev.customers : [customer, ...prev.customers],
      sites: [site, ...prev.sites],
      projects: [project, ...prev.projects],
      auditLogs: [
        createAudit(currentUser.id, `案件 ${project.name} / ${project.code} を登録`, `project:${project.code}`),
        ...prev.auditLogs,
      ],
    }));
    setSelectedProjectId(project.id);
    setProjectForm(defaultProjectForm(data));
    setActiveView("projects");
  };

  const submitProjectEdit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProject || projectLocked) return;

    setData((prev) => {
      const currentProject = prev.projects.find((project) => project.id === selectedProject.id);
      if (!currentProject) return prev;

      const typedCustomerName = projectEditForm.customerSearch.trim() || projectEditForm.primeContractorName.trim();
      const existingCustomer =
        prev.customers.find((item) => item.id === projectEditForm.customerId) ??
        findExactCustomer(typedCustomerName, prev.customers) ??
        findExactCustomer(projectEditForm.primeContractorName, prev.customers);
      const customer =
        existingCustomer ??
        ({
          id: `c-${crypto.randomUUID()}`,
          name: typedCustomerName || "未登録元請",
          contact: projectEditForm.clientContactName,
          phone: "",
          email: "",
          address: projectEditForm.siteAddress,
          paymentTerm: "未設定",
          notes: "案件編集時に自動追加",
        } satisfies Customer);
      const customerId = customer.id;
      const progress = Math.min(100, Math.max(0, Number(projectEditForm.progress) || 0));
      const currentSite = prev.sites.find((site) => site.id === currentProject.siteId);
      const siteId = currentSite?.id ?? `s-${crypto.randomUUID()}`;
      const updatedProject: Project = {
        ...currentProject,
        customerId,
        siteId,
        name: projectEditForm.constructionName,
        type: projectEditForm.constructionCategory,
        estimateRequestDate: projectEditForm.estimateRequestDate || undefined,
        ordererCategory: projectEditForm.ordererCategory,
        completionDate: projectEditForm.completionDate || undefined,
        status: projectEditForm.status,
        progress,
        siteName: projectEditForm.siteName,
        siteAddress: projectEditForm.siteAddress,
        primeContractorName: projectEditForm.primeContractorName || customer.name,
        clientContactName: projectEditForm.clientContactName,
        receptionStaff: projectEditForm.receptionStaff,
        surveyStaff: projectEditForm.surveyStaff,
        estimateStaff: projectEditForm.estimateStaff,
        inquiryType: projectEditForm.inquiryType,
        memo: projectEditForm.memo,
        startDate: projectEditForm.estimateRequestDate || currentProject.startDate,
        endDate: projectEditForm.completionDate || currentProject.endDate,
        contractAmount: parseAmount(projectEditForm.contractAmount),
        estimatedCost: parseAmount(projectEditForm.estimatedCost),
        tags: [projectEditForm.constructionCategory, projectEditForm.inquiryType, projectEditForm.ordererCategory].filter(
          Boolean,
        ),
      };

      const updatedSites = currentSite
        ? prev.sites.map((site) =>
            site.id === currentSite.id
              ? {
                  ...site,
                  customerId,
                  name: projectEditForm.siteName || projectEditForm.constructionName,
                  address: projectEditForm.siteAddress,
                  manager: projectEditForm.clientContactName,
                  notes: projectEditForm.memo,
                }
              : site,
          )
        : [
            {
              id: siteId,
              customerId,
              name: projectEditForm.siteName || projectEditForm.constructionName,
              address: projectEditForm.siteAddress,
              manager: projectEditForm.clientContactName,
              notes: projectEditForm.memo,
            },
            ...prev.sites,
          ];

      return {
        ...prev,
        customers: existingCustomer ? prev.customers : [customer, ...prev.customers],
        sites: updatedSites,
        projects: prev.projects.map((project) => (project.id === updatedProject.id ? updatedProject : project)),
        auditLogs: [
          createAudit(currentUser.id, `案件 ${updatedProject.code} の情報を更新`, `project:${updatedProject.code}`, "update"),
          ...prev.auditLogs,
        ],
      };
    });
  };

  const loadCustomerForm = (customerId: string) => {
    const customer = customersById.get(customerId);
    setSelectedCustomerId(customerId);
    setCustomerForm(customer ? { ...customer } : defaultCustomerForm);
  };

  const resetCustomerForm = () => {
    setSelectedCustomerId("");
    setCustomerForm(defaultCustomerForm);
  };

  const submitCustomer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized: Customer = {
      id: customerForm.id || `c-${crypto.randomUUID()}`,
      name: customerForm.name,
      contact: customerForm.contact,
      phone: customerForm.phone,
      email: customerForm.email,
      address: customerForm.address,
      paymentTerm: customerForm.paymentTerm,
      notes: customerForm.notes,
    };

    setData((prev) => {
      const exists = prev.customers.some((customer) => customer.id === normalized.id);
      return {
        ...prev,
        customers: exists
          ? prev.customers.map((customer) => (customer.id === normalized.id ? normalized : customer))
          : [normalized, ...prev.customers],
        auditLogs: [
          createAudit(
            currentUser.id,
            `顧客 ${normalized.name} を${exists ? "更新" : "登録"}`,
            `customer:${normalized.id}`,
            exists ? "update" : "create",
          ),
          ...prev.auditLogs,
        ],
      };
    });
    setSelectedCustomerId(normalized.id);
    setCustomerForm(normalized);
    setProjectForm((prev) => ({
      ...prev,
      customerId: normalized.id,
      primeContractorName: normalized.name,
      clientContactName: normalized.contact,
      siteAddress: normalized.address,
    }));
  };

  const addEstimateDraftItem = () => {
    const catalogItem = catalogById.get(estimatePicker.catalogItemId);
    if (!catalogItem) return;
    setEstimateDraftItems((prev) => [
      ...prev,
      {
        id: `draft-${crypto.randomUUID()}`,
        catalogItemId: catalogItem.id,
        quantity: estimatePicker.quantity || "1",
      },
    ]);
    setEstimatePicker((prev) => ({ ...prev, quantity: "1" }));
  };

  const removeEstimateDraftItem = (id: string) => {
    setEstimateDraftItems((prev) => prev.filter((item) => item.id !== id));
  };

  const submitEstimate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedProject || estimateDraftRows.length === 0 || projectLocked) return;

    const items: EstimateItem[] = estimateDraftRows.map((row) => ({
      id: `ei-${crypto.randomUUID()}`,
      catalogItemId: row.catalogItemId,
      name: row.catalogItem.name,
      quantity: row.quantity,
      unit: row.catalogItem.unit,
      unitPrice: row.catalogItem.unitPrice,
    }));
    const estimate: Estimate = {
      id: `e-${crypto.randomUUID()}`,
      projectId: selectedProject.id,
      number: `EST-${selectedProject.code}-${String(selectedProjectEstimates.length + 1).padStart(2, "0")}`,
      status: "draft",
      issueDate: today,
      validUntil: addDays(today, 30),
      subtotal: estimateDraftSubtotal,
      tax: estimateDraftTax,
      total: estimateDraftTotal,
      items,
    };
    const estimatedCost = estimateDraftRows.reduce(
      (sum, row) => sum + row.quantity * row.catalogItem.costPrice,
      0,
    );

    setData((prev) => ({
      ...prev,
      estimates: [estimate, ...prev.estimates],
      projects: prev.projects.map((project) =>
        project.id === selectedProject.id
          ? {
              ...project,
              estimatedCost: Math.max(project.estimatedCost, estimatedCost),
              status: project.status === "planning" ? "estimating" : project.status,
            }
          : project,
      ),
      auditLogs: [
        createAudit(currentUser.id, `見積 ${estimate.number} を作成`, `estimate:${estimate.number}`),
        ...prev.auditLogs,
      ],
    }));
    setEstimateDraftItems([]);
  };

  const submitCatalogItem = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (catalogLocked) return;

    const item: CatalogItem = {
      id: `cat-${crypto.randomUUID()}`,
      kind: catalogForm.kind,
      category: catalogForm.category || catalogKindLabel[catalogForm.kind],
      name: catalogForm.name,
      unit: catalogForm.unit || "式",
      unitPrice: parseAmount(catalogForm.unitPrice),
      costPrice: parseAmount(catalogForm.costPrice),
      notes: catalogForm.notes,
    };

    setData((prev) => ({
      ...prev,
      catalogItems: [item, ...prev.catalogItems],
      auditLogs: [createAudit(currentUser.id, `単価マスタ ${item.name} を登録`, `catalog:${item.id}`), ...prev.auditLogs],
    }));
    setEstimatePicker((prev) => ({ ...prev, catalogItemId: item.id }));
    setCatalogForm(defaultCatalogForm);
  };

  const submitReport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const report: DailyReport = {
      id: `r-${crypto.randomUUID()}`,
      projectId: reportForm.projectId,
      date: reportForm.date,
      authorId: currentUser.id,
      weather: reportForm.weather,
      workers: Number(reportForm.workers) || 0,
      workHours: Number(reportForm.workHours) || 0,
      summary: reportForm.summary,
      safetyNotes: reportForm.safetyNotes,
      photosCount: data.files.filter((file) => file.projectId === reportForm.projectId && file.kind === "photo").length,
      submittedAt: new Date().toISOString(),
    };
    setData((prev) => ({
      ...prev,
      reports: [report, ...prev.reports],
      auditLogs: [createAudit(currentUser.id, "日報を提出", `daily-report:${report.projectId}`), ...prev.auditLogs],
    }));
    setReportForm((prev) => ({ ...prev, summary: "", safetyNotes: "" }));
  };

  const submitCost = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEditAccounting(currentRole)) return;
    const cost: CostEntry = {
      id: `cost-${crypto.randomUUID()}`,
      projectId: costForm.projectId,
      date: costForm.date,
      category: costForm.category,
      vendor: costForm.vendor,
      description: costForm.description,
      amount: parseAmount(costForm.amount),
      status: "confirmed",
    };
    setData((prev) => ({
      ...prev,
      costs: [cost, ...prev.costs],
      auditLogs: [createAudit(currentUser.id, `原価 ${yen.format(cost.amount)} を登録`, `cost:${cost.projectId}`), ...prev.auditLogs],
    }));
    setCostForm((prev) => ({ ...prev, vendor: "", description: "", amount: "" }));
  };

  const submitPayment = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canEditAccounting(currentRole)) return;
    const invoice = data.invoices.find((item) => item.id === paymentForm.invoiceId);
    if (!invoice) return;
    const amount = parseAmount(paymentForm.amount) || invoiceBalance(invoice);
    setData((prev) => ({
      ...prev,
      invoices: prev.invoices.map((item) => {
        if (item.id !== invoice.id) return item;
        const paidAmount = Math.min(item.total, item.paidAmount + amount);
        return {
          ...item,
          paidAmount,
          paidDate: paymentForm.date,
          status: paidAmount >= item.total ? "paid" : "partial",
        };
      }),
      payments: [
        {
          id: `pay-${crypto.randomUUID()}`,
          invoiceId: invoice.id,
          projectId: invoice.projectId,
          date: paymentForm.date,
          amount,
          method: "bank",
          memo: paymentForm.memo,
        },
        ...prev.payments,
      ],
      auditLogs: [
        createAudit(currentUser.id, `入金 ${yen.format(amount)} を登録`, `invoice:${invoice.number}`, "update"),
        ...prev.auditLogs,
      ],
    }));
    setPaymentForm((prev) => ({ ...prev, amount: "", memo: "入金確認" }));
  };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    if (!selectedProject || selected.length === 0) return;
    const added: MediaFile[] = selected.map((file) => ({
      id: `f-${crypto.randomUUID()}`,
      projectId: selectedProject.id,
      name: file.name,
      kind: file.type.startsWith("image/") ? "photo" : file.name.endsWith(".pdf") ? "drawing" : "document",
      category: file.type.startsWith("image/") ? "現場写真" : "添付",
      uploaderId: currentUser.id,
      uploadedAt: new Date().toISOString(),
      size: file.size,
      path: `/storage/${selectedProject.id}/${file.name}`,
    }));
    setData((prev) => ({
      ...prev,
      files: [...added, ...prev.files],
      auditLogs: [
        createAudit(currentUser.id, `${added.length}件のファイルを登録`, `project:${selectedProject.code}`),
        ...prev.auditLogs,
      ],
    }));
    event.target.value = "";
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    setImportRows(XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: "" }).slice(0, 20));
  };

  const applyImportAsProjects = () => {
    if (importRows.length === 0 || !canManageProjects(currentRole)) return;
    const added = importRows.map((row, index) => {
      const customer = data.customers.find((item) => item.name === row.customer) ?? data.customers[0];
      const site = data.sites.find((item) => item.customerId === customer.id) ?? data.sites[0];
      return {
        id: `p-import-${crypto.randomUUID()}`,
        code: String(row.code || `IMP-${index + 1}`),
        customerId: customer.id,
        siteId: site.id,
        name: String(row.name || `取込案件 ${index + 1}`),
        type: String(row.type || "設備"),
        status: "planning",
        priority: "normal",
        managerId: currentUser.id,
        startDate: String(row.startDate || today),
        endDate: String(row.endDate || today),
        contractAmount: Number(row.contractAmount) || 0,
        estimatedCost: Number(row.estimatedCost) || 0,
        billedAmount: 0,
        paidAmount: 0,
        progress: 0,
        tags: ["取込"],
      } satisfies Project;
    });
    setData((prev) => ({
      ...prev,
      projects: [...added, ...prev.projects],
      auditLogs: [createAudit(currentUser.id, `${added.length}件の案件を取り込み`, "imports:projects", "import"), ...prev.auditLogs],
    }));
    setImportRows([]);
  };

  const exportCsv = (name: string, rows: Record<string, unknown>[]) => {
    downloadText(`${name}.csv`, toCsv(rows));
    setData((prev) => ({
      ...prev,
      auditLogs: [createAudit(currentUser.id, `${name}.csv を出力`, `export:${name}`, "export"), ...prev.auditLogs],
    }));
  };

  const accountingLocked = !canEditAccounting(currentRole);
  const projectLocked = !canManageProjects(currentRole);
  const catalogLocked = currentRole === "field_staff";
  const selectedCustomerForForm = customersById.get(projectForm.customerId) ?? findExactCustomer(projectForm.customerSearch, data.customers);
  const selectedProjectEditCustomer =
    customersById.get(projectEditForm.customerId) ?? findExactCustomer(projectEditForm.customerSearch, data.customers);
  const sharedProjectDatalists = (
    <>
      <datalist id="construction-category-options">
        {constructionCategories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
      <datalist id="staff-options">
        {staffOptions.map((staff) => (
          <option key={staff} value={staff} />
        ))}
      </datalist>
      <datalist id="inquiry-type-options">
        {inquiryTypes.map((type) => (
          <option key={type} value={type} />
        ))}
      </datalist>
      <datalist id="orderer-category-options">
        {ordererCategories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
    </>
  );

  const projectRegistrationPanel = (
    <Panel title="新規案件登録" icon={Plus}>
      <form className="form-stack" onSubmit={submitProject}>
        <div className="grid gap-3 lg:grid-cols-[1fr_1.2fr]">
          <label className="field-label">
            顧客マスタ / 顧客名
            <input
              list="new-project-customer-options"
              value={projectForm.customerSearch}
              onChange={(event) => updateNewProjectCustomerText(event.target.value)}
              placeholder="例: ナガワ"
              required
            />
            <datalist id="new-project-customer-options">
              {data.customers.map((customer) => (
                <option key={customer.id} value={customer.name} />
              ))}
            </datalist>
            <CustomerCandidateList
              customers={projectCustomerCandidates}
              query={projectForm.customerSearch}
              onSelect={fillNewProjectCustomer}
            />
          </label>
          <div className="customer-master-preview">
            <p className="font-semibold">{selectedCustomerForForm?.name ?? "顧客未選択"}</p>
            <p>{selectedCustomerForForm?.contact || "担当者未設定"}</p>
            <p>{selectedCustomerForForm?.address || "住所未設定"}</p>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <label className="field-label">
            現場名
            <input
              value={projectForm.siteName}
              onChange={(event) => setProjectForm({ ...projectForm, siteName: event.target.value })}
              placeholder="例: 日本橋中央ビル 5F"
              required
            />
          </label>
          <label className="field-label">
            工事名
            <input
              value={projectForm.constructionName}
              onChange={(event) => setProjectForm({ ...projectForm, constructionName: event.target.value })}
              placeholder="例: 空調更新工事"
              required
            />
          </label>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <label className="field-label">
            工事カテゴリ
            <input
              list="construction-category-options"
              value={projectForm.constructionCategory}
              onChange={(event) => setProjectForm({ ...projectForm, constructionCategory: event.target.value })}
              placeholder="例: 改修工事"
              required
            />
          </label>
          <label className="field-label">
            見積依頼日
            <input
              type="date"
              value={projectForm.estimateRequestDate}
              onChange={(event) => setProjectForm({ ...projectForm, estimateRequestDate: event.target.value })}
            />
          </label>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <label className="field-label">
            元請名
            <input
              list="prime-contractors"
              value={projectForm.primeContractorName}
              onChange={(event) => setProjectForm({ ...projectForm, primeContractorName: event.target.value })}
              placeholder="顧客マスタまたはフォーム候補から入力"
              required
            />
            <datalist id="prime-contractors">
              {[...data.customers.map((customer) => customer.name), ...primeContractorCandidates].map((name, index) => (
                <option key={`${name}-${index}`} value={name} />
              ))}
            </datalist>
          </label>
          <label className="field-label">
            先方担当者名
            <input
              value={projectForm.clientContactName}
              onChange={(event) => setProjectForm({ ...projectForm, clientContactName: event.target.value })}
              placeholder="例: 山本 様"
            />
          </label>
        </div>

        <label className="field-label">
          現場住所
          <input
            value={projectForm.siteAddress}
            onChange={(event) => setProjectForm({ ...projectForm, siteAddress: event.target.value })}
            placeholder="都道府県から入力"
            required
          />
        </label>

        <div className="grid gap-2 md:grid-cols-3">
          <label className="field-label">
            受付担当
            <input
              list="staff-options"
              value={projectForm.receptionStaff}
              onChange={(event) => setProjectForm({ ...projectForm, receptionStaff: event.target.value })}
              placeholder="未定"
            />
          </label>
          <label className="field-label">
            調査担当
            <input
              list="staff-options"
              value={projectForm.surveyStaff}
              onChange={(event) => setProjectForm({ ...projectForm, surveyStaff: event.target.value })}
              placeholder="未定"
            />
          </label>
          <label className="field-label">
            見積担当
            <input
              list="staff-options"
              value={projectForm.estimateStaff}
              onChange={(event) => setProjectForm({ ...projectForm, estimateStaff: event.target.value })}
              placeholder="未定"
            />
          </label>
        </div>

        <div className="grid gap-2 md:grid-cols-[220px_1fr]">
          <label className="field-label">
            お問い合わせ種別
            <input
              list="inquiry-type-options"
              value={projectForm.inquiryType}
              onChange={(event) => setProjectForm({ ...projectForm, inquiryType: event.target.value })}
              placeholder="例: 電話"
            />
          </label>
          <label className="field-label">
            メモ・電話番号等
            <textarea
              value={projectForm.memo}
              onChange={(event) => setProjectForm({ ...projectForm, memo: event.target.value })}
              placeholder="電話番号、注意事項、依頼背景など"
            />
          </label>
        </div>

        <button className="primary-button" type="submit" disabled={projectLocked}>
          {projectLocked ? <LockKeyhole size={16} /> : <Plus size={16} />} 8桁番号で登録
        </button>
      </form>
    </Panel>
  );

  const selectedProjectTools = (
    <div className="min-w-0 space-y-5">
      <Panel title="案件情報編集" icon={Building2}>
        {selectedProject ? (
          <form className="form-stack" onSubmit={submitProjectEdit}>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="field-label">
                案件番号
                <input value={selectedProject.code} readOnly />
              </label>
              <label className="field-label">
                顧客マスタ / 顧客名
                <input
                  list="edit-project-customer-options"
                  value={projectEditForm.customerSearch}
                  onChange={(event) => updateEditProjectCustomerText(event.target.value)}
                  placeholder="例: ナガワ"
                />
                <datalist id="edit-project-customer-options">
                  {data.customers.map((customer) => (
                    <option key={customer.id} value={customer.name} />
                  ))}
                </datalist>
                <CustomerCandidateList
                  customers={editCustomerCandidates}
                  query={projectEditForm.customerSearch}
                  onSelect={fillEditProjectCustomer}
                />
              </label>
            </div>

            <div className="customer-master-preview">
              <p className="font-semibold">{selectedProjectEditCustomer?.name ?? "顧客未選択"}</p>
              <p>{selectedProjectEditCustomer?.contact || "担当者未設定"}</p>
              <p>{selectedProjectEditCustomer?.address || "住所未設定"}</p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="field-label">
                見積依頼日
                <input
                  type="date"
                  value={projectEditForm.estimateRequestDate}
                  onChange={(event) => setProjectEditForm({ ...projectEditForm, estimateRequestDate: event.target.value })}
                />
              </label>
              <label className="field-label">
                発注者分類
                <input
                  list="orderer-category-options"
                  value={projectEditForm.ordererCategory}
                  onChange={(event) => setProjectEditForm({ ...projectEditForm, ordererCategory: event.target.value })}
                  placeholder="例: 工事業者"
                />
              </label>
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_96px]">
              <label className="field-label">
                完了日
                <input
                  type="date"
                  value={projectEditForm.completionDate}
                  onChange={(event) => setProjectEditForm({ ...projectEditForm, completionDate: event.target.value })}
                />
              </label>
              <label className="field-label">
                完了月
                <input value={completionMonthLabel(projectEditForm.completionDate)} readOnly />
              </label>
            </div>

            <div className="grid gap-2 sm:grid-cols-[1fr_96px]">
              <label className="field-label">
                進捗
                <select
                  value={projectEditForm.status}
                  onChange={(event) =>
                    setProjectEditForm({ ...projectEditForm, status: event.target.value as ProjectStatus })
                  }
                >
                  {editableProjectStatuses.map((status) => (
                    <option key={status} value={status}>
                      {projectStatusLabel[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field-label">
                進捗率
                <input
                  inputMode="numeric"
                  value={projectEditForm.progress}
                  onChange={(event) => setProjectEditForm({ ...projectEditForm, progress: event.target.value })}
                />
              </label>
            </div>

            <label className="field-label">
              現場名
              <input
                value={projectEditForm.siteName}
                onChange={(event) => setProjectEditForm({ ...projectEditForm, siteName: event.target.value })}
                required
              />
            </label>
            <label className="field-label">
              工事名
              <input
                value={projectEditForm.constructionName}
                onChange={(event) => setProjectEditForm({ ...projectEditForm, constructionName: event.target.value })}
                required
              />
            </label>
            <label className="field-label">
              工事カテゴリ
              <input
                list="construction-category-options"
                value={projectEditForm.constructionCategory}
                onChange={(event) => setProjectEditForm({ ...projectEditForm, constructionCategory: event.target.value })}
                placeholder="例: 改修工事"
              />
            </label>
            <label className="field-label">
              現場住所
              <input
                value={projectEditForm.siteAddress}
                onChange={(event) => setProjectEditForm({ ...projectEditForm, siteAddress: event.target.value })}
              />
            </label>

            <div className="grid gap-2 sm:grid-cols-2">
              <label className="field-label">
                元請名
                <input
                  value={projectEditForm.primeContractorName}
                  onChange={(event) => setProjectEditForm({ ...projectEditForm, primeContractorName: event.target.value })}
                />
              </label>
              <label className="field-label">
                先方担当
                <input
                  value={projectEditForm.clientContactName}
                  onChange={(event) => setProjectEditForm({ ...projectEditForm, clientContactName: event.target.value })}
                />
              </label>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <label className="field-label">
                受付担当
                <input
                  list="staff-options"
                  value={projectEditForm.receptionStaff}
                  onChange={(event) => setProjectEditForm({ ...projectEditForm, receptionStaff: event.target.value })}
                  placeholder="未定"
                />
              </label>
              <label className="field-label">
                調査担当
                <input
                  list="staff-options"
                  value={projectEditForm.surveyStaff}
                  onChange={(event) => setProjectEditForm({ ...projectEditForm, surveyStaff: event.target.value })}
                  placeholder="未定"
                />
              </label>
              <label className="field-label">
                見積担当
                <input
                  list="staff-options"
                  value={projectEditForm.estimateStaff}
                  onChange={(event) => setProjectEditForm({ ...projectEditForm, estimateStaff: event.target.value })}
                  placeholder="未定"
                />
              </label>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <label className="field-label">
                問い合わせ
                <input
                  list="inquiry-type-options"
                  value={projectEditForm.inquiryType}
                  onChange={(event) => setProjectEditForm({ ...projectEditForm, inquiryType: event.target.value })}
                  placeholder="例: 電話"
                />
              </label>
              <label className="field-label">
                契約額
                <input
                  inputMode="numeric"
                  value={projectEditForm.contractAmount}
                  onChange={(event) => setProjectEditForm({ ...projectEditForm, contractAmount: event.target.value })}
                />
              </label>
              <label className="field-label">
                予算原価
                <input
                  inputMode="numeric"
                  value={projectEditForm.estimatedCost}
                  onChange={(event) => setProjectEditForm({ ...projectEditForm, estimatedCost: event.target.value })}
                />
              </label>
            </div>

            <label className="field-label">
              メモ
              <textarea
                value={projectEditForm.memo}
                onChange={(event) => setProjectEditForm({ ...projectEditForm, memo: event.target.value })}
              />
            </label>

            <button className="primary-button" type="submit" disabled={projectLocked}>
              {projectLocked ? <LockKeyhole size={16} /> : <CheckCircle2 size={16} />} 案件情報を保存
            </button>
          </form>
        ) : (
          <EmptyState icon={Building2} title="案件を選択" />
        )}
      </Panel>

      <Panel title="見積作成" icon={ReceiptText}>
        <form className="form-stack" onSubmit={submitEstimate}>
          <div className="grid gap-2 sm:grid-cols-[1fr_96px_auto]">
            <select
              value={estimatePicker.catalogItemId}
              onChange={(event) => setEstimatePicker({ ...estimatePicker, catalogItemId: event.target.value })}
            >
              {data.catalogItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {catalogKindLabel[item.kind]} / {item.name} / {yen.format(item.unitPrice)}
                </option>
              ))}
            </select>
            <input
              inputMode="decimal"
              value={estimatePicker.quantity}
              onChange={(event) => setEstimatePicker({ ...estimatePicker, quantity: event.target.value })}
              placeholder="数量"
            />
            <button className="secondary-button" type="button" onClick={addEstimateDraftItem}>
              <Plus size={16} /> 行追加
            </button>
          </div>

          {estimateDraftRows.length === 0 ? (
            <EmptyState icon={ReceiptText} title="材料・固定費を追加" />
          ) : (
            <div className="estimate-lines">
              {estimateDraftRows.map((row) => (
                <div className="estimate-line" key={row.id}>
                  <div>
                    <p className="font-semibold">{row.catalogItem.name}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {row.quantity}
                      {row.catalogItem.unit} x {yen.format(row.catalogItem.unitPrice)}
                    </p>
                  </div>
                  <strong>{yen.format(row.amount)}</strong>
                  <button
                    className="icon-button"
                    type="button"
                    title="削除"
                    onClick={() => removeEstimateDraftItem(row.id)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="total-box">
            <div><span>小計</span><strong>{yen.format(estimateDraftSubtotal)}</strong></div>
            <div><span>消費税</span><strong>{yen.format(estimateDraftTax)}</strong></div>
            <div><span>税込合計</span><strong>{yen.format(estimateDraftTotal)}</strong></div>
          </div>

          <button className="primary-button" type="submit" disabled={projectLocked || estimateDraftRows.length === 0}>
            {projectLocked ? <LockKeyhole size={16} /> : <ReceiptText size={16} />} 見積書を作成
          </button>
        </form>

        <div className="mt-4 list-stack">
          {selectedProjectEstimates.map((estimate) => (
            <div className="record-row compact-row" key={estimate.id}>
              <div>
                <p className="font-semibold">{estimate.number}</p>
                <p className="text-sm text-[var(--muted)]">{estimate.issueDate} / {yen.format(estimate.total)}</p>
              </div>
              {selectedProject && (
                <button className="icon-button" type="button" title="見積書PDF" onClick={() => openEstimatePrint(selectedProject)}>
                  <Printer size={17} />
                </button>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="材料・固定費マスタ" icon={Database}>
        <form className="form-stack" onSubmit={submitCatalogItem}>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={catalogForm.kind}
              onChange={(event) => setCatalogForm({ ...catalogForm, kind: event.target.value as CatalogKind })}
            >
              {Object.entries(catalogKindLabel).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              value={catalogForm.category}
              onChange={(event) => setCatalogForm({ ...catalogForm, category: event.target.value })}
              placeholder="分類"
            />
          </div>
          <input
            value={catalogForm.name}
            onChange={(event) => setCatalogForm({ ...catalogForm, name: event.target.value })}
            placeholder="材料名・固定費名"
            required
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              value={catalogForm.unit}
              onChange={(event) => setCatalogForm({ ...catalogForm, unit: event.target.value })}
              placeholder="単位"
            />
            <input
              inputMode="numeric"
              value={catalogForm.unitPrice}
              onChange={(event) => setCatalogForm({ ...catalogForm, unitPrice: event.target.value })}
              placeholder="見積単価"
              required
            />
            <input
              inputMode="numeric"
              value={catalogForm.costPrice}
              onChange={(event) => setCatalogForm({ ...catalogForm, costPrice: event.target.value })}
              placeholder="原価"
            />
          </div>
          <input
            value={catalogForm.notes}
            onChange={(event) => setCatalogForm({ ...catalogForm, notes: event.target.value })}
            placeholder="メモ"
          />
          <button className="secondary-button" type="submit" disabled={catalogLocked}>
            {catalogLocked ? <LockKeyhole size={16} /> : <Plus size={16} />} マスタ登録
          </button>
        </form>

        <div className="mt-4 list-stack">
          {data.catalogItems.slice(0, 6).map((item) => (
            <div className="record-row compact-row" key={item.id}>
              <div>
                <p className="font-semibold">{item.name}</p>
                <p className="text-sm text-[var(--muted)]">
                  {catalogKindLabel[item.kind]} / {item.category} / {yen.format(item.unitPrice)} per {item.unit}
                </p>
              </div>
              <Badge>{item.unit}</Badge>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--ink)]">
      {sharedProjectDatalists}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-[var(--line)] bg-white/95 px-4 py-5 shadow-sm lg:block">
        <div className="flex items-center gap-3 px-2">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--brand)] text-white">
            <Gauge size={22} aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--muted)]">社内専用</p>
            <h1 className="text-lg font-bold">Genba One</h1>
          </div>
        </div>
        <nav className="mt-8 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveView(item.id)}
                className={clsx(
                  "nav-button",
                  item.id === "newProject" && "nav-button-featured",
                  activeView === item.id && "nav-button-active",
                )}
                title={item.label}
              >
                <Icon size={18} aria-hidden />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="absolute bottom-5 left-4 right-4 rounded-lg border border-[var(--line)] bg-[var(--soft)] p-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck size={16} aria-hidden />
            {roleLabel[currentRole]}
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">{currentUser.name}</p>
        </div>
      </aside>

      <main className="lg:ml-64">
        <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-[var(--brand)] text-white lg:hidden">
                <Gauge size={21} aria-hidden />
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--muted)]">案件・現場・経理を一元管理</p>
                <h2 className="text-xl font-bold tracking-normal lg:text-2xl">
                  {navItems.find((item) => item.id === activeView)?.label}
                </h2>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="search-field">
                <Search size={16} aria-hidden />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="案件・顧客・タグ"
                  aria-label="案件検索"
                />
              </label>
              <label className="select-field">
                <UserRound size={16} aria-hidden />
                <select value={currentUserId} onChange={(event) => setCurrentUserId(event.target.value)} aria-label="利用者">
                  {data.users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} / {roleLabel[user.role]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-5 pb-24 lg:px-8 lg:pb-8">
          {activeView === "newProject" && (
            <section className="space-y-5">
              {projectRegistrationPanel}
            </section>
          )}

          {activeView === "dashboard" && (
            <section className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
                <MetricCard icon={Building2} label="進行中案件" value={`${metrics.activeProjects}件`} tone="green" />
                <MetricCard icon={Wallet} label="未収金" value={compactYen(metrics.outstanding)} tone="coral" />
                <MetricCard icon={Coins} label="粗利" value={compactYen(metrics.grossProfit)} detail={`${metrics.grossProfitRate}%`} tone="amber" />
                <MetricCard icon={Camera} label="写真" value={`${metrics.photos}枚`} tone="teal" />
              </div>

              <div className="grid gap-5 2xl:grid-cols-[1.2fr_0.8fr]">
                <Panel title="案件別 粗利" icon={BarChart3}>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={profitRows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="code" tickLine={false} axisLine={false} fontSize={12} />
                        <YAxis tickFormatter={(value) => `${Number(value) / 10000}万`} tickLine={false} axisLine={false} fontSize={12} />
                        <Tooltip formatter={(value) => yen.format(Number(value))} />
                        <Bar dataKey="revenue" fill="#256f6c" radius={[4, 4, 0, 0]} name="契約額" />
                        <Bar dataKey="actualCost" fill="#d97706" radius={[4, 4, 0, 0]} name="原価" />
                        <Bar dataKey="grossProfit" fill="#c2410c" radius={[4, 4, 0, 0]} name="粗利" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Panel>

                <Panel title="本日以降の予定" icon={CalendarDays}>
                  <div className="list-stack">
                    {visibleSchedules.slice(0, 5).map((schedule) => {
                      const project = projectsById.get(schedule.projectId);
                      return (
                        <button
                          type="button"
                          className="list-row text-left"
                          key={schedule.id}
                          onClick={() => {
                            setSelectedProjectId(schedule.projectId);
                            setActiveView("schedule");
                          }}
                        >
                          <span className="status-dot" />
                          <span>
                            <span className="block font-semibold">{schedule.title}</span>
                            <span className="text-sm text-[var(--muted)]">{project?.name} / {dateTimeLabel(schedule.start)}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Panel>
              </div>
            </section>
          )}

          {activeView === "customers" && (
            <section className="grid gap-5 2xl:grid-cols-[1fr_420px]">
              <Panel title="顧客一覧" icon={Users}>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>顧客名</th>
                        <th>担当者</th>
                        <th>電話</th>
                        <th>メール</th>
                        <th>住所</th>
                        <th>案件</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.customers.map((customer) => (
                        <tr
                          key={customer.id}
                          className="clickable-row"
                          onClick={() => loadCustomerForm(customer.id)}
                        >
                          <td>
                            <div className="font-semibold">{customer.name}</div>
                            <div className="text-xs text-[var(--muted)]">{customer.paymentTerm}</div>
                          </td>
                          <td>{customer.contact}</td>
                          <td>{customer.phone}</td>
                          <td>{customer.email}</td>
                          <td>{customer.address}</td>
                          <td>{data.projects.filter((project) => project.customerId === customer.id).length}件</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>

              <Panel title={customerForm.id ? "顧客編集" : "新規顧客登録"} icon={Users}>
                <form className="form-stack" onSubmit={submitCustomer}>
                  <label className="field-label">
                    顧客名
                    <input
                      value={customerForm.name}
                      onChange={(event) => setCustomerForm({ ...customerForm, name: event.target.value })}
                      placeholder="会社名・顧客名"
                      required
                    />
                  </label>
                  <div className="grid gap-2 md:grid-cols-2">
                    <label className="field-label">
                      担当者
                      <input
                        value={customerForm.contact}
                        onChange={(event) => setCustomerForm({ ...customerForm, contact: event.target.value })}
                        placeholder="先方担当者"
                      />
                    </label>
                    <label className="field-label">
                      電話
                      <input
                        value={customerForm.phone}
                        onChange={(event) => setCustomerForm({ ...customerForm, phone: event.target.value })}
                        placeholder="052-000-0000"
                      />
                    </label>
                  </div>
                  <label className="field-label">
                    メール
                    <input
                      type="email"
                      value={customerForm.email}
                      onChange={(event) => setCustomerForm({ ...customerForm, email: event.target.value })}
                      placeholder="customer@example.jp"
                    />
                  </label>
                  <label className="field-label">
                    住所
                    <input
                      value={customerForm.address}
                      onChange={(event) => setCustomerForm({ ...customerForm, address: event.target.value })}
                      placeholder="所在地"
                    />
                  </label>
                  <label className="field-label">
                    支払条件
                    <input
                      value={customerForm.paymentTerm}
                      onChange={(event) => setCustomerForm({ ...customerForm, paymentTerm: event.target.value })}
                      placeholder="月末締め翌月末払い"
                    />
                  </label>
                  <label className="field-label">
                    メモ
                    <textarea
                      value={customerForm.notes}
                      onChange={(event) => setCustomerForm({ ...customerForm, notes: event.target.value })}
                      placeholder="注意事項、請求条件、担当メモなど"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="secondary-button" type="button" onClick={resetCustomerForm}>
                      <Plus size={16} /> 新規入力
                    </button>
                    <button className="primary-button" type="submit">
                      <CheckCircle2 size={16} /> 保存
                    </button>
                  </div>
                </form>
                {selectedCustomer && (
                  <div className="mt-4 settings-list">
                    <Info label="選択中" value={selectedCustomer.name} />
                    <Info
                      label="関連案件"
                      value={`${data.projects.filter((project) => project.customerId === selectedCustomer.id).length}件`}
                    />
                  </div>
                )}
              </Panel>
            </section>
          )}

          {activeView === "projects" && (
            <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_460px]">
              <Panel title="案件管理一覧" icon={Building2}>
                <div className="table-wrap project-sheet-wrap">
                  <table className="project-sheet-table">
                    <thead>
                      <tr>
                        <th>案件番号</th>
                        <th>見積依頼日</th>
                        <th>発注者分類</th>
                        <th>完了日</th>
                        <th>完了月</th>
                        <th>進捗</th>
                        <th>現場名</th>
                        <th>工事名</th>
                        <th>元請名</th>
                        <th>先方担当</th>
                        <th>受付担当</th>
                        <th>調査担当</th>
                        <th>見積担当</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProjects.map((project) => {
                        const customer = customersById.get(project.customerId);
                        const completionDate = project.completionDate ?? (project.status === "completed" ? project.endDate : "");
                        return (
                          <tr
                            key={project.id}
                            onClick={() => setSelectedProjectId(project.id)}
                            className={clsx("clickable-row", selectedProjectId === project.id && "selected-sheet-row")}
                          >
                            <td className="project-code-cell">{project.code}</td>
                            <td>{(project.estimateRequestDate ?? project.startDate).replaceAll("-", "/")}</td>
                            <td className={clsx("orderer-cell", ordererToneClass(project.ordererCategory ?? customerOrdererCategory(customer)))}>
                              {project.ordererCategory ?? customerOrdererCategory(customer)}
                            </td>
                            <td>{completionDate.replaceAll("-", "/")}</td>
                            <td>{completionMonthLabel(completionDate)}</td>
                            <td className={clsx("project-status-cell", `project-status-${project.status}`)}>
                              {sheetProgressLabel(project)}
                            </td>
                            <td>{project.siteName}</td>
                            <td className="font-semibold">{project.name}</td>
                            <td>{project.primeContractorName ?? customer?.name}</td>
                            <td>{project.clientContactName}</td>
                            <td>{project.receptionStaff}</td>
                            <td>{project.surveyStaff}</td>
                            <td>{project.estimateStaff}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Panel>

              {selectedProjectTools}
            </section>
          )}

          {activeView === "schedule" && (
            <section className="grid gap-5 2xl:grid-cols-[360px_1fr]">
              <Panel title="案件選択" icon={Search}>
                <ProjectPicker projects={filteredProjects} selectedProjectId={selectedProjectId} setSelectedProjectId={setSelectedProjectId} />
              </Panel>
              <Panel title="工程・人員・備品" icon={CalendarDays}>
                <div className="timeline">
                  {data.schedules
                    .filter((schedule) => schedule.projectId === selectedProject?.id)
                    .map((schedule) => (
                      <div className="timeline-item" key={schedule.id}>
                        <div>
                          <p className="font-semibold">{schedule.title}</p>
                          <p className="text-sm text-[var(--muted)]">{dateTimeLabel(schedule.start)} - {dateTimeLabel(schedule.end)}</p>
                        </div>
                        <div className="text-sm">
                          <p>{schedule.assigneeIds.map((id) => usersById.get(id)?.name).join("、")}</p>
                          <p className="text-[var(--muted)]">{schedule.equipment}</p>
                        </div>
                      </div>
                    ))}
                </div>
              </Panel>
            </section>
          )}

          {activeView === "reports" && (
            <section className="grid gap-5 2xl:grid-cols-[380px_1fr]">
              <Panel title="日報入力" icon={ClipboardList}>
                <form className="form-stack" onSubmit={submitReport}>
                  <select value={reportForm.projectId} onChange={(event) => setReportForm({ ...reportForm, projectId: event.target.value })}>
                    {data.projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" value={reportForm.date} onChange={(event) => setReportForm({ ...reportForm, date: event.target.value })} />
                    <input value={reportForm.weather} onChange={(event) => setReportForm({ ...reportForm, weather: event.target.value })} placeholder="天候" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input inputMode="numeric" value={reportForm.workers} onChange={(event) => setReportForm({ ...reportForm, workers: event.target.value })} placeholder="人数" />
                    <input inputMode="decimal" value={reportForm.workHours} onChange={(event) => setReportForm({ ...reportForm, workHours: event.target.value })} placeholder="工数" />
                  </div>
                  <textarea value={reportForm.summary} onChange={(event) => setReportForm({ ...reportForm, summary: event.target.value })} placeholder="作業内容" required />
                  <textarea value={reportForm.safetyNotes} onChange={(event) => setReportForm({ ...reportForm, safetyNotes: event.target.value })} placeholder="安全・連絡事項" />
                  <button className="primary-button" type="submit">
                    <CheckCircle2 size={16} /> 提出
                  </button>
                </form>
              </Panel>
              <Panel title="提出済み日報" icon={FileText}>
                <div className="list-stack">
                  {data.reports.map((report) => (
                    <div className="record-row" key={report.id}>
                      <div>
                        <p className="font-semibold">{projectsById.get(report.projectId)?.name}</p>
                        <p className="text-sm text-[var(--muted)]">{report.date} / {usersById.get(report.authorId)?.name} / {report.workers}名</p>
                        <p className="mt-2 text-sm">{report.summary}</p>
                      </div>
                      <button className="icon-button" type="button" title="日報PDF" onClick={() => openReportPrint(report)}>
                        <Printer size={17} />
                      </button>
                    </div>
                  ))}
                </div>
              </Panel>
            </section>
          )}

          {activeView === "files" && (
            <section className="grid gap-5 2xl:grid-cols-[360px_1fr]">
              <Panel title="写真・図面追加" icon={Upload}>
                <div className="form-stack">
                  <ProjectPicker projects={filteredProjects} selectedProjectId={selectedProjectId} setSelectedProjectId={setSelectedProjectId} />
                  <label className="upload-drop">
                    <Upload size={22} />
                    <span>{selectedProject?.name}</span>
                    <input type="file" multiple onChange={handleFiles} />
                  </label>
                  {selectedProject && (
                    <button className="secondary-button" type="button" onClick={() => openPhotoLedgerPrint(selectedProject)}>
                      <Printer size={16} /> 写真台帳
                    </button>
                  )}
                </div>
              </Panel>
              <Panel title="ファイル管理" icon={FolderOpen}>
                <div className="file-grid">
                  {data.files
                    .filter((file) => !selectedProject || file.projectId === selectedProject.id)
                    .map((file) => (
                      <div className="file-card" key={file.id}>
                        <div className="file-icon">{file.kind === "photo" ? <Camera size={20} /> : <FileText size={20} />}</div>
                        <div>
                          <p className="font-semibold">{file.name}</p>
                          <p className="text-sm text-[var(--muted)]">{fileKindLabel[file.kind]} / {file.category}</p>
                          <p className="text-xs text-[var(--muted)]">{dateTimeLabel(file.uploadedAt)} / {Math.round(file.size / 10000) / 100}MB</p>
                        </div>
                      </div>
                    ))}
                </div>
              </Panel>
            </section>
          )}

          {activeView === "billing" && (
            <section className="space-y-5">
              <div className="grid gap-5 2xl:grid-cols-[1fr_360px]">
                <Panel title="見積・請求" icon={ReceiptText}>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>請求番号</th>
                          <th>案件</th>
                          <th>期日</th>
                          <th>金額</th>
                          <th>未収</th>
                          <th>状態</th>
                          <th>出力</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.invoices.map((invoice) => {
                          const project = projectsById.get(invoice.projectId);
                          return (
                            <tr key={invoice.id}>
                              <td>{invoice.number}</td>
                              <td>{project?.name}</td>
                              <td>{invoice.dueDate}</td>
                              <td>{compactYen(invoice.total)}</td>
                              <td>{compactYen(invoiceBalance(invoice))}</td>
                              <td><Badge>{invoiceStatusLabel[invoice.status]}</Badge></td>
                              <td>
                                <button className="icon-button" type="button" title="請求書PDF" onClick={() => openInvoicePrint(invoice)}>
                                  <Printer size={17} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Panel>
                <Panel title="入金登録" icon={Wallet}>
                  <form className="form-stack" onSubmit={submitPayment}>
                    <select value={paymentForm.invoiceId} onChange={(event) => setPaymentForm({ ...paymentForm, invoiceId: event.target.value })}>
                      {data.invoices.map((invoice) => (
                        <option key={invoice.id} value={invoice.id}>{invoice.number} / 未収 {compactYen(invoiceBalance(invoice))}</option>
                      ))}
                    </select>
                    <input type="date" value={paymentForm.date} onChange={(event) => setPaymentForm({ ...paymentForm, date: event.target.value })} />
                    <input inputMode="numeric" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} placeholder="入金額" />
                    <input value={paymentForm.memo} onChange={(event) => setPaymentForm({ ...paymentForm, memo: event.target.value })} placeholder="メモ" />
                    <button className="primary-button" type="submit" disabled={accountingLocked}>
                      {accountingLocked ? <LockKeyhole size={16} /> : <CheckCircle2 size={16} />} 入金登録
                    </button>
                  </form>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {data.projects.map((project) => (
                      <button key={project.id} className="secondary-button compact" type="button" onClick={() => openEstimatePrint(project)}>
                        <Printer size={15} /> {project.code}
                      </button>
                    ))}
                  </div>
                </Panel>
              </div>
            </section>
          )}

          {activeView === "profit" && (
            <section className="grid gap-5 2xl:grid-cols-[360px_1fr]">
              <Panel title="原価登録" icon={Coins}>
                <form className="form-stack" onSubmit={submitCost}>
                  <select value={costForm.projectId} onChange={(event) => setCostForm({ ...costForm, projectId: event.target.value })}>
                    {data.projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                  <input type="date" value={costForm.date} onChange={(event) => setCostForm({ ...costForm, date: event.target.value })} />
                  <select value={costForm.category} onChange={(event) => setCostForm({ ...costForm, category: event.target.value as CostCategory })}>
                    {Object.entries(costCategoryLabel).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  <input value={costForm.vendor} onChange={(event) => setCostForm({ ...costForm, vendor: event.target.value })} placeholder="仕入先/外注先" />
                  <input value={costForm.description} onChange={(event) => setCostForm({ ...costForm, description: event.target.value })} placeholder="内容" />
                  <input inputMode="numeric" value={costForm.amount} onChange={(event) => setCostForm({ ...costForm, amount: event.target.value })} placeholder="金額" />
                  <button className="primary-button" type="submit" disabled={accountingLocked}>
                    {accountingLocked ? <LockKeyhole size={16} /> : <Plus size={16} />} 原価登録
                  </button>
                </form>
              </Panel>
              <Panel title="粗利一覧" icon={BarChart3}>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>案件</th>
                        <th>契約額</th>
                        <th>実行予算</th>
                        <th>実原価</th>
                        <th>粗利</th>
                        <th>率</th>
                      </tr>
                    </thead>
                    <tbody>
                      {profitRows.map((row) => (
                        <tr key={row.id}>
                          <td>{row.name}</td>
                          <td>{compactYen(row.revenue)}</td>
                          <td>{compactYen(row.estimatedCost)}</td>
                          <td>{compactYen(row.actualCost)}</td>
                          <td>{compactYen(row.grossProfit)}</td>
                          <td>{row.grossProfitRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </section>
          )}

          {activeView === "imports" && (
            <section className="grid gap-5 2xl:grid-cols-[380px_1fr]">
              <Panel title="CSV/XLSX取り込み" icon={FileSpreadsheet}>
                <div className="form-stack">
                  <label className="upload-drop">
                    <FileSpreadsheet size={22} />
                    <span>CSV / XLSX</span>
                    <input type="file" accept=".csv,.xlsx,.xls" onChange={handleImportFile} />
                  </label>
                  <button className="primary-button" type="button" onClick={applyImportAsProjects} disabled={projectLocked || importRows.length === 0}>
                    {projectLocked ? <LockKeyhole size={16} /> : <Import size={16} />} 案件として取込
                  </button>
                  <button className="secondary-button" type="button" onClick={() => exportCsv("projects", data.projects as unknown as Record<string, unknown>[])}>
                    <Download size={16} /> 案件CSV
                  </button>
                  <button className="secondary-button" type="button" onClick={() => exportCsv("profit", profitRows as unknown as Record<string, unknown>[])}>
                    <Download size={16} /> 粗利CSV
                  </button>
                </div>
              </Panel>
              <Panel title="取り込みプレビュー" icon={Database}>
                {importRows.length === 0 ? (
                  <EmptyState icon={FileSpreadsheet} title="プレビュー待ち" />
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          {Object.keys(importRows[0]).map((key) => <th key={key}>{key}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {importRows.map((row, index) => (
                          <tr key={index}>
                            {Object.values(row).map((value, valueIndex) => <td key={valueIndex}>{String(value)}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Panel>
            </section>
          )}

          {activeView === "settings" && (
            <section className="grid gap-5 2xl:grid-cols-[380px_1fr]">
              <Panel title="会社設定" icon={Settings}>
                <div className="settings-list">
                  <Info label="会社名" value={data.company.name} />
                  <Info label="所在地" value={data.company.address} />
                  <Info label="登録番号" value={data.company.invoiceRegistrationNumber} />
                  <Info label="振込先" value={`${data.company.bank} ${data.company.branch}`} />
                  <Info label="税率" value={`${data.company.taxRate * 100}%`} />
                </div>
              </Panel>
              <Panel title="監査ログ" icon={ShieldCheck}>
                <div className="list-stack">
                  {data.auditLogs.map((log) => (
                    <div className="record-row compact-row" key={log.id}>
                      <div>
                        <p className="font-semibold">{log.summary}</p>
                        <p className="text-sm text-[var(--muted)]">{dateTimeLabel(log.at)} / {usersById.get(log.userId)?.name ?? log.userId} / {log.target}</p>
                      </div>
                      <Badge>{log.action}</Badge>
                    </div>
                  ))}
                </div>
              </Panel>
            </section>
          )}
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-6 border-t border-[var(--line)] bg-white/95 px-2 pb-2 pt-1 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
        {navItems.filter((item) => item.mobile).map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={clsx(
                "mobile-nav-button",
                item.id === "newProject" && "mobile-nav-button-featured",
                activeView === item.id && "mobile-nav-button-active",
              )}
              onClick={() => setActiveView(item.id)}
              title={item.label}
            >
              <Icon size={20} aria-hidden />
              <span>{item.mobileLabel ?? item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Home;
  label: string;
  value: string;
  detail?: string;
  tone: "green" | "coral" | "amber" | "teal";
}) {
  return (
    <div className={clsx("metric-card", `metric-${tone}`)}>
      <div className="metric-icon">
        <Icon size={19} aria-hidden />
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--muted)]">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
        {detail && <p className="text-sm text-[var(--muted)]">{detail}</p>}
      </div>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Home;
  children: React.ReactNode;
}) {
  return (
    <section className="panel min-w-0">
      <div className="panel-title">
        <Icon size={18} aria-hidden />
        <h3>{title}</h3>
      </div>
      {children}
    </section>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="badge">{children}</span>;
}

function CustomerCandidateList({
  customers,
  query,
  onSelect,
}: {
  customers: Customer[];
  query: string;
  onSelect: (customer: Customer) => void;
}) {
  if (!query.trim()) return null;

  return (
    <div className="customer-candidates">
      {customers.length > 0 ? (
        customers.map((customer) => (
          <button key={customer.id} type="button" onClick={() => onSelect(customer)}>
            <span className="font-semibold">{customer.name}</span>
            <span>{[customer.contact, customer.address].filter(Boolean).join(" / ") || "詳細未登録"}</span>
          </button>
        ))
      ) : (
        <div className="customer-candidate-empty">候補なし。この名前で新規顧客として登録できます。</div>
      )}
    </div>
  );
}

function ProjectPicker({
  projects,
  selectedProjectId,
  setSelectedProjectId,
}: {
  projects: Project[];
  selectedProjectId: string;
  setSelectedProjectId: (id: string) => void;
}) {
  return (
    <div className="list-stack">
      {projects.map((project) => (
        <button
          className={clsx("project-pick", selectedProjectId === project.id && "project-pick-active")}
          key={project.id}
          type="button"
          onClick={() => setSelectedProjectId(project.id)}
        >
          <span className="font-semibold">{project.name}</span>
          <span className="text-sm text-[var(--muted)]">{project.code} / {project.progress}%</span>
        </button>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, title }: { icon: typeof Home; title: string }) {
  return (
    <div className="empty-state">
      <Icon size={28} aria-hidden />
      <p>{title}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
