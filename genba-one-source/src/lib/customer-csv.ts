import type { Customer } from "./types";

export type SpreadsheetCell = string | number | boolean | null | undefined;
export type SpreadsheetRow = SpreadsheetCell[];

const invalidCustomerNames = new Set([
  "",
  "あ",
  "顧客名",
  "分類",
  "請求書リスト",
  "雛型請求書",
  "連絡帳",
  "企業請求書作成",
]);

const cleanCell = (value: SpreadsheetCell) =>
  value === null || value === undefined ? "" : String(value).replaceAll("\uFEFF", "").trim();

export const normalizeCustomerName = (name: string) => cleanCell(name).replace(/\s+/g, " ");

const isPhoneOnlyName = (name: string) =>
  /^[0-9０-９+\-ー−－\s()（）]+$/.test(name) && /[0-9０-９]/.test(name);

const isPhoneLike = (value: string) =>
  value === "" || (/^[0-9０-９+\-ー−－\s()（）]+$/.test(value) && /[0-9０-９]/.test(value));

const mojibakePattern = /(?:ã|æ|å|ç|è|é|ï¼|ã|â)/;

const isBrokenImportedCustomer = (customer: Customer) =>
  customer.id.startsWith("c-fujiko-") &&
  [customer.name, customer.contact, customer.address, customer.paymentTerm, customer.notes].some((value) =>
    mojibakePattern.test(value),
  );

const customerIdFromName = (name: string) => {
  let hash = 0;
  for (const character of name) {
    hash = Math.imul(31, hash) + character.charCodeAt(0);
    hash |= 0;
  }
  return `c-fujiko-${Math.abs(hash).toString(36)}`;
};

const pushNote = (notes: string[], label: string, value: string) => {
  if (value) notes.push(`${label}: ${value}`);
};

const customerFromRow = (row: SpreadsheetRow): Customer | null => {
  const invoiceList = cleanCell(row[1]);
  const category = cleanCell(row[2]);
  const name = cleanCell(row[3]);
  const ourStaff = cleanCell(row[4]);
  const contact = cleanCell(row[5]);
  const paymentTerm = cleanCell(row[6]);
  const phoneValue = cleanCell(row[9]);
  const fax = cleanCell(row[10]);
  const postal = cleanCell(row[11]);
  const address = cleanCell(row[12]);
  const memo = cleanCell(row[13]);
  const displayName = name || invoiceList;

  if (invalidCustomerNames.has(displayName) || isPhoneOnlyName(displayName)) return null;

  const normalizedName = normalizeCustomerName(displayName);
  if (!normalizedName) return null;

  const notes = ["CSV取込: フジコー工程表 顧客情報_請求書リスト"];
  pushNote(notes, "分類", category);
  pushNote(notes, "弊社担当", ourStaff);
  pushNote(notes, "郵便番号", postal);
  pushNote(notes, "FAX", fax);
  if (invoiceList && invoiceList !== displayName) pushNote(notes, "請求書リスト", invoiceList);
  if (phoneValue && !isPhoneLike(phoneValue)) pushNote(notes, "電話欄メモ", phoneValue);
  pushNote(notes, "メモ", memo);

  return {
    id: customerIdFromName(normalizedName),
    name: displayName,
    contact,
    phone: isPhoneLike(phoneValue) ? phoneValue : "",
    email: "",
    address,
    paymentTerm,
    notes: notes.join("\n"),
  };
};

export const parseFujikoCustomerRows = (rows: SpreadsheetRow[]) => {
  const customersByName = new Map<string, Customer>();

  rows.slice(2).forEach((row) => {
    const customer = customerFromRow(row);
    if (!customer) return;

    const key = normalizeCustomerName(customer.name);
    if (!customersByName.has(key)) customersByName.set(key, customer);
  });

  return Array.from(customersByName.values());
};

export const mergeCustomerLists = (baseCustomers: Customer[], savedCustomers?: Customer[]) => {
  const customersByName = new Map<string, Customer>();

  baseCustomers.forEach((customer) => {
    const key = normalizeCustomerName(customer.name);
    if (key) customersByName.set(key, customer);
  });

  (savedCustomers ?? []).forEach((customer) => {
    if (isBrokenImportedCustomer(customer)) return;

    const key = normalizeCustomerName(customer.name);
    if (key) customersByName.set(key, customer);
  });

  return Array.from(customersByName.values());
};

export const appendMissingCustomers = (currentCustomers: Customer[], importedCustomers: Customer[]) => {
  const existingNames = new Set(currentCustomers.map((customer) => normalizeCustomerName(customer.name)));
  const missingCustomers = importedCustomers.filter((customer) => {
    const key = normalizeCustomerName(customer.name);
    if (!key || existingNames.has(key)) return false;
    existingNames.add(key);
    return true;
  });

  return missingCustomers.length > 0 ? [...currentCustomers, ...missingCustomers] : currentCustomers;
};
