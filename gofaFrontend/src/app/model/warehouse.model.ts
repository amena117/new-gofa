export interface Warehouse {
  warehouseId: string;
  name: string;
  location: string;
  isEditing?: boolean; // Optional for inline editing
  originalData?: Warehouse; // Optional for storing original data
}