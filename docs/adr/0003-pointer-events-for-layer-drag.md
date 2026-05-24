# Pointer Events for Layer Drag-and-Drop

Layer reordering uses pointer events (`pointerdown` / `pointermove` / `pointerup` on `window`)
rather than the HTML5 Drag-and-Drop API.

HTML5 drag-and-drop was rejected because the browser-controlled ghost image is hard to style in
a dense panel, drag events fire erratically during fast moves, and placing a precise insertion-line
indicator requires extra coordinate work. Pointer events give full control over ghost styling,
insertion-line placement, and pointer capture — consistent with how `NumericInput` scrub is
implemented (ADR 0002).
