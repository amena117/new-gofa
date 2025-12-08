export interface SpecialToolsRegister {
    id: number; // Optional because it's auto-generated on the backend
    recievedBy: number;
    toolName: string;
    description: string;
    quantity: number;
    partNumber: string;
    recievedDate: Date; // Use ISO date format (e.g., "2023-10-01T10:00:00")
    returnDate?: string | null; // Optional field
    givenBy: string;
    returnedDate?: Date;

  }