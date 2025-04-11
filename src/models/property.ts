export interface Property {
  tokenId: string;
  recorder: string;
  database: string;
  instrumentNum: string;
  name: string;
  propertyAddress: string;
  deedNumber: string;
  saleDate: string;
  salePrice: string;
  zoning: string;
  subdivision: string;
  constructionYear: string;
  livingSpace: string;
  documents: Record<string, string[]>;
  state: string;
  county: string;
  status: string;
}

export interface PropertyData {
  name: string;
  propertyAddress: string;
  deedNumber: string;
  instrumentNum: string;
  saleDate: string;
  salePrice: string;
  zoning: string;
  subdivision: string;
  constructionYear: string;
  livingSpace: string;
  state: string;
  county: string;
  documents: Record<string, string[]>;
  documentType?: string;
}

export interface PropertyMetaData {
  documents: { [key: string]: string[] };
}
