export interface Shelf {
  shelfId: number;
  name: string;
  column: string;
  row: string;
  warehouseId: string;
  isEditing?: boolean; // Optional for inline editing
  originalData?: Shelf; // Optional for storing original data
}