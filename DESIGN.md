# GeoTracker Design System & UI Specification

## 1. Core Philosophy & Aesthetic
* **Style Name:** Technical Retro-Futurist / Neo-Brutalist Light Mode / Print-to-Web.
* **Vibe:** Academic, deeply technical, hyper-modern, and engineered. It should feel like a high-end physical technical manual or a 1980s blueprint brought to the web.
* **Core Principles:**
  * **Zero Border Radius:** Everything is sharp. No rounded corners on buttons, inputs, or containers (unless it's a perfect circle).
  * **Visible Structure:** Use thin, 1px borders to create a bento-box grid structure. Let the user see the "skeleton" of the page.
  * **High Contrast, Low Saturation:** Rely on stark black-and-white contrasts with intentional, highly saturated accent colors.

## 2. Color Palette
* **Background (Base):** Off-White / Cream (`#F9F9F9` or `#FAF9F6`). Avoid pure white to maintain the "vintage paper" feel.
* **Background (Secondary):** Light Gray (`#EAEAEA`) for alternate bento-box panels.
* **Text (Primary):** Pitch Black (`#000000`) or very dark charcoal (`#111111`) for maximum legibility.
* **Text (Muted):** Medium Gray (`#666666`) for secondary descriptions and subtext.
* **Accent Color:** Electric Blue (`#0055FF` or similar). Used sparingly but deliberately for primary CTA buttons, active states, text highlights, and the hero image glow.
* **Borders & Grid:** Faint Gray (`#E5E5E5`) for the 1px structural lines.

## 3. Typography
* **Primary Headings (H1, H2, H3):** A clean, heavy, modern Sans-Serif (e.g., *Inter*, *Geist*, *Helvetica Neue*).
  * *Weight:* Bold (700) or Extra Bold (800).
  * *Tracking:* Tight (slightly negative letter-spacing).
* **Body Text (Paragraphs):** Clean Sans-Serif, high legibility.
  * *Weight:* Regular (400) or Medium (500).
* **Technical Accent / Micro-copy:** A crisp Monospace font (e.g., *JetBrains Mono*, *Fira Code*, *SF Mono*).
  * *Usage:* Navigation links, small labels, coordinate data, system status, metadata (e.g., `SYS_UPTIME: 99.9%`, `COORD_REF: 40.7128 N`).
  * *Styling:* Often ALL CAPS and significantly smaller than body text.

## 4. Layout & Grid System
* **Global Background:** The entire canvas is overlaid with a subtle, faint engineering blueprint grid (e.g., 50px by 50px squares).
* **Containers:** Content is constrained to a maximum width (e.g., `max-w-6xl`) but divided internally using sharp 1px vertical and horizontal borders that stretch to the edges of the container.
* **Bento Box UI:** Feature sections are divided into rigid rectangular blocks. There are no gaps (`gap-0`) between these blocks; they share 1px borders.

## 5. UI Components

### Buttons
* **Primary Button:** Solid Electric Blue background, white text, 0px border radius. 
* **Secondary Button:** Transparent background, 1px solid black border, black text, 0px border radius.
* **Micro-Tags:** Small rectangular badges (e.g., `CORE_MODULE`) with a solid blue background and tiny white monospace text.

### Inputs (Search/Forms)
* Minimalist. No full bounding box.
* Transparent background with only a 1px bottom border (black or blue on focus).
* Attached directly to a sharp-edged action button (e.g., the "DISCOVER" button attached to the URL input).

### Icons
* Thin-line, geometric, and minimalist (e.g., Lucide Icons or custom SVG).
* Accented with the primary Electric Blue.

## 6. Visual Assets & Imagery
* **No standard photographs.** * Imagery must be processed using **Halftone** or **1-bit Dither** effects to look like vintage print matrices.
* **Hero Image:** A stylized, dithered graphic (e.g., The Earth and the Eye of Providence) placed on a textured off-white background.
* **Aura Effect:** Apply a soft, radial ambient glow (Electric Blue) behind the hero asset to create depth against the flat grid background.