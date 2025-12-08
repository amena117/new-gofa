// src/app/model/item.model.ts
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  detailedMessage?: string;
}

export interface Item {
  itemId?: number;
  
  description: string;
  category: string;
  shelf: string;
  itemColumn: string;
  itemRow: string;
  voucherNumber?: string;
  receivedFrom: string;
  condition: string;
  quantity: number;
  numOfBox?: number;
  source: string; // Added
  registeredBy: string;
  role: string;
  model: string;
  warehouseId: string;
  registrationDate: string;
  unitPrice: number;
  currency: string;
  transactionHistory: TransactionEntry[];
  serialNumbers?: ItemSerialNumber[];
  units: ItemUnit[];
  accessories: Accessory[];
}

export interface ItemSerialNumber {
  id?: number;
  itemId: number;
  serialNumber: string;
  addedDate?: string;
}

export interface ItemUnit {
  id?: number;
  itemId: number;
  serialNumber: string;
  transactionHistory: TransactionEntry[];
}

export interface WarehouseDto {
  warehouseId: string;
  name: string;
  location: string;
}

export interface ShelfDto {
  shelfId: number;
  name: string;
  column: string;
  row: string;
  warehouseId: string;
}

export interface ItemReceiveRequest {
  category: string;
  description: string;
  shelf: string;
  itemColumn: string;
  itemRow: string;
  voucherNumber?: string;
  hasVoucherNumber: boolean;
  receivedFrom: string;
  condition: string;
  source: string; // Added
  quantity: number;
  numOfBox?: number;
  registeredBy: string;
  role: string;
  model: string;
  warehouseId: string;
  unitPrice: number;
  currency: string;
  serialNumbers: string[];
  accessories: AccessoryRequest[];
}

export interface AccessoryRequest {
  name: string;
  model: string;
  quantity: number;
  unitPrice?: number; // Optional unit price
  currency?: string; // Optional currency
}

export interface Accessory {
  id?: number;
  itemId: number;
  name: string;
  model: string;
  quantity: number;
  unitPrice?: number; // Optional unit price
  currency?: string; // Optional currency
}
export interface ItemListingDto {
  itemId: number;
  description: string;
  category: string;
  model: string;
  quantity: number;
  warehouseId: string;
  role: string;
  registrationDate: string;
  registeredBy: string;
  unitPrice: number;
  currency: string;
  source: string;
  shelf: string;
  itemColumn: string;
  itemRow: string;
  condition: string;
  hasAccessories: boolean;
  hasSerialNumbers: boolean;
  serialNumbersCount: number;
  latestTransactionDate: string | null;
}
export interface DashboardItem {
  itemId: number;
  description: string;
  category: string;
  model: string;
  quantity: number;
  warehouseId: string;
  role: string;
  latestTransactionDate?: string; // or use Date if parsing on frontend
}

export interface TransactionEntry {
  sortableDate: any;
  id: number;
  itemId: number;
  itemUnitId?: number;
  action: string;
  quantity: number;
  voucherNumber?: string;
  details: string;
  date: string;
  gregorianDate?: string;
  model22Id?: number;
  unitPrice?: number; // Added for receive transactions
  currency?: string; // Added for receive transactions
  totalAmount?: number;
  
}
export interface WarehouseSummaryDto {
  warehouseId: string;
  warehouseName: string;
  totalItems: number;
  totalQuantity: number;
  lowStockItems: number;
  mostRecentRegistration: string;
}

export interface TransactionEntryDto {
  id: number;
  sortableDate: any;
  itemId: number;
  category: string;
  description: string;
  action: string;
  quantity: number;
  voucherNumber?: string;
  details: string;
  date: string;
  model22Id?: number;
}

export interface BulkReceiveRequest {
  voucherNumber?: string;
  receivedFrom: string;
  source: string; // Added
  registeredBy: string;
  items: ItemReceiveRequest[];
}
// In transaction-report.component.ts
export interface ReportEntry {
  id: number;
  description: string;
  department: string;
  model: string;  // ✅ Add this missing property
  ethiopianDate: string;
  recipientName: string;
  totalQuantity: number;
  unitPrice: number;
  currency: string;
  totalPrice: number;
}




export interface AddItemQuantityRequest {
  description: string;
  category: string;
  shelf: string;
  itemColumn: string;
  itemRow: string;
  condition: string;
  quantity: number;
  numOfBox?: number;
  role: string;
  model: string;
  voucherNumber?: string;
  hasVoucherNumber: boolean;
  receivedFrom: string;
  registeredBy: string;
  source: string; // Added
  warehouseId: string;
  unitPrice: number;
  currency: string;
  serialNumbers: string[];
  transactionDate?: string;
  accessories: AccessoryRequest[];
}

export interface BulkAddItemQuantityRequest {
  voucherNumber?: string;
  receivedFrom: string;
  registeredBy: string;
  transactionDate?: string;
  source: string; // Added
  items: AddItemQuantityRequest[];
  performedBy: string;
}

export interface WithdrawHistoryDto {
  transactionId: number;
  category: string;
  description: string;
  model: string;
  quantity: number;
  voucherNumber?: string;
  issuedTo: string;
  performedBy: string;
  date: string;
}

export interface ReceiveHistoryDto {
  transactionId: number;
  category: string;
  description: string;
  model: string;
  quantity: number;
  voucherNumber?: string;
  receivedFrom: string;
  registeredBy: string;
  source: string; // Added
  date: string;
  unitPrice: number;
  currency: string;
}

export interface Category {
  id: number;
  name: string;
  description: string;
  createdAt: string;
  createdBy: string;
  role: string; // ← Added: matches backend
}
// src/app/model/item.model.ts

export interface CategoryCreateRequest {
  name: string;
  description: string;
  role: string;
}
export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
// Add this interface to your item.model.ts file
export interface UpdateItemRequest {
  editedBy: string;
  description?: string;
  category?: string;
  model?: string;
  shelf?: string;
  itemColumn?: string;
  itemRow?: string;
  condition?: string;
  numOfBox?: number;
  voucherNumber?: string;
  receivedFrom?: string;
  unitPrice?: number;
  currency?: string;
  source?: string;
  warehouseId?: string;
  role?: string;
}