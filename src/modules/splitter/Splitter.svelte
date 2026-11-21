<script lang="ts">
    import "./splitter.css";

    import { untrack } from "svelte";
    import { SvelteMap } from "svelte/reactivity";
    import {
        formatExtentForProp,
        isZeroExtent,
        normalizeExtents,
        parseExtent,
        resolveExtentPx,
        solveContainerResize,
        solveInitialAndMountExtents,
        solvePairDrag,
        type SolverPaneState,
    } from "./splitter-solver.internal.ts";
    import {
        setSplitterContext,
        type SplitterHandleAriaState,
        type SplitterHandleRegistration,
        type SplitterPaneRegistration,
    } from "./splitter.context.ts";
    import type {
        SplitterDoubleClickAction,
        SplitterPaneSnapshot,
        SplitterProps,
        SplitterResizeEvent,
    } from "./splitter.types.ts";

    let {
        ref = $bindable<HTMLDivElement | null>(null),
        variant,
        size,
        orientation = "horizontal",
        animate = true,
        disabled = false,
        onResize,
        onResizeEnd,
        class: className,
        children,
        ...rest
    }: SplitterProps = $props();

    const paneRegistrations = new SvelteMap<string, SplitterPaneRegistration>();
    const handleRegistrations = new SvelteMap<string, SplitterHandleRegistration>();
    const paneExtentsPx = new SvelteMap<string, number>();
    const rememberedExtents = new SvelteMap<string, number>();
    const preCollapseExtents = new SvelteMap<string, number>();

    let availablePx = $state(0);
    let draggingHandleId = $state<string | null>(null);
    let registrationVersion = $state(0);
    let isAnimating = $state(false);
    let animTimer: ReturnType<typeof setTimeout> | undefined;

    let dragLeftId = "";
    let dragRightId = "";
    let dragStartClientPos = 0;
    let dragStartLeftPx = 0;
    let dragStartRightPx = 0;

    function sortByDomOrder<T extends { getElement: () => HTMLDivElement | null }>(items: T[]): T[] {
        return items
            .filter((item) => {
                const el = item.getElement();
                return el !== null && el.isConnected;
            })
            .toSorted((a, b) => {
                const elA = a.getElement();
                const elB = b.getElement();
                if (!elA || !elB || elA === elB) return 0;
                const pos = elA.compareDocumentPosition(elB);
                return pos & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
            });
    }

    function getOrderedPanes(): SplitterPaneRegistration[] {
        return sortByDomOrder(paneRegistrations.values().toArray());
    }

    function measureAvailablePx(): number {
        if (!ref) return 0;
        const containerPx = orientation === "horizontal" ? ref.clientWidth : ref.clientHeight;
        let handleSum = 0;
        for (const handle of handleRegistrations.values()) {
            const el = handle.getElement();
            if (!el || !el.isConnected) continue;
            const rect = el.getBoundingClientRect();
            handleSum += orientation === "horizontal" ? rect.width : rect.height;
        }
        return Math.max(0, containerPx - handleSum);
    }

    function buildSolverStates(
        ordered: SplitterPaneRegistration[],
        availPx: number,
    ): SolverPaneState[] {
        return ordered.map((pane) => {
            const extentProp = pane.getExtentProp();
            const defaultExtent = pane.getDefaultExtent();
            const specifiedExtent = extentProp ?? defaultExtent;
            const parsedSpec =
                specifiedExtent !== undefined ? parseExtent(specifiedExtent) : undefined;
            return {
                id: pane.id,
                hasExplicitId: pane.hasExplicitId,
                extentPx: paneExtentsPx.get(pane.id),
                preCollapseExtentPx: preCollapseExtents.get(pane.id),
                specifiedExtent,
                isControlled: extentProp !== undefined,
                minPx: resolveExtentPx(pane.getMin(), availPx),
                maxPx: resolveExtentPx(pane.getMax(), availPx),
                collapsible: pane.getCollapsible(),
                collapsed: pane.getCollapsed(),
                collapsedExtentPx: resolveExtentPx(pane.getCollapsedExtent(), availPx),
                collapseThreshold: pane.getCollapseThreshold(),
                unitPreference: parsedSpec?.unit ?? "%",
            };
        });
    }

    function triggerAnimating(): void {
        if (!animate) return;
        if (animTimer !== undefined) {
            clearTimeout(animTimer);
        }
        isAnimating = true;
        animTimer = setTimeout(() => {
            isAnimating = false;
            animTimer = undefined;
        }, 250);
    }

    function stopAnimating(): void {
        if (animTimer !== undefined) {
            clearTimeout(animTimer);
            animTimer = undefined;
        }
        isAnimating = false;
    }

    interface SnapPaneMeta {
        collapsed: boolean;
        isFlex: boolean;
        minPx: number;
        maxPx: number;
    }

    function pickBestSnapIndex(
        indices: number[],
        solvedPx: number[],
        snapped: number[],
        step: number,
    ): number {
        let bestIdx = indices[0] ?? -1;
        let bestScore = -Infinity;
        for (const idx of indices) {
            const score = ((solvedPx[idx] ?? 0) - (snapped[idx] ?? 0)) * step;
            if (score > bestScore) {
                bestScore = score;
                bestIdx = idx;
            }
        }
        return bestIdx;
    }

    function selectSnapCandidate(
        meta: SnapPaneMeta[],
        solvedPx: number[],
        snapped: number[],
        step: number,
    ): number {
        const tier1: number[] = [];
        const tier2: number[] = [];
        const tier3: number[] = [];
        const tier4: number[] = [];

        for (const [i, m] of meta.entries()) {
            const next = (snapped[i] ?? 0) + step;
            if (next < 0) continue;

            const inBounds = next >= Math.floor(m.minPx) && next <= Math.ceil(m.maxPx);
            if (!m.collapsed && m.isFlex && inBounds) tier1.push(i);
            else if (!m.collapsed && inBounds) tier2.push(i);
            else if (!m.collapsed) tier3.push(i);
            else tier4.push(i);
        }

        const candidates =
            tier1.length > 0
                ? tier1
                : tier2.length > 0
                  ? tier2
                  : tier3.length > 0
                    ? tier3
                    : tier4;

        return candidates.length > 0 ? pickBestSnapIndex(candidates, solvedPx, snapped, step) : -1;
    }

    function snapExtentsToIntegers(
        ordered: SplitterPaneRegistration[],
        solvedPx: number[],
        availPx: number,
    ): number[] {
        const targetTotal = Math.max(0, Math.round(availPx));
        const snapped = ordered.map((_, i) => Math.max(0, Math.round(solvedPx[i] ?? 0)));
        if (ordered.length === 0) return snapped;

        let remainder = targetTotal - snapped.reduce((acc, v) => acc + v, 0);
        if (remainder === 0) return snapped;

        const meta: SnapPaneMeta[] = ordered.map((pane) => {
            const collapsed = pane.getCollapsed();
            const spec = pane.getExtentProp() ?? pane.getDefaultExtent();
            const isFlex = spec === undefined || parseExtent(spec).unit !== "px";
            const minPx = resolveExtentPx(
                collapsed ? pane.getCollapsedExtent() : pane.getMin(),
                targetTotal,
            );
            const rawMax = Math.min(resolveExtentPx(pane.getMax(), targetTotal), targetTotal);
            const maxPx = collapsed ? minPx : Math.max(minPx, rawMax);
            return { collapsed, isFlex, minPx, maxPx };
        });

        while (remainder !== 0) {
            const step = remainder > 0 ? 1 : -1;
            const chosen = selectSnapCandidate(meta, solvedPx, snapped, step);
            if (chosen === -1) break;
            snapped[chosen] = (snapped[chosen] ?? 0) + step;
            remainder -= step;
        }

        return snapped;
    }

    function applySolvedExtents(
        ordered: SplitterPaneRegistration[],
        solvedPx: number[],
        availPx: number,
        recordUserMemory: boolean,
    ): void {
        const snappedPx = snapExtentsToIntegers(ordered, solvedPx, availPx);
        for (const [i, pane] of ordered.entries()) {
            const px = snappedPx[i] ?? 0;
            paneExtentsPx.set(pane.id, px);

            if (
                recordUserMemory &&
                pane.hasExplicitId &&
                !pane.getCollapsed() &&
                pane.getExtentProp() === undefined
            ) {
                rememberedExtents.set(pane.id, px);
            }

            const currentExtentProp = pane.getExtentProp();
            if (currentExtentProp !== undefined && !pane.getCollapsed()) {
                const currentPx = resolveExtentPx(currentExtentProp, availPx);
                if (Math.abs(currentPx - px) > 0.5) {
                    pane.setExtentProp(formatExtentForProp(px, currentExtentProp, availPx));
                }
            }
        }
    }

    function buildResizeEvent(ordered: SplitterPaneRegistration[]): SplitterResizeEvent {
        const avail = availablePx;
        const panes: SplitterPaneSnapshot[] = ordered.map((pane) => {
            const px = paneExtentsPx.get(pane.id) ?? 0;
            const pct = avail > 0 ? Math.round((px / avail) * 10_000) / 100 : 0;
            return {
                id: pane.id,
                extentPx: Math.round(px * 100) / 100,
                extentPercent: pct,
                collapsed: pane.getCollapsed(),
            };
        });
        return { panes };
    }

    function reconcileLayout(reason: "mount" | "resize"): void {
        // Mount/unmount ({#if}) and ResizeObserver updates must apply immediately with 0ms transition.
        stopAnimating();
        const avail = measureAvailablePx();
        if (avail <= 0) return;

        availablePx = avail;
        const ordered = getOrderedPanes();
        if (ordered.length === 0) return;

        const states = buildSolverStates(ordered, avail);
        const solved =
            reason === "resize" && states.every((s) => s.extentPx !== undefined)
                ? solveContainerResize(states, avail)
                : solveInitialAndMountExtents(states, avail, rememberedExtents);

        applySolvedExtents(ordered, solved, avail, false);
    }

    function getAdjacentPaneIndices(
        handleId: string,
        ordered: SplitterPaneRegistration[],
    ): { leftIndex: number; rightIndex: number } | null {
        const handleReg = handleRegistrations.get(handleId);
        const handleEl = handleReg?.getElement();
        if (!handleEl || !handleEl.isConnected) return null;

        let leftIndex = -1;
        let rightIndex = -1;
        for (const [i, pane] of ordered.entries()) {
            const paneEl = pane.getElement();
            if (!paneEl) continue;
            const pos = handleEl.compareDocumentPosition(paneEl);
            if (pos & Node.DOCUMENT_POSITION_PRECEDING) {
                leftIndex = i;
            } else if (pos & Node.DOCUMENT_POSITION_FOLLOWING && rightIndex === -1) {
                rightIndex = i;
            }
        }

        if (leftIndex === -1 || rightIndex === -1) return null;
        return { leftIndex, rightIndex };
    }

    function setGlobalDragAttribute(active: boolean): void {
        if (typeof document === "undefined") return;
        if (active) {
            document.documentElement.dataset.splitterDragging = orientation;
        } else {
            delete document.documentElement.dataset.splitterDragging;
        }
    }

    function clearDragLock(): void {
        if (draggingHandleId !== null) {
            draggingHandleId = null;
        }
        setGlobalDragAttribute(false);
    }

    $effect(() => {
        if (!ref) return;
        const target = ref;
        const observer = new ResizeObserver(() => {
            reconcileLayout("resize");
        });
        observer.observe(target);
        untrack(() => {
            reconcileLayout("mount");
        });

        return () => {
            observer.disconnect();
        };
    });

    $effect(() => {
        // Re-run mount/layout reconciliation when panes, handles, orientation, variant, or size change.
        void registrationVersion;
        void orientation;
        void variant;
        void size;
        if (ref) {
            untrack(() => {
                reconcileLayout("mount");
            });
        }
    });

    function handleWindowBlur(): void {
        clearDragLock();
    }

    $effect(() => {
        if (draggingHandleId === null) return;
        window.addEventListener("blur", handleWindowBlur);
        return () => {
            window.removeEventListener("blur", handleWindowBlur);
            clearDragLock();
        };
    });

    $effect(() => stopAnimating);

    function togglePaneCollapseInternal(
        ordered: SplitterPaneRegistration[],
        paneIndex: number,
        preferredSiblingIndex: number,
        fromUser: boolean,
    ): void {
        const pane = ordered[paneIndex];
        if (!pane || !pane.getCollapsible()) return;

        const avail = measureAvailablePx();
        if (avail <= 0) return;
        availablePx = avail;

        const nextCollapsed = !pane.getCollapsed();
        const states = buildSolverStates(ordered, avail);
        const paneState = states[paneIndex];
        if (!paneState) return;

        const currentPx = paneState.extentPx ?? 0;

        if (nextCollapsed && currentPx > paneState.collapsedExtentPx) {
            preCollapseExtents.set(pane.id, currentPx);
        }

        pane.setCollapsed(nextCollapsed, fromUser);

        paneState.collapsed = nextCollapsed;
        const extents = states.map((s) => s.extentPx ?? 0);

        if (nextCollapsed) {
            const collapsedPx = paneState.collapsedExtentPx;
            const freed = Math.max(0, (extents[paneIndex] ?? 0) - collapsedPx);
            extents[paneIndex] = collapsedPx;
            const sibling = ordered[preferredSiblingIndex];
            const siblingState = states[preferredSiblingIndex];
            if (sibling && siblingState && !siblingState.collapsed) {
                extents[preferredSiblingIndex] = (extents[preferredSiblingIndex] ?? 0) + freed;
            }
        } else {
            const defaultExt = pane.getDefaultExtent();
            const fallbackDefault =
                defaultExt !== undefined
                    ? resolveExtentPx(defaultExt, avail)
                    : Math.max(paneState.minPx, avail / ordered.length);
            const targetPx = Math.min(
                paneState.maxPx,
                Math.max(paneState.minPx, preCollapseExtents.get(pane.id) ?? fallbackDefault),
            );
            const needed = Math.max(0, targetPx - (extents[paneIndex] ?? 0));
            extents[paneIndex] = targetPx;
            const sibling = ordered[preferredSiblingIndex];
            const siblingState = states[preferredSiblingIndex];
            if (sibling && siblingState && !siblingState.collapsed) {
                extents[preferredSiblingIndex] = Math.max(
                    0,
                    (extents[preferredSiblingIndex] ?? 0) - needed,
                );
            }
        }

        const fixed = new Set<number>([paneIndex]);
        const normalized = normalizeExtents(extents, states, avail, fixed);
        triggerAnimating();
        applySolvedExtents(ordered, normalized, avail, fromUser);
        if (fromUser) {
            onResize?.(buildResizeEvent(ordered));
            onResizeEnd?.(buildResizeEvent(ordered));
        }
    }

    setSplitterContext({
        get orientation() {
            return orientation;
        },
        get variant() {
            return variant;
        },
        get size() {
            return size;
        },
        get disabled() {
            return disabled;
        },
        get draggingHandleId() {
            return draggingHandleId;
        },
        registerPane(registration) {
            paneRegistrations.set(registration.id, registration);
            registrationVersion++;
            return () => {
                paneRegistrations.delete(registration.id);
                paneExtentsPx.delete(registration.id);
                registrationVersion++;
            };
        },
        registerHandle(registration) {
            handleRegistrations.set(registration.id, registration);
            registrationVersion++;
            return () => {
                handleRegistrations.delete(registration.id);
                if (draggingHandleId === registration.id) {
                    clearDragLock();
                }
                registrationVersion++;
            };
        },
        getPaneBasis(paneId) {
            const solved = paneExtentsPx.get(paneId);
            if (solved !== undefined) {
                return `${solved}px`;
            }
            const reg = paneRegistrations.get(paneId);
            if (!reg) return;
            if (reg.getCollapsed()) {
                const c = reg.getCollapsedExtent();
                return typeof c === "number" ? `${c}%` : c;
            }
            const spec = reg.getExtentProp() ?? reg.getDefaultExtent();
            if (spec === undefined) return;
            return typeof spec === "number" ? `${spec}%` : spec;
        },
        getPaneCollapsed(paneId) {
            return paneRegistrations.get(paneId)?.getCollapsed() ?? false;
        },
        getPaneInert(paneId) {
            const reg = paneRegistrations.get(paneId);
            if (!reg || !reg.getCollapsed()) return false;
            return isZeroExtent(reg.getCollapsedExtent());
        },
        notifyPaneCollapsedPropChanged(paneId, collapsed) {
            const ordered = getOrderedPanes();
            const idx = ordered.findIndex((p) => p.id === paneId);
            if (idx === -1) return;

            const avail = measureAvailablePx();
            if (avail <= 0) return;
            availablePx = avail;

            const states = buildSolverStates(ordered, avail);
            const targetState = states[idx];
            const targetPane = ordered[idx];
            if (!targetState || !targetPane) return;

            const extents = states.map((s) => s.extentPx ?? 0);
            const currentPx = extents[idx] ?? 0;

            if (collapsed) {
                if (currentPx > targetState.collapsedExtentPx) {
                    preCollapseExtents.set(paneId, currentPx);
                }
                extents[idx] = targetState.collapsedExtentPx;
            } else {
                const defaultExt = targetPane.getDefaultExtent();
                const fallbackDefault =
                    defaultExt !== undefined
                        ? resolveExtentPx(defaultExt, avail)
                        : Math.max(targetState.minPx, avail / ordered.length);
                extents[idx] = Math.min(
                    targetState.maxPx,
                    Math.max(targetState.minPx, preCollapseExtents.get(paneId) ?? fallbackDefault),
                );
            }

            const normalized = normalizeExtents(extents, states, avail, new Set([idx]));
            triggerAnimating();
            applySolvedExtents(ordered, normalized, avail, false);
        },
        notifyPaneExtentPropChanged(paneId, extent) {
            const ordered = getOrderedPanes();
            const idx = ordered.findIndex((p) => p.id === paneId);
            if (idx === -1) return;

            const avail = measureAvailablePx();
            if (avail <= 0) return;
            availablePx = avail;

            const states = buildSolverStates(ordered, avail);
            const extents = states.map((s) => s.extentPx ?? 0);
            extents[idx] = resolveExtentPx(extent, avail);

            const normalized = normalizeExtents(extents, states, avail, new Set([idx]));
            applySolvedExtents(ordered, normalized, avail, false);
        },
        getHandleAria(handleId): SplitterHandleAriaState {
            const ordered = getOrderedPanes();
            const pair = getAdjacentPaneIndices(handleId, ordered);
            if (!pair) {
                return {
                    prevPaneId: undefined,
                    valuenow: undefined,
                    valuemin: undefined,
                    valuemax: undefined,
                };
            }
            const leftPane = ordered[pair.leftIndex];
            const rightPane = ordered[pair.rightIndex];
            if (!leftPane || !rightPane) {
                return {
                    prevPaneId: undefined,
                    valuenow: undefined,
                    valuemin: undefined,
                    valuemax: undefined,
                };
            }
            const avail = availablePx;
            const leftPx = paneExtentsPx.get(leftPane.id) ?? 0;
            const rightPx = paneExtentsPx.get(rightPane.id) ?? 0;
            const pairTotal = leftPx + rightPx;
            if (pairTotal <= 0) {
                return { prevPaneId: leftPane.id, valuenow: 0, valuemin: 0, valuemax: 100 };
            }

            const leftMin = resolveExtentPx(
                leftPane.getCollapsed() ? leftPane.getCollapsedExtent() : leftPane.getMin(),
                avail,
            );
            const rightMin = resolveExtentPx(
                rightPane.getCollapsed() ? rightPane.getCollapsedExtent() : rightPane.getMin(),
                avail,
            );
            const leftMax = Math.min(resolveExtentPx(leftPane.getMax(), avail), pairTotal - rightMin);

            return {
                prevPaneId: leftPane.id,
                valuenow: Math.round((leftPx / pairTotal) * 100),
                valuemin: Math.max(0, Math.round((leftMin / pairTotal) * 100)),
                valuemax: Math.min(100, Math.round((Math.max(leftMin, leftMax) / pairTotal) * 100)),
            };
        },
        startDrag(handleId, clientPos) {
            if (disabled) return;
            const ordered = getOrderedPanes();
            const pair = getAdjacentPaneIndices(handleId, ordered);
            if (!pair) return;

            const avail = measureAvailablePx();
            if (avail > 0) {
                availablePx = avail;
            }

            const leftPane = ordered[pair.leftIndex];
            const rightPane = ordered[pair.rightIndex];
            if (!leftPane || !rightPane) return;

            dragLeftId = leftPane.id;
            dragRightId = rightPane.id;
            dragStartClientPos = clientPos;
            dragStartLeftPx = paneExtentsPx.get(dragLeftId) ?? 0;
            dragStartRightPx = paneExtentsPx.get(dragRightId) ?? 0;
            draggingHandleId = handleId;
            stopAnimating();
            setGlobalDragAttribute(true);
        },
        updateDrag(handleId, clientPos) {
            if (draggingHandleId !== handleId || disabled) return;
            const ordered = getOrderedPanes();
            const leftIdx = ordered.findIndex((p) => p.id === dragLeftId);
            const rightIdx = ordered.findIndex((p) => p.id === dragRightId);
            if (leftIdx === -1 || rightIdx === -1) return;

            const avail = availablePx;
            if (avail <= 0) return;

            const states = buildSolverStates(ordered, avail);
            const leftState = states[leftIdx];
            const rightState = states[rightIdx];
            const leftPane = ordered[leftIdx];
            const rightPane = ordered[rightIdx];
            if (!leftState || !rightState || !leftPane || !rightPane) return;

            const totalDelta = clientPos - dragStartClientPos;
            const result = solvePairDrag(
                leftState,
                rightState,
                dragStartLeftPx,
                dragStartRightPx,
                totalDelta,
                avail,
            );

            if (result.leftCollapsed !== leftState.collapsed) {
                if (result.leftCollapsed && dragStartLeftPx > leftState.collapsedExtentPx) {
                    preCollapseExtents.set(dragLeftId, dragStartLeftPx);
                }
                leftPane.setCollapsed(result.leftCollapsed, true);
            }
            if (result.rightCollapsed !== rightState.collapsed) {
                if (result.rightCollapsed && dragStartRightPx > rightState.collapsedExtentPx) {
                    preCollapseExtents.set(dragRightId, dragStartRightPx);
                }
                rightPane.setCollapsed(result.rightCollapsed, true);
            }

            const extents = states.map((s) => s.extentPx ?? 0);
            extents[leftIdx] = result.leftPx;
            extents[rightIdx] = result.rightPx;

            applySolvedExtents(ordered, extents, avail, true);
            onResize?.(buildResizeEvent(ordered));
        },
        endDrag(handleId) {
            if (draggingHandleId !== handleId) return;
            clearDragLock();
            const ordered = getOrderedPanes();
            onResizeEnd?.(buildResizeEvent(ordered));
        },
        stepHandle(handleId, direction, step) {
            if (disabled) return;
            const ordered = getOrderedPanes();
            const pair = getAdjacentPaneIndices(handleId, ordered);
            if (!pair) return;

            const avail = measureAvailablePx();
            if (avail <= 0) return;
            availablePx = avail;

            const stepPx = resolveExtentPx(step, avail) * direction;
            const states = buildSolverStates(ordered, avail);
            const leftState = states[pair.leftIndex];
            const rightState = states[pair.rightIndex];
            const leftPane = ordered[pair.leftIndex];
            const rightPane = ordered[pair.rightIndex];
            if (!leftState || !rightState || !leftPane || !rightPane) return;

            const leftPx = leftState.extentPx ?? 0;
            const rightPx = rightState.extentPx ?? 0;

            const result = solvePairDrag(leftState, rightState, leftPx, rightPx, stepPx, avail);

            if (result.leftCollapsed !== leftState.collapsed) {
                if (result.leftCollapsed && leftPx > leftState.collapsedExtentPx) {
                    preCollapseExtents.set(leftPane.id, leftPx);
                }
                leftPane.setCollapsed(result.leftCollapsed, true);
            }
            if (result.rightCollapsed !== rightState.collapsed) {
                if (result.rightCollapsed && rightPx > rightState.collapsedExtentPx) {
                    preCollapseExtents.set(rightPane.id, rightPx);
                }
                rightPane.setCollapsed(result.rightCollapsed, true);
            }

            const extents = states.map((s) => s.extentPx ?? 0);
            extents[pair.leftIndex] = result.leftPx;
            extents[pair.rightIndex] = result.rightPx;

            if (
                result.leftCollapsed !== leftState.collapsed ||
                result.rightCollapsed !== rightState.collapsed
            ) {
                triggerAnimating();
            }
            applySolvedExtents(ordered, extents, avail, true);
            const event = buildResizeEvent(ordered);
            onResize?.(event);
            onResizeEnd?.(event);
        },
        jumpHandle(handleId, target) {
            if (disabled) return;
            const ordered = getOrderedPanes();
            const pair = getAdjacentPaneIndices(handleId, ordered);
            if (!pair) return;

            const avail = measureAvailablePx();
            if (avail <= 0) return;
            availablePx = avail;

            const states = buildSolverStates(ordered, avail);
            const leftState = states[pair.leftIndex];
            const rightState = states[pair.rightIndex];
            const leftPane = ordered[pair.leftIndex];
            if (!leftState || !rightState || !leftPane) return;

            const leftPx = leftState.extentPx ?? 0;
            const rightPx = rightState.extentPx ?? 0;
            const pairTotal = leftPx + rightPx;

            let targetLeftPx: number;
            let nextLeftCollapsed = leftState.collapsed;

            if (target === "min") {
                if (leftState.collapsible) {
                    if (!leftState.collapsed && leftPx > leftState.collapsedExtentPx) {
                        preCollapseExtents.set(leftState.id, leftPx);
                    }
                    nextLeftCollapsed = true;
                    targetLeftPx = leftState.collapsedExtentPx;
                } else {
                    targetLeftPx = Math.max(leftState.minPx, pairTotal - rightState.maxPx);
                }
            } else {
                nextLeftCollapsed = false;
                targetLeftPx = Math.min(leftState.maxPx, pairTotal - rightState.minPx);
            }

            targetLeftPx = Math.max(0, Math.min(pairTotal, targetLeftPx));
            const targetRightPx = Math.max(0, pairTotal - targetLeftPx);

            if (nextLeftCollapsed !== leftState.collapsed) {
                leftPane.setCollapsed(nextLeftCollapsed, true);
                triggerAnimating();
            }

            const extents = states.map((s) => s.extentPx ?? 0);
            extents[pair.leftIndex] = targetLeftPx;
            extents[pair.rightIndex] = targetRightPx;

            applySolvedExtents(ordered, extents, avail, true);
            const event = buildResizeEvent(ordered);
            onResize?.(event);
            onResizeEnd?.(event);
        },
        toggleAdjacentCollapse(handleId) {
            if (disabled) return;
            const ordered = getOrderedPanes();
            const pair = getAdjacentPaneIndices(handleId, ordered);
            if (!pair) return;

            const leftPane = ordered[pair.leftIndex];
            const rightPane = ordered[pair.rightIndex];
            if (!leftPane || !rightPane) return;
            if (leftPane.getCollapsible()) {
                togglePaneCollapseInternal(ordered, pair.leftIndex, pair.rightIndex, true);
            } else if (rightPane.getCollapsible()) {
                togglePaneCollapseInternal(ordered, pair.rightIndex, pair.leftIndex, true);
            }
        },
        doubleClickHandle(handleId, action: SplitterDoubleClickAction) {
            if (disabled || action === "none") return;
            const ordered = getOrderedPanes();
            const pair = getAdjacentPaneIndices(handleId, ordered);
            if (!pair) return;

            const leftPane = ordered[pair.leftIndex];
            const rightPane = ordered[pair.rightIndex];
            if (!leftPane || !rightPane) return;

            if (action === "collapse") {
                if (leftPane.getCollapsible()) {
                    togglePaneCollapseInternal(ordered, pair.leftIndex, pair.rightIndex, true);
                } else if (rightPane.getCollapsible()) {
                    togglePaneCollapseInternal(ordered, pair.rightIndex, pair.leftIndex, true);
                }
                return;
            }

            // "reset": restore adjacent panes to defaultExtent (and uncollapse if collapsed)
            const avail = measureAvailablePx();
            if (avail <= 0) return;
            availablePx = avail;

            rememberedExtents.delete(leftPane.id);
            rememberedExtents.delete(rightPane.id);

            if (leftPane.getCollapsed()) leftPane.setCollapsed(false, true);
            if (rightPane.getCollapsed()) rightPane.setCollapsed(false, true);

            const states = buildSolverStates(ordered, avail);
            const extents = states.map((s) => s.extentPx ?? 0);
            const pairTotal = (extents[pair.leftIndex] ?? 0) + (extents[pair.rightIndex] ?? 0);

            const leftDef = leftPane.getDefaultExtent();
            const rightDef = rightPane.getDefaultExtent();

            if (leftDef !== undefined && rightDef === undefined) {
                const leftVal = resolveExtentPx(leftDef, avail);
                extents[pair.leftIndex] = leftVal;
                extents[pair.rightIndex] = Math.max(0, pairTotal - leftVal);
            } else if (rightDef !== undefined && leftDef === undefined) {
                const rightVal = resolveExtentPx(rightDef, avail);
                extents[pair.rightIndex] = rightVal;
                extents[pair.leftIndex] = Math.max(0, pairTotal - rightVal);
            } else if (leftDef !== undefined && rightDef !== undefined) {
                extents[pair.leftIndex] = resolveExtentPx(leftDef, avail);
                extents[pair.rightIndex] = resolveExtentPx(rightDef, avail);
            } else {
                extents[pair.leftIndex] = pairTotal / 2;
                extents[pair.rightIndex] = pairTotal / 2;
            }

            const fixed = new Set<number>([pair.leftIndex, pair.rightIndex]);
            const normalized = normalizeExtents(extents, states, avail, fixed);
            triggerAnimating();
            applySolvedExtents(ordered, normalized, avail, false);

            const event = buildResizeEvent(ordered);
            onResize?.(event);
            onResizeEnd?.(event);
        },
    });
</script>

<div
    bind:this={ref}
    class={["cs-splitter", className]}
    data-orientation={orientation}
    data-variant={variant}
    data-size={size}
    data-animate={animate ? "" : undefined}
    data-animating={animate && isAnimating ? "" : undefined}
    data-dragging={draggingHandleId !== null ? "" : undefined}
    data-disabled={disabled ? "" : undefined}
    {...rest}
>
    {@render children?.()}
</div>
