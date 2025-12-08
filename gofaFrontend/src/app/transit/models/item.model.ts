export interface Accessory {
  id: number;
  name: string;
  quantity: number;
}

export interface Item {
  model1Id: number;
  supplier: string;
  category: string;
  prno: string;
  date: string;
  invoiceNo: string;
  itemType: string;
  contactNumber: string;
  number: string;
  registeredBy: string;
  serialNumber: string;
  description: string;
  unitOfMeasurment: string;
  ordered: number;
  received: number;
  unitOfPrice: string;
  amount: number;
  currency: string;
  location: string;
  remark: string;
  checkedByName: string;
  cTitle: string;
  recivedByName?: string;
  rTitle: string;
  authorizedByName: string;
  aTitle: string;
  model19Ref: string;

  quantity: number;
  unitPrice: number;
  totalPrice: number;

  Manufacturer: string;
  Warranty: string;
  ExpiryDate: Date;
  BatchNumber: string;

  DateSentForInspection?: Date;
  DateReceivedByInspection?: Date;
  DateSentToStore?: Date;
  Store?: string;
  status?: string;
  storeType?: string; // 'VHF', 'HF', 'SPAREPART', 'ELECTRONICS'
  hasAccessories?: boolean;
  accessories?: Accessory[];
  hasExtraItems?: boolean;
  extraItems?: {name: string; quantity: number; store: string; extraStatus: string; extraRecivedByName?: string;}[];

}



