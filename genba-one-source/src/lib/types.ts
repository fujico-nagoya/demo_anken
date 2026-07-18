export type Role = "admin" | "project_manager" | "field_staff" | "accounting";

export type ProjectStatus =
  | "planning"
  | "estimating"
  | "contracted"
  | "in_progress"
  | "inspection"
  | "completed"
  | "on_hold";

export type InvoiceStatus = "draft" | "issued" | "partial" | "paid" | "overdue";
export type EstimateStatus = "draft" | "sent" | "accepted" | "lost";
export type CostCategory = "material" | "labor" | "subcontract" | "equipment" | "expense";
export type FileKind = "photo" | "drawing" | "document" | "invoice" | "other";
export type CatalogKind = "material" | "fixed_cost" | "labor" | "subcontract" | "other";

export type User = {
  id: string;
  name: string;
  role: Role;
  email: string;
  team: string;
};

export type Customer = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  address: string;
  paymentTerm: string;
  notes: string;
};

export type Site = {
  id: string;
  customerId: string;
  name: string;
  address: string;
  manager: string;
  notes: string;
};

export type Project = {
  id: string;
  code: string;
  customerId: string;
  siteId: string;
  name: string;
  type: string;
  estimateRequestDate?: string;
  primeContractorName?: string;
  clientContactName?: string;
  siteName?: string;
  siteAddress?: string;
  receptionStaff?: string;
  surveyStaff?: string;
  estimateStaff?: string;
  inquiryType?: string;
  ordererCategory?: string;
  completionDate?: string;
  memo?: string;
  status: ProjectStatus;
  priority: "high" | "normal" | "low";
  managerId: string;
  startDate: string;
  endDate: string;
  contractAmount: number;
  estimatedCost: number;
  billedAmount: number;
  paidAmount: number;
  progress: number;
  tags: string[];
};

export type ScheduleEvent = {
  id: string;
  projectId: string;
  title: string;
  start: string;
  end: string;
  assigneeIds: string[];
  equipment: string;
  status: "scheduled" | "working" | "done" | "delayed";
};

export type DailyReport = {
  id: string;
  projectId: string;
  date: string;
  authorId: string;
  weather: string;
  workers: number;
  workHours: number;
  summary: string;
  safetyNotes: string;
  photosCount: number;
  submittedAt: string;
};

export type MediaFile = {
  id: string;
  projectId: string;
  name: string;
  kind: FileKind;
  category: string;
  uploaderId: string;
  uploadedAt: string;
  size: number;
  path: string;
};

export type EstimateItem = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  catalogItemId?: string;
};

export type CatalogItem = {
  id: string;
  kind: CatalogKind;
  category: string;
  name: string;
  unit: string;
  unitPrice: number;
  costPrice: number;
  notes: string;
};

export type Estimate = {
  id: string;
  projectId: string;
  number: string;
  status: EstimateStatus;
  issueDate: string;
  validUntil: string;
  subtotal: number;
  tax: number;
  total: number;
  items: EstimateItem[];
};

export type CostEntry = {
  id: string;
  projectId: string;
  date: string;
  category: CostCategory;
  vendor: string;
  description: string;
  amount: number;
  status: "planned" | "ordered" | "confirmed" | "paid";
};

export type Invoice = {
  id: string;
  projectId: string;
  number: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  paidAmount: number;
  paidDate?: string;
};

export type Payment = {
  id: string;
  invoiceId: string;
  projectId: string;
  date: string;
  amount: number;
  method: "bank" | "cash" | "offset";
  memo: string;
};

export type AuditLog = {
  id: string;
  action: "create" | "update" | "delete" | "export" | "import";
  target: string;
  userId: string;
  at: string;
  summary: string;
};

export type CompanySettings = {
  name: string;
  address: string;
  phone: string;
  email: string;
  invoiceRegistrationNumber: string;
  bank: string;
  branch: string;
  accountType: string;
  accountNumber: string;
  accountName: string;
  taxRate: number;
  sealLabel: string;
};

export type AppData = {
  users: User[];
  customers: Customer[];
  sites: Site[];
  projects: Project[];
  schedules: ScheduleEvent[];
  reports: DailyReport[];
  files: MediaFile[];
  estimates: Estimate[];
  costs: CostEntry[];
  invoices: Invoice[];
  payments: Payment[];
  auditLogs: AuditLog[];
  company: CompanySettings;
  catalogItems: CatalogItem[];
};

export type ApiResource =
  | "users"
  | "customers"
  | "sites"
  | "projects"
  | "schedules"
  | "reports"
  | "files"
  | "estimates"
  | "costs"
  | "invoices"
  | "payments"
  | "audit-logs"
  | "company"
  | "catalog-items"
  | "imports"
  | "exports";
