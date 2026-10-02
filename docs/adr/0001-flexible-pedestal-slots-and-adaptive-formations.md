# Flexible Pedestal Slots and Adaptive Formations

We expanded the allowed pedestal count from a rigid 3–6 range to 0–12 altars and updated the formation layout engine to adapt geometrically for larger counts, while preserving stable slot identities and manual drag offsets across additions and deletions.

## Context

Previously, the workbench enforced a hard limit of 3 to 6 pedestals, preventing users from creating single-item showcase thumbnails (e.g. 1 god-tier item) or large multi-item run thumbnails (7–12 items). Formations were mathematically tuned only for small counts, causing high counts to overflow the canvas height or overlap the character in the center.

## Decision

1. **Count Bounds (0–12)**: The scene supports between 0 and 12 pedestals. A count of 0 allows character-only or room-only compositions, while 12 provides an expressive ceiling that stays legible on YouTube's 180×101 feed view.
2. **Adaptive Formation Geometry**: Formations dynamically adjust their layout parameters when count exceeds 6: `grid-2x2` expands to 3–4 columns to remain within vertical stage bounds, `flank` organizes altars into left and right wings around Isaac, and `arc`/`row` dynamically widen and scale spacing.
3. **Stable Slot Identity and Offset Retention**: Removing a pedestal from the middle preserves the original IDs and manual drag offsets of remaining pedestals. Manual drag offsets are only cleared when the user explicitly clicks "Reset Positions" or selects a new formation preset.
4. **Curated Starter Pool**: Expanded `STARTER_PEDESTAL_POOL` to 12 iconic, distinct collectibles spanning all qualities and altar styles to avoid duplicate fallback items when expanding counts.

## Consequences

- Formations remain visually balanced across all counts (0 to 12) without breaking canvas boundaries.
- Canvas interaction and gizmo selection remain stable during additions and deletions because slot IDs do not undergo positional renumbering.
