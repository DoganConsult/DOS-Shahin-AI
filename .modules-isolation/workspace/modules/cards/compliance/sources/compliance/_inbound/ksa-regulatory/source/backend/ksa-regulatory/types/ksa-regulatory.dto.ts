export interface KsaRegulatoryResponseDTO {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface KsaRegulatoryCreateDTO {
  nameEn: string;
  nameAr?: string;
}

export interface KsaRegulatoryUpdateDTO {
  nameEn?: string;
  nameAr?: string;
  status?: string;
}
