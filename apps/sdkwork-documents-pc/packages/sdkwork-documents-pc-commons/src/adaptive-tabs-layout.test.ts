import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateAdaptiveTabIds } from './adaptive-tabs-layout.ts';

const itemIds = ['open', 'app', 'backend', 'payments'];
const itemWidths = new Map(itemIds.map((id) => [id, 100]));

test('keeps every tab visible when the container has enough room', () => {
  assert.deepEqual(calculateAdaptiveTabIds({
    itemIds,
    itemWidths,
    activeId: 'open',
    containerWidth: 500,
    moreButtonWidth: 72,
    gap: 16,
  }), itemIds);
});

test('keeps the active tab visible and moves overflow tabs to the menu', () => {
  assert.deepEqual(calculateAdaptiveTabIds({
    itemIds,
    itemWidths,
    activeId: 'payments',
    containerWidth: 320,
    moreButtonWidth: 72,
    gap: 16,
  }), ['open', 'payments']);
});

test('moves every tab to the menu when the active tab and trigger cannot fit together', () => {
  assert.deepEqual(calculateAdaptiveTabIds({
    itemIds,
    itemWidths,
    activeId: 'payments',
    containerWidth: 150,
    moreButtonWidth: 72,
    gap: 16,
  }), []);
});

test('does not replace an oversized active tab with a smaller inactive tab', () => {
  assert.deepEqual(calculateAdaptiveTabIds({
    itemIds: ['short', 'active'],
    itemWidths: new Map([['short', 40], ['active', 160]]),
    activeId: 'active',
    containerWidth: 150,
    moreButtonWidth: 72,
    gap: 16,
  }), []);
});
