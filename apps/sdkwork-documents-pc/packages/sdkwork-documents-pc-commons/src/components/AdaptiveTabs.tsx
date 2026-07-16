import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { calculateAdaptiveTabIds } from '../adaptive-tabs-layout.ts';

export interface AdaptiveTabItem {
  id: string;
  label: string;
  content: ReactNode;
  busy?: boolean;
}

export interface AdaptiveTabsProps {
  items: AdaptiveTabItem[];
  activeId: string;
  onSelect: (id: string) => void;
  moreLabel: string;
  ariaLabel: string;
}

const TAB_GAP = 32;

const tabClassName = (isActive: boolean) => (
  `flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 py-4 text-sm font-medium transition-colors ${
    isActive
      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
      : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-white'
  }`
);

export function AdaptiveTabs({ items, activeId, onSelect, moreLabel, ariaLabel }: AdaptiveTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const measurementRefs = useRef(new Map<string, HTMLButtonElement>());
  const moreMeasurementRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [visibleIds, setVisibleIds] = useState(() => items.map((item) => item.id));
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuFocusTarget, setMenuFocusTarget] = useState<number | null>(null);

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);
  const visibleIdSet = useMemo(() => new Set(visibleIds), [visibleIds]);
  const hiddenItems = items.filter((item) => !visibleIdSet.has(item.id));

  const updateLayout = useCallback(() => {
    const containerWidth = containerRef.current?.clientWidth ?? 0;
    const moreButtonWidth = moreMeasurementRef.current?.getBoundingClientRect().width ?? 0;
    const itemWidths = new Map<string, number>();

    for (const id of itemIds) {
      const width = measurementRefs.current.get(id)?.getBoundingClientRect().width ?? 0;
      if (width <= 0) {
        return;
      }
      itemWidths.set(id, width);
    }

    if (containerWidth <= 0 || moreButtonWidth <= 0) {
      return;
    }

    const nextVisibleIds = calculateAdaptiveTabIds({
      itemIds,
      itemWidths,
      activeId,
      containerWidth,
      moreButtonWidth,
      gap: TAB_GAP,
    });
    setVisibleIds((current) => (
      current.length === nextVisibleIds.length
      && current.every((id, index) => id === nextVisibleIds[index])
        ? current
        : nextVisibleIds
    ));
  }, [activeId, itemIds]);

  useLayoutEffect(() => {
    updateLayout();
  }, [items, updateLayout]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(updateLayout);
    observer.observe(container);
    return () => observer.disconnect();
  }, [updateLayout]);

  useEffect(() => {
    if (!menuOpen) {
      return undefined;
    }

    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target) && !moreButtonRef.current?.contains(target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [menuOpen]);

  useEffect(() => {
    if (menuOpen && menuFocusTarget !== null) {
      menuItemRefs.current[menuFocusTarget]?.focus();
      setMenuFocusTarget(null);
    }
  }, [menuFocusTarget, menuOpen]);

  useEffect(() => {
    if (hiddenItems.length === 0) {
      setMenuOpen(false);
    }
  }, [hiddenItems.length]);

  const openMenuAndFocus = (index: number) => {
    setMenuFocusTarget(index);
    setMenuOpen(true);
  };

  const handleMoreKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      openMenuAndFocus(event.key === 'ArrowDown' ? 0 : hiddenItems.length - 1);
    }
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowDown') {
      nextIndex = (index + 1) % hiddenItems.length;
    } else if (event.key === 'ArrowUp') {
      nextIndex = (index - 1 + hiddenItems.length) % hiddenItems.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = hiddenItems.length - 1;
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setMenuOpen(false);
      moreButtonRef.current?.focus();
      return;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      menuItemRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div ref={containerRef} className="relative flex w-full min-w-0 items-center gap-8" aria-label={ariaLabel}>
      <div className="flex min-w-0 flex-1 items-center gap-8 overflow-hidden" role="tablist">
        {items.filter((item) => visibleIdSet.has(item.id)).map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={activeId === item.id}
            aria-busy={item.busy}
            aria-label={item.label}
            onClick={() => onSelect(item.id)}
            className={tabClassName(activeId === item.id)}
          >
            {item.content}
          </button>
        ))}
      </div>

      {hiddenItems.length > 0 && (
        <div className="relative shrink-0">
          <button
            ref={moreButtonRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`${moreLabel} (${hiddenItems.length})`}
            onClick={() => setMenuOpen((open) => !open)}
            onKeyDown={handleMoreKeyDown}
            className="flex max-w-full items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent py-4 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-white"
          >
            <span>{moreLabel}</span>
            <span className="text-xs text-slate-400">{hiddenItems.length}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <div
              ref={menuRef}
              role="menu"
              className="absolute right-0 top-full z-50 mt-1 max-h-[min(420px,60vh)] w-max min-w-60 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-[#111]"
            >
              {hiddenItems.map((item, index) => (
                <button
                  key={item.id}
                  ref={(element) => { menuItemRefs.current[index] = element; }}
                  type="button"
                  role="menuitemradio"
                  aria-checked={activeId === item.id}
                  aria-busy={item.busy}
                  aria-label={item.label}
                  onClick={() => {
                    onSelect(item.id);
                    setMenuOpen(false);
                  }}
                  onKeyDown={(event) => handleMenuKeyDown(event, index)}
                  className={`flex w-full min-w-0 items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                    activeId === item.id
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
                  }`}
                >
                  <span className="flex min-w-0 flex-1 items-center gap-2">{item.content}</span>
                  {activeId === item.id && <Check className="h-4 w-4 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 h-0 w-full max-w-full overflow-hidden opacity-0" aria-hidden="true">
        <div className="flex w-max items-center gap-8">
          {items.map((item) => (
            <button
              key={item.id}
              ref={(element) => {
                if (element) {
                  measurementRefs.current.set(item.id, element);
                } else {
                  measurementRefs.current.delete(item.id);
                }
              }}
              type="button"
              tabIndex={-1}
              className={tabClassName(activeId === item.id)}
            >
              {item.content}
            </button>
          ))}
          <button
            ref={moreMeasurementRef}
            type="button"
            tabIndex={-1}
            className="flex items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent py-4 text-sm font-medium"
          >
            <span>{moreLabel}</span>
            <span className="text-xs">{items.length}</span>
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
