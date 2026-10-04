'use client';

import {
  groupVariantAttributes,
  type ProductVariant,
} from '@/lib/catalogue/product-detail';

type VariantSelectorProps = {
  variants: ProductVariant[];
  selectedId?: string;
  onSelect: (variantId: string) => void;
};

export function VariantSelector({
  variants,
  selectedId,
  onSelect,
}: VariantSelectorProps) {
  if (variants.length === 0) {
    return null;
  }

  const groups = groupVariantAttributes(variants);
  const selected = variants.find((variant) => variant.id === selectedId);

  if (groups.length === 0) {
    return (
      <fieldset className="pdp-variants">
        <legend className="pdp-field-label">Options</legend>
        <div className="pdp-variant-options" role="radiogroup" aria-label="Product options">
          {variants.map((variant) => {
            const active = variant.id === selectedId;
            return (
              <button
                key={variant.id}
                type="button"
                role="radio"
                aria-checked={active}
                className={`pdp-variant-option ${active ? 'is-active' : ''}`}
                onClick={() => onSelect(variant.id)}
              >
                {variant.name ?? variant.sku ?? 'Option'}
              </button>
            );
          })}
        </div>
      </fieldset>
    );
  }

  return (
    <div className="pdp-variants">
      {groups.map((group) => {
        const currentValue = selected?.attributes.find(
          (attribute) => attribute.code === group.code,
        )?.value;

        return (
          <fieldset key={group.code} className="pdp-variant-group">
            <legend className="pdp-field-label">{group.name}</legend>
            <div
              className="pdp-variant-options"
              role="radiogroup"
              aria-label={group.name}
            >
              {group.values.map((value) => {
                const match = variants.find((variant) =>
                  variant.attributes.some(
                    (attribute) =>
                      attribute.code === group.code && attribute.value === value,
                  ),
                );
                const active = currentValue === value;

                return (
                  <button
                    key={`${group.code}-${value}`}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    className={`pdp-variant-option ${active ? 'is-active' : ''}`}
                    onClick={() => {
                      if (match) {
                        onSelect(match.id);
                      }
                    }}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
