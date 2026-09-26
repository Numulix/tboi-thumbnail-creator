# Isaac Thumbnail Studio

A studio workbench for designing authentic The Binding of Isaac: Repentance YouTube thumbnails with pixel-accurate game backdrops, modular character stacks, pedestal formations, and multi-layer vector typography.

## Language

**Scene**:
The complete declarative state of a thumbnail composition, including room backdrop, camera framing, character stack, pedestal slots, and typography layers.
_Avoid_: Canvas state, document model, project file

**Stage Coordinates**:
The canonical 1280x720 pixel coordinate space of the thumbnail canvas in which all visual nodes are positioned, rotated, and hit-tested.
_Avoid_: Screen coords, viewport coords, client coords

**Gizmo Geometry**:
The 2D bounding boxes, rotation stalks, and corner resize handles computed for an active stage node to support rendering and pointer hit-testing.
_Avoid_: Transform box, bounding rect, selection frame

**Canvas Interaction Controller**:
The in-memory engine that accepts stage-space pointer gestures and transforms them into node selection, translation, rotation, and scaling updates.
_Avoid_: Event handler, drag manager, pointer service

**Character Stack**:
A layered composite of pixel-art sprites representing a playable Isaac character, their active pose, and optional Eden hairstyle.
_Avoid_: Player sprite, character avatar

**Pedestal Formation**:
A structured geometric arrangement (arc, row, 2x2 grid, flank) for 3 to 6 item altars with collectibles, price tags, and quality glows.
_Avoid_: Item rack, altar layout
