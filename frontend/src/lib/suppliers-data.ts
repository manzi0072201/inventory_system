export type Supplier = {
  id: string;
  name: string;
  contact: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  category: string;
  taxNumber: string;
  openingBalance: number;
  creditLimit: number;
  createdAt: string;
};

export const supplierCategories = [
  "General Goods",
  "Electronics",
  "Wholesale",
  "Audio",
  "Other",
];

export const supplierCountries = [
  "Rwanda",
  "Kenya",
  "Uganda",
  "Tanzania",
  "Burundi",
  "DR Congo",
  "United States",
  "Other",
];

export const seedSuppliers: Supplier[] = [
  {
    id: "SUP_1001",
    name: "Kigali Wholesale Ltd",
    contact: "Aline Uwase",
    email: "aline@kigaliwholesale.rw",
    phone: "+250 788 123 456",
    country: "Rwanda",
    city: "Kigali",
    address: "KG 11 Ave, Nyarugenge",
    category: "General Goods",
    taxNumber: "",
    openingBalance: 0,
    creditLimit: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "SUP_1002",
    name: "TechSource Rwanda",
    contact: "Eric Niyonsaba",
    email: "eric@techsource.rw",
    phone: "+250 788 234 567",
    country: "Rwanda",
    city: "Kigali",
    address: "KN 5 Rd, Remera",
    category: "Electronics",
    taxNumber: "",
    openingBalance: 0,
    creditLimit: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "SUP_1003",
    name: "East Africa Traders",
    contact: "Fatima Hassan",
    email: "fatima@eatraders.co",
    phone: "+254 722 345 678",
    country: "Kenya",
    city: "Nairobi",
    address: "Mombasa Rd, Industrial Area",
    category: "Wholesale",
    taxNumber: "",
    openingBalance: 0,
    creditLimit: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "SUP_1004",
    name: "Global Audio Supply",
    contact: "Daniel Kim",
    email: "daniel@globalsupply.com",
    phone: "+1 415 555 0198",
    country: "United States",
    city: "San Francisco",
    address: "450 Market Street",
    category: "Audio",
    taxNumber: "",
    openingBalance: 0,
    creditLimit: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "SUP_1005",
    name: "Samsung Distribution Hub",
    contact: "Grace Mutoni",
    email: "grace@samsunghub.rw",
    phone: "+250 788 456 789",
    country: "Rwanda",
    city: "Kigali",
    address: "KG 7 Ave, Kacyiru",
    category: "Electronics",
    taxNumber: "",
    openingBalance: 0,
    creditLimit: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
  },
];
