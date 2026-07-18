import { NextRequest } from "next/server";
import { cloneInitialData } from "@/lib/sample-data";
import { canEditAccounting, toCsv } from "@/lib/metrics";
import type { ApiResource, Role } from "@/lib/types";

export const dynamic = "force-static";
export const dynamicParams = false;
export const runtime = "nodejs";

const validResources: ApiResource[] = [
  "users",
  "customers",
  "sites",
  "projects",
  "schedules",
  "reports",
  "files",
  "estimates",
  "costs",
  "invoices",
  "payments",
  "audit-logs",
  "company",
  "catalog-items",
  "imports",
  "exports",
];

const accountingResources = new Set<ApiResource>(["costs", "invoices", "payments", "company"]);

export function generateStaticParams() {
  return validResources.map((resource) => ({ resource }));
}

const getResource = async (params: Promise<{ resource: string }>) => {
  const { resource } = await params;
  return validResources.includes(resource as ApiResource) ? (resource as ApiResource) : null;
};

const getRole = (request: NextRequest): Role =>
  (request.headers.get("x-user-role") as Role | null) ?? "admin";

const getCollection = (resource: ApiResource) => {
  const data = cloneInitialData();
  const collections = {
    users: data.users,
    customers: data.customers,
    sites: data.sites,
    projects: data.projects,
    schedules: data.schedules,
    reports: data.reports,
    files: data.files,
    estimates: data.estimates,
    costs: data.costs,
    invoices: data.invoices,
    payments: data.payments,
    "audit-logs": data.auditLogs,
    company: data.company,
    "catalog-items": data.catalogItems,
  };

  return collections[resource as keyof typeof collections];
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> },
) {
  const resource = await getResource(params);
  if (!resource) return Response.json({ error: "Unknown resource" }, { status: 404 });

  const data = cloneInitialData();
  const searchParams = request.nextUrl.searchParams;

  if (resource === "imports") {
    return Response.json({
      templates: ["customers", "projects", "costs"],
      acceptedFormats: ["csv", "xlsx"],
      sampleColumns: {
        customers: ["name", "contact", "phone", "email", "address", "paymentTerm"],
        projects: ["code", "name", "customer", "site", "startDate", "endDate", "contractAmount"],
        costs: ["projectCode", "date", "category", "vendor", "description", "amount"],
      },
    });
  }

  if (resource === "exports") {
    const type = searchParams.get("type") ?? "projects";
    const rows = type === "profit" ? data.projects : (getCollection(type as ApiResource) as Record<string, unknown>[]);
    const csv = Array.isArray(rows) ? toCsv(rows as Record<string, unknown>[]) : toCsv([rows as Record<string, unknown>]);
    return new Response(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${type}.csv"`,
      },
    });
  }

  return Response.json({ resource, data: getCollection(resource) });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ resource: string }> },
) {
  const resource = await getResource(params);
  if (!resource) return Response.json({ error: "Unknown resource" }, { status: 404 });
  if (resource === "exports") return Response.json({ error: "Use GET for exports" }, { status: 405 });

  const role = getRole(request);
  if (accountingResources.has(resource) && !canEditAccounting(role)) {
    return Response.json({ error: "Accounting permission required" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const created = {
    id: `${resource}-${crypto.randomUUID()}`,
    ...body,
    createdAt: new Date().toISOString(),
  };

  return Response.json(
    {
      resource,
      data: created,
      auditLog: {
        id: `audit-${crypto.randomUUID()}`,
        action: resource === "imports" ? "import" : "create",
        target: resource,
        userRole: role,
        at: new Date().toISOString(),
        summary: `${resource} was accepted by API gateway`,
      },
    },
    { status: 201 },
  );
}
