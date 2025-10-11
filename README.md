## Pomodoro Timer App

A minimal Pomodoro timer built with Next.js (App Router), React, TypeScript, Tailwind CSS, and Sera UI primitives. The timer keeps focus and break sessions on track, remembers your preferences locally, and stays responsive from mobile through desktop.

### Core Features
- Focus, short break, and optional long break cycles with automatic switching.
- Start, pause, reset, and skip controls implemented with the Sera UI button component.
- Visual progress indicator, mode pill, and tabular countdown for easy scanning.
- Custom durations, long break cadence, and sound toggle persisted to `localStorage`.
- Optional chime and browser notification at the end of each interval using the Web Audio and Notifications APIs.

### Development

Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to use the timer. The UI updates instantly while you edit files under `src/`.

### Build & Lint

```bash
npm run build
```

The build command runs type-checking, linting, and outputs the production build.

### Project Structure
- `src/app/` – Next.js App Router entry points and global styles.
- `src/components/` – UI building blocks (`ui/`) and the `pomodoro` feature module.
- `src/hooks/use-timer.ts` – Encapsulated timer logic, persistence, and interval cleanup.
- `src/lib/utils.ts` – Shared helpers (e.g., class name merger for styling).

### Accessibility & Responsiveness
- Keyboard-accessible buttons with descriptive `aria-label`s.
- High-contrast color palette with dark-mode support.
- Layout adapts gracefully from 320px mobile to large desktop viewports.

### Future Enhancements
Potential next steps include task tracking, richer notifications, statistics, PWA support, or authentication. These are out of scope for the current MVP but can be layered on thanks to the modular hook-based architecture.
