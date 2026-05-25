export type BoqProject = {
  id: string;
  title?: string | null;
  name?: string | null;
  location?: string | null;
  city?: string | null;
  projectType?: string | null;
  type?: string | null;
  structure?: string | null;
  floors?: number | string | null;
  builtUpArea?: number | string | null;
  builtupArea?: number | string | null;
  constructionArea?: number | string | null;
  totalBuiltUpArea?: number | string | null;
  plotArea?: number | string | null;
  area?: number | string | null;
  createdAt?: string | Date | null;
};

export type BoqItem = {
  id?: string;
  projectId?: string | null;
  itemCode?: string | null;
  code?: string | null;
  description?: string | null;
  unit?: string | null;
  quantity?: number | string | null;
  rate?: number | string | null;
  amount?: number | string | null;
  status?: string | null;
  drawingRef?: string | null;
  createdAt?: string | Date | null;
};

export type BoqFormState = {
  itemCode: string;
  description: string;
  unit: string;
  quantity: string;
  rate: string;
  status: string;
  drawingRef: string;
};

export type CategorySummaryRow = {
  category: string;
  amount: number;
  percent: number;
  color: string;
};
