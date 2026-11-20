import {
  ArrowCounterClockwiseIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowUUpLeftIcon,
  ArrowsClockwiseIcon,
  BankIcon,
  BarcodeIcon,
  BellIcon,
  BuildingIcon,
  CalendarBlankIcon,
  CaretDownIcon,
  CashRegisterIcon,
  ChartBarIcon,
  ChartLineUpIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockCounterClockwiseIcon,
  CornersOutIcon,
  CreditCardIcon,
  CubeIcon,
  DeviceMobileIcon,
  DownloadSimpleIcon,
  DotsThreeIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  GearSixIcon,
  InfoIcon,
  ListIcon,
  LockIcon,
  MagnifyingGlassIcon,
  MegaphoneIcon,
  MoneyIcon,
  MoonIcon,
  PackageIcon,
  PencilIcon,
  PlusIcon,
  ReceiptIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  SignOutIcon,
  SquaresFourIcon,
  SunIcon,
  TableIcon,
  TagIcon,
  TrashIcon,
  TrendUpIcon,
  TruckIcon,
  UploadIcon,
  UserGearIcon,
  UserIcon,
  UserPlusIcon,
  UsersThreeIcon,
  WalletIcon,
  WarehouseIcon,
  WarningCircleIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react/ssr";
import type {
  Icon as PhosphorIcon,
  IconProps as PhosphorIconProps,
  IconWeight,
} from "@phosphor-icons/react";

export type IconName =
  | "dashboard"
  | "pos"
  | "stock"
  | "products"
  | "people"
  | "userManagement"
  | "user"
  | "sales"
  | "purchases"
  | "salesReturn"
  | "purchaseReturn"
  | "expenses"
  | "settings"
  | "analytics"
  | "reports"
  | "money"
  | "bank"
  | "wallet"
  | "history"
  | "announcements"
  | "sun"
  | "moon"
  | "bell"
  | "chevronDown"
  | "refresh"
  | "calendar"
  | "alert"
  | "alertCircle"
  | "checkCircle"
  | "info"
  | "card"
  | "check"
  | "phone"
  | "building"
  | "list"
  | "trend"
  | "tag"
  | "grid"
  | "plus"
  | "userPlus"
  | "menu"
  | "close"
  | "warehouse"
  | "truck"
  | "search"
  | "upload"
  | "download"
  | "table"
  | "barcode"
  | "more"
  | "edit"
  | "trash"
  | "mail"
  | "lock"
  | "eye"
  | "eyeOff"
  | "logout"
  | "arrowLeft"
  | "arrowRight"
  | "fullscreen";

const icons: Record<IconName, PhosphorIcon> = {
  dashboard: SquaresFourIcon,
  pos: CashRegisterIcon,
  stock: CubeIcon,
  products: PackageIcon,
  people: UsersThreeIcon,
  userManagement: UserGearIcon,
  user: UserIcon,
  sales: ShoppingCartIcon,
  purchases: ReceiptIcon,
  salesReturn: ArrowCounterClockwiseIcon,
  purchaseReturn: ArrowUUpLeftIcon,
  expenses: WalletIcon,
  settings: GearSixIcon,
  analytics: ChartLineUpIcon,
  reports: ChartBarIcon,
  money: MoneyIcon,
  bank: BankIcon,
  wallet: WalletIcon,
  history: ClockCounterClockwiseIcon,
  announcements: MegaphoneIcon,
  sun: SunIcon,
  moon: MoonIcon,
  bell: BellIcon,
  chevronDown: CaretDownIcon,
  refresh: ArrowsClockwiseIcon,
  calendar: CalendarBlankIcon,
  alert: WarningIcon,
  alertCircle: WarningCircleIcon,
  checkCircle: CheckCircleIcon,
  info: InfoIcon,
  card: CreditCardIcon,
  check: CheckIcon,
  phone: DeviceMobileIcon,
  building: BuildingIcon,
  list: ListIcon,
  trend: TrendUpIcon,
  tag: TagIcon,
  grid: SquaresFourIcon,
  plus: PlusIcon,
  userPlus: UserPlusIcon,
  menu: ListIcon,
  close: XIcon,
  warehouse: WarehouseIcon,
  truck: TruckIcon,
  search: MagnifyingGlassIcon,
  upload: UploadIcon,
  download: DownloadSimpleIcon,
  table: TableIcon,
  barcode: BarcodeIcon,
  more: DotsThreeIcon,
  edit: PencilIcon,
  trash: TrashIcon,
  mail: EnvelopeIcon,
  lock: LockIcon,
  eye: EyeIcon,
  eyeOff: EyeSlashIcon,
  logout: SignOutIcon,
  arrowLeft: ArrowLeftIcon,
  arrowRight: ArrowRightIcon,
  fullscreen: CornersOutIcon,
};

export type IconProps = Omit<PhosphorIconProps, "weight"> & {
  name: IconName;
  strokeWidth?: number;
  weight?: IconWeight;
};

function weightFromStroke(strokeWidth?: number): IconWeight {
  if (strokeWidth === undefined) return "regular";
  if (strokeWidth >= 2.2) return "bold";
  if (strokeWidth <= 1.7) return "light";
  return "regular";
}

export function Icon({
  name,
  className = "w-4 h-4",
  strokeWidth,
  weight,
  ...rest
}: IconProps) {
  const Phosphor = icons[name];
  return (
    <Phosphor
      {...rest}
      className={className}
      weight={weight ?? weightFromStroke(strokeWidth)}
      aria-hidden="true"
    />
  );
}
