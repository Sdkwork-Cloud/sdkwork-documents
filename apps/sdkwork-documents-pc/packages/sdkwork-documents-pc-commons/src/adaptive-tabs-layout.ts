export interface AdaptiveTabsLayoutInput {
  itemIds: string[];
  itemWidths: ReadonlyMap<string, number>;
  activeId: string;
  containerWidth: number;
  moreButtonWidth: number;
  gap: number;
}

export function calculateAdaptiveTabIds({
  itemIds,
  itemWidths,
  activeId,
  containerWidth,
  moreButtonWidth,
  gap,
}: AdaptiveTabsLayoutInput): string[] {
  if (itemIds.length === 0 || containerWidth <= 0) {
    return [];
  }

  const widthOf = (id: string) => Math.max(0, itemWidths.get(id) ?? 0);
  const tabsWidth = (ids: string[]) => (
    ids.reduce((total, id) => total + widthOf(id), 0) + Math.max(0, ids.length - 1) * gap
  );
  const allTabsWidth = tabsWidth(itemIds);

  if (allTabsWidth <= containerWidth) {
    return itemIds;
  }

  const fitsWithMoreButton = (ids: string[]) => (
    tabsWidth(ids) + moreButtonWidth + (ids.length > 0 ? gap : 0) <= containerWidth
  );
  const visibleIds: string[] = [];

  if (itemIds.includes(activeId)) {
    if (!fitsWithMoreButton([activeId])) {
      return [];
    }
    visibleIds.push(activeId);
  }

  for (const id of itemIds) {
    if (id === activeId) {
      continue;
    }

    const candidateIds = [...visibleIds, id].sort((left, right) => (
      itemIds.indexOf(left) - itemIds.indexOf(right)
    ));
    if (fitsWithMoreButton(candidateIds)) {
      visibleIds.push(id);
    }
  }

  return visibleIds.sort((left, right) => itemIds.indexOf(left) - itemIds.indexOf(right));
}
