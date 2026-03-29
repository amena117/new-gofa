// Main MasterCardItem interface
export interface MasterCardItem {
  id: number;
  model: string;
  partNumber: string;
  description: string;
  unitOfMeasure: string;
  inChAb: string;
  unitPack: string;
  cardNo:string;
  status: string;
  quantity: number; // Current stock level
  isEditingMainDetails:boolean;
   currencyCode?: string; // Ensure this is included
  // masterCardItemDetails: MasterCardItemDetails[];
  receivedRecords: MasterCardItemReceived[];
  issuedRecords: MasterCardItemIssued[];
}

// export interface MasterCardItemDetails {
//   id: number;
//   masterCardItemId: number;
//   date: Date;                // Maps to DateTime in C#
//   orderNo: string;
//   suppliers: string;
//   quantityOrdered: number;   // Maps to int in C#
//   received: number;          // Maps to int in C#
//   organization: string;
//   unitPrice: number;         // Maps to decimal in C#, using number in TS
//   postedBy: string;
//   balance: number;           // Read-only, computed property
//   isFulfilled: boolean;      // Read-only, computed property
// }

// This is used for both selecting and displaying accessories in UI
// src/app/Mastercard/models/mastercard.model.ts
export interface ReceivedAccessory {
  id: number;
  name: string;
  quantity: number;
  masterCardItemReceivedId: number;
}

export interface IssuedAccessory {
  id: number;
  name: string;
  quantity: number;
}

export interface MasterCardItemReceived {
 
  id: number;
  masterCardItemId: number;
  date: Date;           // Maps to DateTime in C#
  voucherNo: string;
  received: number;     // Maps to int in C#
  organization: string;
  postedBy: string;
  location: string;
  inStock: number;      // Read-only, set by backend StockService
  unitPrice:number;
  totalPrice:number;
  currencyCode?: string; // Optional, with default in backend
   isEditing?: boolean; // Add this
  originalData?: any;  // Add this for cancel functionality
  // --- New: Add these lines ---
 hasAccessories?: boolean;
receivedAccessories?: ReceivedAccessory[];
}
// src/app/models/master-card-item-issued.model.ts
export interface MasterCardItemIssued {
  id: number;
  masterCardItemId: number;
  date: Date;           // Maps to DateTime in C#
  voucherNo: string;
  issued: number;       // Maps to int Issued in C#
  organization: string;
  postedBy: string;
  location: string;
  inStock: number;      // Read-only, set by backend StockService
  unitPrice:number;
  totalPrice:number;
  currencyCode?: string; // Optional, with default in backend
   isEditing?: boolean; // Add this
  originalData?: any;  // Add this for cancel functionality
   hasAccessories?: boolean;
  issuedAccessories?: IssuedAccessory[];

}
export interface RequestOrderForIssue {
  id?: number;
  date: Date;
  issueVoucherNo: string;
  voucherNo: string;
  isIssue: boolean;
  requestingUnit: string;
  issuingStore: string;
  makeAndModel: string;
  isServiceable: boolean;
  category: string;
  currency?: string; // Added currency field
  issuedItems: IssuedItem[];
  preparedBy?: Person; // Optional
  verifiedBy?: Person; // Optional
  approvedBy?: Person; // Optional
   status?: 'Pending' | 'Accepted' | 'Rejected';
  acceptedAt?: string;
  acceptedBy?: string;
  rejectedAt?: string;
  rejectedBy?: string;
}

export interface IssuedItem {
  id?: number;
  requestOrderForIssueId?: number;
  itemNo: string;
  stockNumber: string;
  description:string;
  issued: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Person {
  name: string;
  title: string;
  jobResponsibility: string;
  date: Date;
}

export interface Organization {
  id: number;
  name: string;
}

export interface Location {
  id: number;
  name: string;
}

export interface MasterCardItemsReportFilter {
    startDate?: string;
    endDate?: string;
    organization?: string;
    location?: string;
    model?: string;
    partNumber?: string;
    status?: string;
    includeAccessories?: boolean;
}

export interface MasterCardItemReport {
    item: {
        id: number;
        cardNo: string;
        model: string;
        partNumber: string;
        description: string;
        unitOfMeasure: string;
        inChAb: string;
        unitPack: number;
        status: string;
        quantity: number;
    };
    receivedRecords: {
        id: number;
        masterCardItemId: number;
        date: string;
        voucherNo: string;
        received: number;
        organization: string;
        postedBy: string;
        location: string;
        inStock: number;
        unitPrice: number;
        totalPrice: number;
        currencyCode: string;
        hasAccessories: boolean;
        receivedAccessories: { id: number; name: string; quantity: number; masterCardItemReceivedId: number }[] | null;
    }[];
    issuedRecords: {
        id: number;
        masterCardItemId: number;
        date: string;
        voucherNo: string;
        issued: number;
        organization: string;
        postedBy: string;
        location: string;
        inStock: number;
        unitPrice: number;
        totalPrice: number;
        currencyCode: string;
        hasAccessories: boolean;
        issuedAccessories: { id: number; name: string; quantity: number; masterCardItemIssuedId: number }[] | null;
    }[];
    totals: {
        totalReceived: number;
        totalIssued: number;
        inStock: number;
    };
    showDetails?: boolean; // Add showDetails property
}

export interface MasterCardItemsReportResponse {
    items: MasterCardItemReport[];
    summary: {
        totalItems: number;
        totalReceived: number;
        totalIssued: number;
        totalInStock: number;
    };
}

export interface RequestOrderReportFilter {
  startDate?: string;
  endDate?: string;
  requestingUnit?: string;
  issuingStore?: string;
  category?: string;
  makeAndModel?: string;
  stockNumber?: string;
  description?: string;
}

export interface RequestOrderReportResponse {
  orders: {
showDetails: any;
    order: {
      id: number;
      date: string;
      issueVoucherNo: string;
      voucherNo: string;
      requestingUnit: string;
      issuingStore: string;
      makeAndModel: string;
      category: string;
      currency: string;
      isIssue: boolean;
      isServiceable: boolean;
      preparedBy?: { name: string; date: string };
      verifiedBy?: { name: string; date: string };
      approvedBy?: { name: string; date: string };
    };
    issuedItems: {
      id: number;
      requestOrderForIssueId: number;
      itemNo: string;
      stockNumber: string;
      description: string;
      issued: number;
      unitPrice: number;
      totalPrice: number;
    }[];
    totals: {
      totalItems: number;
      totalQuantityIssued: number;
      totalPrice: number;
    };
  }[];
  summary: {
    totalOrders: number;
    totalItems: number;
    totalQuantityIssued: number;
    totalPrice: number;
  };
}