import { SEED_DATA } from '../data/seed';
import { ONBOARDING_AREA_DEFS, type OnboardingAreaId } from '../data/onboarding';
import type { Language } from '../store/app';
import * as repo from './repo';

/**
 * `spaces` tablosu boşsa örnek veriyi ve varsayılan tercihleri yazar.
 */
export async function ensureSeed(options?: {
  selectedAreaIds?: OnboardingAreaId[];
  language?: Language;
}): Promise<void> {
  if ((await repo.countSpaces()) > 0) {
    return;
  }
  const selectedSet =
    options?.selectedAreaIds && options.selectedAreaIds.length > 0
      ? new Set(options.selectedAreaIds)
      : null;
  const selectedDefs = selectedSet
    ? ONBOARDING_AREA_DEFS.filter((def) => selectedSet.has(def.id))
    : ONBOARDING_AREA_DEFS.filter((def) => !!def.seedSpaceId);
  const selectedSeedSpaceIds = new Set(
    selectedDefs.map((def) => def.seedSpaceId).filter((id): id is string => !!id),
  );

  const seedSpaces =
    selectedSeedSpaceIds.size > 0
      ? SEED_DATA.spaces.filter((space) => selectedSeedSpaceIds.has(space.id))
      : [];

  const language = options?.language ?? 'tr';
  const dynamicSpaces = selectedDefs.filter((def) => !def.seedSpaceId);
  const syntheticSpaces = dynamicSpaces.map((def) => ({
    id: `sp_onb_${def.id.replace(/[^a-z0-9]+/g, '_')}`,
    name: def.labels[language],
    icon: def.icon,
    color: def.color,
    categoryIds: [] as string[],
    expanded: true,
  }));
  const spacesToInsert = [...seedSpaces, ...syntheticSpaces];

  for (let i = 0; i < spacesToInsert.length; i++) {
    const s = spacesToInsert[i]!;
    await repo.insertSpace(
      { id: s.id, name: s.name, icon: s.icon, color: s.color },
      i,
    );
  }
  for (const s of seedSpaces) {
    for (let j = 0; j < s.categoryIds.length; j++) {
      const cid = s.categoryIds[j]!;
      const c = SEED_DATA.categories.find((x) => x.id === cid);
      if (c) {
        await repo.insertCategory({ id: c.id, spaceId: c.spaceId, name: c.name }, j);
      }
    }
  }
  const selectedCategoryIds = new Set(
    SEED_DATA.categories
      .filter((category) => selectedSeedSpaceIds.has(category.spaceId))
      .map((category) => category.id),
  );
  for (const p of SEED_DATA.pages) {
    if (!selectedCategoryIds.has(p.categoryId)) continue;
    await repo.insertPage(p);
  }
  const se = Object.fromEntries(spacesToInsert.map((s) => [s.id, s.expanded]));
  const ce = Object.fromEntries(
    SEED_DATA.categories
      .filter((c) => selectedSeedSpaceIds.has(c.spaceId))
      .map((c) => [c.id, c.expanded]),
  );
  await repo.setManyPreferences([
    [repo.PREF.expandedSpaces, JSON.stringify(se)],
    [repo.PREF.expandedCategories, JSON.stringify(ce)],
    [repo.PREF.activeSpaceId, spacesToInsert[0]?.id ?? ''],
    [repo.PREF.activeCategoryId, SEED_DATA.categories.find((c) => selectedSeedSpaceIds.has(c.spaceId))?.id ?? ''],
    [repo.PREF.activePageId, SEED_DATA.pages.find((p) => selectedCategoryIds.has(p.categoryId))?.id ?? ''],
    [repo.PREF.accent, 'green'],
    [repo.PREF.fontPair, 'inter-mono'],
    [repo.PREF.language, language],
    [repo.PREF.viewMode, 'edit'],
    [repo.PREF.rightRailOpen, '0'],
  ]);
}
