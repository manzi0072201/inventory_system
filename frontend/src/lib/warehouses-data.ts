export type Warehouse = {
  id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  manager: string;
  phone: string;
  email: string;
  capacity: number;
  createdAt: string;
};

export const seedWarehouses: Warehouse[] = [
  {
    id: "WH-001",
    code: "WH-001",
    name: "Main Warehouse",
    address: "12 KG 7 Avenue, Gikondo",
    city: "Kigali",
    manager: "Aline Mukamana",
    phone: "+250 788 123 456",
    email: "main.warehouse@stocky.rw",
    capacity: 2000,
    createdAt: "2024-02-12T08:30:00.000Z",
  },
  {
    id: "WH-002",
    code: "WH-002",
    name: "Secondary Warehouse",
    address: "45 Sonatube Road, Remera",
    city: "Kigali",
    manager: "Eric Niyonsaba",
    phone: "+250 788 654 321",
    email: "secondary.warehouse@stocky.rw",
    capacity: 1600,
    createdAt: "2024-08-06T09:15:00.000Z",
  },
];
