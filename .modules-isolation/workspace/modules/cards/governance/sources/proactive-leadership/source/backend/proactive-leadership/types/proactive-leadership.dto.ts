export interface ProactiveLeadershipResponseDTO {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProactiveLeadershipCreateDTO {
  nameEn: string;
  nameAr?: string;
}

export interface ProactiveLeadershipUpdateDTO {
  nameEn?: string;
  nameAr?: string;
  status?: string;
}
