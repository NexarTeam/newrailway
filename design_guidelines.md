# NexarOS Design Guidelines

## Design Philosophy
Create a **premium, futuristic gaming console interface** inspired by Xbox/PlayStation UI systems. The interface must feel like a native console OS with smooth animations, controller-friendly navigation, and a dark cyberpunk aesthetic.

## Color System (STRICT - DO NOT DEVIATE)

**Primary Palette:**
- Background Primary: `#000000` or `#111111`
- Background Secondary (panels/cards): `#1A1A1A`
- Accent Red (Nexar brand): `#d00024`
- Text Primary: `#EAEAEA`
- Text Secondary/Muted: `#A3A3A3`

**Visual Effects:**
- Red glow effects on hover/focus states (box-shadow with #d00024)
- Subtle red borders for active/selected elements
- Gradient overlays using black-to-transparent for depth

## Typography

**Hierarchy:**
- Page Titles: Bold, 2.5rem-3rem, uppercase tracking
- Section Headers: Semi-bold, 1.5rem-2rem
- Game Titles/Cards: Medium, 1.25rem
- Body Text: Regular, 0.875rem-1rem
- Labels/Metadata: Small, 0.75rem-0.875rem, text-secondary color

**Font Selection:** Modern sans-serif (Inter, Geist, or system font stack). Prioritize readability on dark backgrounds.

## Layout & Spacing

**Spacing Scale:** Use Tailwind units: `2, 4, 6, 8, 12, 16, 20, 24` for consistent rhythm

**Page Structure:**
- Full-width layouts with max-width container (`max-w-7xl`)
- Generous padding: `p-6` mobile, `p-8` tablet, `p-12` desktop
- Card spacing: `gap-4` to `gap-6` in grids

## Component Library

### Navigation
- **Sidebar Navigation** (persistent, left-aligned, 240px width)
  - Vertical nav items with icons
  - Active state: red accent bar + glow
  - Smooth hover transitions
  
### Game Cards
- **Aspect Ratio:** 3:4 portrait for cover art
- **Structure:** Image + title overlay at bottom with dark gradient
- **Hover State:** Scale transform (1.05), red glow border, brightness increase
- **Information:** Game title, install status badge, play time

### Carousel/Featured Content
- **Hero Carousel** on Home: Large format (16:9), auto-playing with manual controls
- Smooth transitions between slides
- Overlay text on bottom-left with CTA button

### Buttons
- **Primary CTA:** Red background (#d00024), white text, rounded-lg, hover: brighten
- **Secondary:** Outlined red border, transparent bg, red text
- **Icon Buttons:** Circular or square, red on hover/active

### Modals/Overlays
- Dark backdrop (bg-black/80)
- Centered panels with #1A1A1A background
- Red accent border-top
- Smooth fade + scale animation entry

## Page-Specific Designs

### Home Screen
- Hero carousel at top (large, full-width)
- "Continue Playing" horizontal scrollable section
- Quick action tiles grid (3-4 columns): Store, Library, Settings, Downloads

### Game Library
- Grid layout: 4-6 columns on desktop, responsive
- Filter/sort controls at top
- Search bar with red focus state
- Empty state: centered message with icon

### Nexar Games Store
- Featured section at top (large cards, 2-3 games)
- Category browsing tabs
- Grid of game cards below
- Individual game page: Split layout (cover left, details right)

### Downloads & Installations
- List view of active downloads
- Progress bars with red fill
- Install status badges
- Action buttons (pause, cancel, play)

### Settings
- Tab navigation (left side)
- Form elements with dark inputs, red focus borders
- Toggle switches with red active state
- System info in card format

## Animations & Interactions

**Use Framer Motion for:**
- Page transitions: fade + slide
- Card hover: scale + glow
- Modal entry/exit: fade + scale from center
- List stagger animations: sequential fade-in

**Timing:** Fast interactions (150-200ms), moderate transitions (300ms), page changes (400ms)

## Keyboard Navigation
- Visible focus states (red outline + glow)
- Tab order follows visual hierarchy
- Arrow key support for grids/carousels
- Enter/Space for activation

## Images

**Game Cover Art:**
- User-uploaded or placeholder gradient with game initial
- Aspect ratio 3:4, always fill container
- Lazy load for performance

**No Hero Images:** This is an application UI, not a marketing site. Focus on functional layouts and game content display.

## Accessibility
- Minimum contrast ratio: 4.5:1 for text
- Focus indicators on all interactive elements
- ARIA labels for icon-only buttons
- Keyboard navigable throughout