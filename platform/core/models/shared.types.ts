export interface GrcRecord {
  [key: string]: any;
}

export interface BaseEntityDto {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: any;
}

export interface MessageResponse {
  message: string;
  [key: string]: any;
}
