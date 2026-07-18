import type { AppData, CostEntry, Invoice, Project } from "./types";

export const yen = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

export const compactYen = (value: number) => {
  if (Math.abs(value) >= 100000000) return `${Math.round(value / 1000000) / 100}億円`;
  if (Math.abs(value) >= 10000) return `${Math.round(value / 1000) / 10}万円`;
  return yen.format(value);
};

export const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(new Date(value));

export const dateTimeLabel = (value: string) =>
  new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

export const roleLabel = {
  admin: "管理者",
  project_manager: "現場管理者",
  field_staff: "現場担当",
  accounting: "経理",
} as const;

export const projectStatusLabel = {
  planning: "計画",
  estimating: "見積中",
  contracted: "契約済",
  in_progress: "施工中",
  inspection: "検査",
  completed: "完了",
  on_hold: "保留",
} as const;

export const invoiceStatusLabel = {
  draft: "下書き",
  issued: "発行済",
  partial: "一部入金",
  paid: "入金済",
  overdue: "期限超過",
} as const;

export const costCategoryLabel = {
  material: "資材",
  labor: "労務",
  subcontract: "外注",
  equipment: "重機/車両",
  expense: "経費",
} as const;

export const canEditAccounting = (role: string) => role === "admin" || role === "accounting";
export const canManageProjects = (role: string) => role === "admin" || role === "project_manager";

export const projectCostTotal = (projectId: string, costs: CostEntry[]) =>
  costs.filter((cost) => cost.projectId === projectId).reduce((sum, cost) => sum + cost.amount, 0);

export const invoiceBalance = (invoice: Invoice) => invoice.total - invoice.paidAmount;

export const projectRevenue = (project: Project, invoices: Invoice[]) => {
  const invoiceTotal = invoices
    .filter((invoice) => invoice.projectId === project.id)
    .reduce((sum, invoice) => sum + invoice.total, 0);
  return Math.max(invoiceTotal, project.contractAmount);
};

export const calculateMetrics = (data: AppData) => {
  const activeProjects = data.projects.filter((project) =>
    ["contracted", "in_progress", "inspection"].includes(project.status),
  );
  const totalContract = data.projects.reduce((sum, project) => sum + project.contractAmount, 0);
  const totalCost = data.costs.reduce((sum, cost) => sum + cost.amount, 0);
  const totalBilled = data.invoices.reduce((sum, invoice) => sum + invoice.total, 0);
  const totalPaid = data.payments.reduce((sum, payment) => sum + payment.amount, 0);
  const outstanding = data.invoices.reduce((sum, invoice) => sum + invoiceBalance(invoice), 0);
  const grossProfit = totalContract - totalCost;
  const grossProfitRate = totalContract > 0 ? Math.round((grossProfit / totalContract) * 1000) / 10 : 0;

  return {
    activeProjects: activeProjects.length,
    totalContract,
    totalCost,
    totalBilled,
    totalPaid,
    outstanding,
    grossProfit,
    grossProfitRate,
    reportsThisWeek: data.reports.length,
    photos: data.files.filter((file) => file.kind === "photo").length,
  };
};

export const projectProfitRows = (data: AppData) =>
  data.projects.map((project) => {
    const actualCost = projectCostTotal(project.id, data.costs);
    const invoiceTotal = data.invoices
      .filter((invoice) => invoice.projectId === project.id)
      .reduce((sum, invoice) => sum + invoice.total, 0);
    const revenue = Math.max(project.contractAmount, invoiceTotal);
    return {
      id: project.id,
      code: project.code,
      name: project.name,
      revenue,
      estimatedCost: project.estimatedCost,
      actualCost,
      grossProfit: revenue - actualCost,
      grossProfitRate: revenue > 0 ? Math.round(((revenue - actualCost) / revenue) * 1000) / 10 : 0,
      progress: project.progress,
    };
  });

export const toCsv = (rows: Record<string, unknown>[]) => {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join(
    "\n",
  );
};
