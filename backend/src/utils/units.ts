export type UnitType = "weight" | "volume" | "count" | "item";

export const parseNumericValue = (
  value: string | number | null | undefined,
): number | null => {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const normalizeWeightValue = (
  value: number,
  unit: string,
): number | null => {
  const normalizedUnit = unit.toLowerCase();
  if (normalizedUnit === "g") return value;
  if (normalizedUnit === "kg") return value * 1000;
  return null;
};

export const normalizeVolumeValue = (
  value: number,
  unit: string,
): number | null => {
  const normalizedUnit = unit.toLowerCase();
  if (normalizedUnit === "ml") return value;
  if (normalizedUnit === "l") return value * 1000;
  return null;
};

export const normalizeUnitValue = (
  unitType: UnitType,
  value: number,
  unit: string,
): number | null => {
  if (!unitType) return null;
  if (unitType === "weight") return normalizeWeightValue(value, unit);
  if (unitType === "volume") return normalizeVolumeValue(value, unit);
  if (unitType === "count") {
    return value > 0 ? value : null;
  }
  return null;
};

export const normalizeUnitPrice = (
  price: number | null,
  unitType: UnitType | string | null,
  unitValue: number | null,
  unitUnit: string | null,
): number | null => {
  if (!price || !unitType) return null;

  if (unitType === "item") {
    return price; // normalized price = raw price
  }
  if (!unitValue || !unitUnit) return null;
  const normalizedValue = normalizeUnitValue(
    unitType as UnitType,
    unitValue,
    unitUnit,
  );

  if (!normalizedValue || normalizedValue <= 0) return null;

  return price / normalizedValue;
};

