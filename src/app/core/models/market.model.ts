export type MeasurementType =
  | 'UNIT'
  | 'KG'
  | 'GRAM'
  | 'LITER'
  | 'MILLILITER'
  | 'PACKAGE'
  | 'BUNCH'
  | string;

export type PricingMode = 'FIXED' | 'WEIGHT_BASED' | 'VARIABLE' | string;

export interface MarketSectionCustomerDto {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  iconUrl?: string;
  displayOrder?: number;
}

export interface MarketStoreScheduleDto {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
  [key: string]: any;
}

export interface MarketStoreSummaryDto {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  coverImageUrl?: string;
  address?: string;
  district?: string;
  city?: string;
  zoneId?: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  isOpen?: boolean;
  isTemporarilyClosed?: boolean;
  openingTime?: string;
  closingTime?: string;
  distanceMeters?: number;
  schedule?: MarketStoreScheduleDto;
  rating?: number;
  reviewsCount?: number;
  estimatedDeliveryMinutes?: string;
  sections?: MarketSectionCustomerDto[];
}

export interface MarketCategoryCustomerDto {
  id: string;
  sectionId?: string;
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
}

export interface MarketProductVariantDto {
  id: string;
  name: string;
  sku?: string;
  saleUnit?: MeasurementType;
  priceUnit?: MeasurementType;
  pricingMode?: PricingMode;
  weightMinGrams?: number;
  weightMaxGrams?: number;
  weightAverageGrams?: number;
  weightGrams?: number;
  isDefault?: boolean;
  displayOrder?: number;
  isActive?: boolean;
  isAvailable?: boolean;
  imageUrl?: string;
  prices?: MarketStoreProductPriceOfferDto[];
  priceDisplaySummary?: string;
  allowedSaleUnits?: MeasurementType[];
  price?: number;
}

export interface MarketProductOptionDto {
  id: string;
  name: string;
  additionalPrice?: number;
  isDefault?: boolean;
}

export interface MarketProductOptionGroupDto {
  id: string;
  name: string;
  minSelection?: number;
  maxSelection?: number;
  isRequired?: boolean;
  options: MarketProductOptionDto[];
}

export interface MarketStoreProductPriceOfferDto {
  saleUnit?: MeasurementType;
  measurementType?: MeasurementType;
  zisifyPrice?: number;
  price?: number;
  estimatedPiecePrice?: number;
  isDefault?: boolean;
}

export interface MarketStoreProductCustomerDto {
  storeProductId: string;
  storeId: string;
  storeName?: string;
  productId: string;
  productName: string;
  productSlug?: string;
  description?: string;
  brandName?: string;
  measurementType?: MeasurementType;
  allowedSaleUnits?: MeasurementType[];
  pricingMode?: PricingMode;
  priceUnit?: MeasurementType;
  hasVariants?: boolean;
  variants?: MarketProductVariantDto[];
  optionGroups?: MarketProductOptionGroupDto[];
  prices?: MarketStoreProductPriceOfferDto[];
  weightGrams?: number;
  primaryImageUrl?: string;
  sectionId?: string;
  sectionName?: string;
  categoryId?: string;
  categoryName?: string;

  // Render fields:
  // true -> Counter [- 1 +] and "Agregar" direct button
  // false -> "Agregar" opens configuration modal (variants, cuts, weight)
  allowsDirectQuickAdd?: boolean;

  // Primary card price:
  primaryPrice?: number;
  // Unidad del precio a mostrar en el card (ej: UNIT -> "/ unid", KG -> "/ kg")
  primaryPriceUnit?: MeasurementType;
  // Resumen listo para imprimir (ej: "Desde S/ 3.40 / kg o S/ 0.80 / unid" o "S/ 3.40 / kg")
  priceDisplaySummary?: string;

  // Fallbacks / compatibility:
  sellsByUnit?: boolean;
  unitPrice?: number;
  sellsByWeight?: boolean;
  pricePerKg?: number;
  price?: number;
  isAvailable?: boolean;
}

// ============================================
// CART MODELS (HIERARCHICAL & LEGACY)
// ============================================

export interface AddMarketCartItemRequest {
  storeId: string;
  productId: string;
  variantId?: string;
  selectedMeasurement?: MeasurementType;
  quantity: number;
  selectedOptionsJson?: string;
  optionsAdditionalPrice?: number;
  itemNotes?: string;
}

export interface UpdateMarketCartItemRequest {
  quantity: number;
}

export interface MarketCartItemDto {
  itemId: string;
  storeId: string;
  storeName?: string;
  variantId?: string;
  variantNameSnapshot?: string;
  productId: string;
  productName: string;
  productSlug?: string;
  primaryImageUrl?: string;
  sectionId?: string;
  sectionName?: string;
  categoryId?: string;
  categoryName?: string;
  measurementType?: MeasurementType;
  selectedMeasurement?: MeasurementType;
  priceUnit?: MeasurementType;
  weightGrams?: number;
  volumeCm3?: number;
  quantity: number;
  unitPrice: number;
  optionsAdditionalPrice?: number;
  effectiveUnitPrice: number;
  selectedOptionsJson?: string;
  itemNotes?: string;
  subtotal: number;
}

export interface MarketCartCategoryGroupDto {
  categoryId: string;
  categoryName: string;
  categorySubtotal: number;
  itemsCount: number;
  items: MarketCartItemDto[];
}

export interface MarketCartSectionGroupDto {
  sectionId: string;
  sectionName: string;
  sectionSubtotal: number;
  itemsCount: number;
  categories: MarketCartCategoryGroupDto[];
}

export interface MarketCartStoreGroupDto {
  storeId: string;
  storeName: string;
  storeAddress?: string;
  storeSubtotal: number;
  itemsCount: number;
  items: MarketCartItemDto[];
  sections?: MarketCartSectionGroupDto[];
}

export interface MarketCartResponse {
  cartId: string;
  userId?: string;
  anchorStoreId?: string;
  totalItemsCount: number;
  distinctStoresCount: number;
  totalWeightGrams: number;
  totalVolumeCm3: number;
  productsSubtotal: number;
  estimatedConsolidationFee: number;
  estimatedTotal: number;
  stores: MarketCartStoreGroupDto[];
}

export interface MarketProximityConflictError {
  status: number;
  errorCode: 'STORE_OUT_OF_PROXIMITY_RANGE' | string;
  message: string;
}
