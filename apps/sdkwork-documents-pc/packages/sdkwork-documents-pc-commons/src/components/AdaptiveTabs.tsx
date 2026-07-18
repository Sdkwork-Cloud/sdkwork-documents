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
  variant?: 'underline' | 'pill';
}

const tabClassName = (isActive: boolean, variant: 'underline' | 'pill') => {
  if (variant === 'pill') {
    return `flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400'
        : 'border-transparent text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5'
    }`;
  }

  return `flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 py-4 text-sm font-medium transition-colors ${
    isActive
      ? 'border-blue-500 text-blue-600 dark:text-blue-400'
      : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-white'
  }`;
};

export function AdaptiveTabs({
  items,
  activeId,
  onSelect,
  moreLabel,
  ariaLabel,
  variant = 'underline',
}: AdaptiveTabsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const visibleTabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const measurementRefs = useRef(new Map<string, HTMLButtonElement>());
  const moreMeasurementRef = useRef<HTMLButtonElement>(null);
  const measurementRowRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuItemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [visibleIds, setVisibleIds] = useState(() => items.map((item) => item.id));
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuFocusTarget, setMenuFocusTarget] = useState<number | null>(null);

  const itemIds = useMemo(() => items.map((item) => item.id), [items]);
  const visibleIdSet = useMemo(() => new Set(visibleIds), [visibleIds]);
  const visibleItems = items.filter((item) => visibleIdSet.has(item.id));
  const hiddenItems = items.filter((item) => !visibleIdSet.has(item.id));
  const tabGap = variant === 'pill' ? 8 : 32;

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
      gap: tabGap,
    });
    setVisibleIds((current) => (
      current.length === nextVisibleIds.length
      && current.every((id, index) => id === nextVisibleIds[index])
        ? current
        : nextVisibleIds
    ));
  }, [activeId, itemIds, tabGap]);

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
    if (measurementRowRef.current) {
      observer.observe(measurementRowRef.current);
    }
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

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % visibleItems.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + visibleItems.length) % visibleItems.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = visibleItems.length - 1;
    }

    if (nextIndex !== null) {
      event.preventDefault();
      onSelect(visibleItems[nextIndex].id);
      visibleTabRefs.current[nextIndex]?.focus();
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
    <div ref={containerRef} className={`relative flex w-full min-w-0 items-center ${variant === 'pill' ? 'gap-2' : 'gap-8'}`} aria-label={ariaLabel}>
      <div className={`flex min-w-0 flex-1 items-center overflow-hidden ${variant === 'pill' ? 'gap-2' : 'gap-8'}`} role="tablist">
        {visibleItems.map((item, index) => (
          <button
            key={item.id}
            ref={(element) => { visibleTabRefs.current[index] = element; }}
            type="button"
            role="tab"
            aria-selected={activeId === item.id}
            aria-busy={item.busy}
            aria-label={item.label}
            tabIndex={activeId === item.id ? 0 : -1}
            onClick={() => onSelect(item.id)}
            onKeyDown={(event) => handleTabKeyDown(event, index)}
            className={tabClassName(activeId === item.id, variant)}
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
            aria-label={`${ariaLabel}: ${moreLabel} (${hiddenItems.length})`}
            onClick={() => setMenuOpen((open) => !open)}
            onKeyDown={handleMoreKeyDown}
            className={`flex max-w-full items-center gap-1.5 whitespace-nowrap text-sm font-medium text-slate-600 transition-colors dark:text-slate-400 ${
              variant === 'pill'
                ? 'rounded-lg border border-slate-200 px-3 py-2 hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:hover:bg-white/5 dark:hover:text-white'
                : 'border-b-2 border-transparent py-4 hover:border-slate-300 hover:text-slate-900 dark:hover:border-slate-700 dark:hover:text-white'
            }`}
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

      <div
        className="pointer-events-none fixed top-0 opacity-0"
        style={{ left: -10_000 }}
        aria-hidden="true"
      >
        <div ref={measurementRowRef} className={`flex w-max items-center ${variant === 'pill' ? 'gap-2' : 'gap-8'}`}>
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
              className={tabClassName(activeId === item.id, variant)}
            >
              {item.content}
            </button>
          ))}
          <button
            ref={moreMeasurementRef}
            type="button"
            tabIndex={-1}
            className={`flex items-center gap-1.5 whitespace-nowrap text-sm font-medium ${
              variant === 'pill' ? 'rounded-lg border px-3 py-2' : 'border-b-2 border-transparent py-4'
            }`}
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
