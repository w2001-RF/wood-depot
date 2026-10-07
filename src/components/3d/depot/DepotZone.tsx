import { memo } from 'react';
import type { Product, QualityLevel, ZoneId } from '../../../types';
import type { ResolvedPlacement } from '../../../utils/depotWorld';
import { InteractiveProduct } from '../interactions/InteractiveProduct';
import type { DepotMaterials } from '../materials/materials';

interface DepotZoneProps {
  id: ZoneId;
  name: string;
  position: [number, number, number];
  products: ResolvedPlacement[];
  description?: string;
  byId: Record<string, Product>;
  mats: DepotMaterials;
  quality: QualityLevel;
}

/**
 * A zone of the depot. Adding a zone = one entry in ZONES + placements in
 * config/depotLayout.ts; no rendering code changes needed.
 */
export const DepotZone = memo(function DepotZone({ id, name, products, byId, mats, quality }: DepotZoneProps) {
  return (
    <group name={`zone-${id}`} userData={{ label: name }}>
      {products.map((pl, i) => {
        const product = byId[pl.productId];
        if (!product) return null;
        return (
          <InteractiveProduct
            key={pl.id}
            id={pl.id}
            product={product}
            position={[pl.x, 0, pl.z]}
            rotation={pl.rotY}
            zone={id}
            mats={mats}
            quality={quality}
            seed={i + 3}
          />
        );
      })}
    </group>
  );
});
