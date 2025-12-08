export interface Model22 {
  model22Id?: number;
  voucherNumber: string;
  department: string;
  recipientName: string;
  recipientOrganization: string;
  ethiopianDate: string; // Amharic format (e.g., "ነሐሴ 21, 2017") from backend
  role: string; // e.g., "SPAREPART", "VHF"
  registeredBy: string;
  items: Model22Item[];
}

/**
 * Represents an item within a Model22 withdrawal, matching the backend Model22Item model.
 */
export interface Model22Item {
  model22ItemId?: number;
  model22Id: number;
  voucherNumber: string;
  description: string;
  model: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  serialNumbers: string[];
  serialNumber?: string | null;
  
  // This is the key property - it matches backend
  withdrawnAccessories?: Model22ItemAccessory[];
}
export interface Model22ItemAccessory {
  model22ItemAccessoryId?: number;
  accessoryId: number;
  name: string;
  model: string;
  quantity: number;
  unitPrice?: number;
  currency?: string;
}
export interface WithdrawnAccessory {
  id?: number;
  accessoryId: number;
  name: string;
  model: string;
  quantity: number;
  unitPrice?: number;
  currency?: string;
}

/**
 * Request payload for creating or updating a Model22 record, matching the backend Model22 model.
 */
export interface Model22Request {
  department: string;
  voucherNumber: string;
  recipientName: string;
  recipientOrganization: string;
  ethiopianDate: string; // Amharic format (e.g., "ነሐሴ 21, 2017") or YYYY/MM/DD if backend is updated
  role: string;
  registeredBy: string;
  items: Model22ItemRequest[];
}

/**
 * Request payload for a single Model22 item, matching the backend Model22Item structure.
 */
export interface Model22ItemRequest {
  description: string;
  voucherNumber: string;
  model: string;
  quantity: number;
  unitPrice: number;
  currency: string; // Required, one of: "ETB", "POUND", "USD", "EURO"
  serialNumbers: string[];
}

/**
 * Request payload for creating a Model22 record with accessories
 */
export interface Model22WithAccessoriesRequest {
  voucherNumber: string;
  department: string;
  recipientName: string;
  recipientOrganization: string;
  ethiopianDate: string;
  role: string;
  registeredBy: string;
  items: Model22ItemWithAccessoriesRequest[];
}

/**
 * Request payload for a single Model22 item with accessories
 */
export interface Model22ItemWithAccessoriesRequest {
  description: string;
  model: string;
  quantity: number;
  unitPrice: number;
  currency: string;
  serialNumbers: string[];
  voucherNumber: string;
  selectedAccessories: AccessorySelectionRequest[];
}

/**
 * Request for selecting accessories
 */
export interface AccessorySelectionRequest {
  accessoryId: number;
  quantity: number;
}

/**
 * DTO for displaying a Model22 record in a list or history.
 */
export interface Model22Dto {
  model22Id: number;
  voucherNumber: string;
  department: string;
  recipientName: string;
  recipientOrganization: string;
  ethiopianDate: string;
  role: string;
  registeredBy: string;
  totalItems: number;
  date: string;
  items: Model22Item[]; // This array now includes withdrawnAccessories
  description?: string;
  totalPrice?: string;
  registeredByFullName?: string;
}

/**
 * Response structure for API success/failure with generic data type.
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  detailedMessage?: string;
  errors?: string[];
  data?: T;
}