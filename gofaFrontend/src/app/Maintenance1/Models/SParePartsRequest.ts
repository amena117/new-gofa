export interface SParePartsRequest {
  id: number; // Make id required
  askedClass: string;
  technicianName: string;
  signature: string;
  permiterName: string;
  rank: string;
  signatureP: string;
  partNumber: string;
  amountAsked: number;
  givenAmount: number;
  remark: string;
  equipmentTypeId: number;
}