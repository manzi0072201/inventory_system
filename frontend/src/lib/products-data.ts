export type Product = {
  id: string;
  name: string;
  code: string;
  cost: number;
  price: number;
  brand: string;
  category: string;
  quantity: number;
  stocked?: boolean;
  unit: string;
  type: string;
  warehouse: string;
  image: string;
  imageBg: string;
  blend?: boolean;
  createdAt?: number;
};

export const productCategories = ["Audio", "Tablets"];

export const productBrands = ["Apple", "Bose", "Sony", "Samsung"];

export const productWarehouses = ["Main Warehouse", "Secondary Warehouse"];
