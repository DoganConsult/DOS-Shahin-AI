export interface ControlResponseDTO {
  id: string;
  code: string;
  nameEn: string;
  nameAr?: string;
  status: string;
  ownerId?: string;
  frameworkId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ControlCreateDTO {
  code: string;
  nameEn: string;
  nameAr?: string;
  frameworkId?: string;
  ownerId?: string;
}

export interface ControlUpdateDTO {
  nameEn?: string;
  nameAr?: string;
  status?: string;
  ownerId?: string;
}
