import { useMemo } from 'react';
import { PROPS, ZONES } from '../../../config/depotLayout';
import { translate } from '../../../i18n';
import { useCatalogStore } from '../../../stores/catalogStore';
import type { QualityLevel } from '../../../types';
import type { DepotWorld } from '../../../utils/depotWorld';
import { CinematicIntro } from '../interactions/CinematicIntro';
import { GuidePath } from '../interactions/GuidePath';
import { PlayerController } from '../interactions/PlayerController';
import type { DepotMaterials } from '../materials/materials';
import { DepotZone } from './DepotZone';
import { Dust, Ground, Lighting, Trees } from './Environment';
import { Desk, Forklift, PalletPiles, Truck } from './Props';
import { CantileverRacks, Greenhouse, Trellis } from './Structures';
import { Warehouse } from './Warehouse';

export function DepotScene({ world, mats, quality }: { world: DepotWorld; mats: DepotMaterials; quality: QualityLevel }) {
  const byId = useCatalogStore((s) => s.byId);
  const settings = useCatalogStore((s) => s.settings);
  const zones = useMemo(
    () =>
      ZONES.map((z) => ({
        def: z,
        placements: world.placements.filter((p) => p.zone === z.id),
      })).filter((z) => z.placements.length),
    [world],
  );
  const greenhouseEls = useMemo(() => world.elements.filter((e) => e.zone === 'greenhouse'), [world]);
  const trellisEls = useMemo(() => world.elements.filter((e) => e.zone === 'agriculture'), [world]);

  return (
    <>
      <Lighting quality={quality} />
      <Ground mats={mats} />
      <Trees quality={quality} />
      <Warehouse mats={mats} quality={quality} businessName={settings.businessName} seasonal={settings.seasonalMode} />
      {zones.map(({ def, placements }) => (
        <DepotZone
          key={def.id}
          id={def.id}
          name={translate('fr', `zone.${def.id}` as 'zone.desk')}
          position={[(def.rect.minX + def.rect.maxX) / 2, 0, (def.rect.minZ + def.rect.maxZ) / 2]}
          products={placements}
          byId={byId}
          mats={mats}
          quality={quality}
        />
      ))}
      <Greenhouse elements={greenhouseEls} byId={byId} mats={mats} quality={quality} />
      <Trellis elements={trellisEls} byId={byId} mats={mats} quality={quality} />
      <CantileverRacks byId={byId} mats={mats} quality={quality} />
      <PalletPiles mats={mats} quality={quality} />
      {PROPS.map((p) =>
        p.kind === 'forklift' ? (
          <Forklift key={p.id} p={p} mats={mats} />
        ) : p.kind === 'truck' ? (
          <Truck key={p.id} p={p} mats={mats} loadProduct={byId['madrier']} />
        ) : p.kind === 'desk' ? (
          <Desk key={p.id} p={p} mats={mats} />
        ) : null,
      )}
      <Dust quality={quality} />
      <GuidePath world={world} />
      <PlayerController world={world} />
      <CinematicIntro />
    </>
  );
}
