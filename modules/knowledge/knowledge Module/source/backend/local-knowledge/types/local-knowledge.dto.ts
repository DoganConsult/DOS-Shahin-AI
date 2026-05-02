export interface LocalKnowledgeResponseDTO {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalKnowledgeCreateDTO {
  nameEn: string;
  nameAr?: string;
}

export interface LocalKnowledgeUpdateDTO {
  nameEn?: string;
  nameAr?: string;
  status?: string;
}
