# Credits

Squad desk keeps its own palette, type, and split-flap board. A few controls borrow interaction ideas from [Uiverse Galaxy](https://github.com/uiverse-io/galaxy) (MIT) and are rewritten in React under `src/ui/desk.tsx`:

- Buttons: a sliding fill on hover, the common Galaxy button gesture, retinted to paper, signal red, and ink.
- Cards: a lifted paper card with a clip, in place of the neon hover cards in `Cards/`.
- Inputs: a paper field with a signal focus ring, in place of the glow inputs in `Inputs/`.
- Toggle: a track-and-knob switch, in place of the switches in `Toggle-switches/`.
- Loader: three flipping tiles, in place of the spinners in `loaders/`.

The split-flap header is original. It is not the Aceternity text flipping board.

Smooth scrolling is [Lenis](https://github.com/darkroomengineering/lenis) (MIT). Accounts, tables, and the squad agent run on [Appwrite](https://github.com/appwrite/appwrite) (BSD).
