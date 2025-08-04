# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

- **Development**: `npm run dev` - Start development server
- **Build**: `npm run build` - Build for production (creates `build/` directory)
- **Preview**: `npm run preview` - Preview production build locally
- **Lint**: `npm run lint` - Check code formatting with Prettier
- **Format**: `npm run format` - Auto-format code with Prettier
- **Fetch Google Docs**: `npm run gdoc` - Fetch content from Google Docs/Sheets (configured in `google.config.js`)
- **Style Dictionary**: `npm run style` - Regenerate CSS/JS style tokens from `properties/` folder
- **Deploy Staging**: `make staging` - Build and deploy to GitHub Pages
- **Deploy Production**: `make production` - Build and deploy to production (AWS)
- **Password Protect**: `make protect` - Create password-protected build (requires `.env` with `PASSWORD=yourpassword`)

## Architecture Overview

This is a **SvelteKit 5** project using the Pudding's data journalism starter template with:

### Key Technologies
- **SvelteKit 5** with runes enabled (`svelte.config.js`)
- **Static site generation** via `@sveltejs/adapter-static`
- **ArchieML** for Google Docs/Sheets integration as micro-CMS
- **Style Dictionary** for design token management
- **D3.js** for data visualization
- **Runed** for Svelte 5 rune utilities
- **bits-ui** for headless UI components

### Project Structure
- `src/routes/` - SvelteKit pages and routing
- `src/components/` - Reusable Svelte components
  - `src/components/helpers/` - Utility components (Scrolly, etc.)
  - `src/components/layercake/` - Chart components for LayerCake
- `src/actions/` - Svelte actions (focusTrap, inView, resize, etc.)
- `src/runes/` - Custom Svelte 5 runes (useWindowDimensions, useClipboard, etc.)
- `src/utils/` - JavaScript utilities
- `src/styles/` - Global CSS and style system
- `properties/` - Style Dictionary design tokens (color, font-size, category)
- `static/assets/` - Static assets accessible at build time
- `tasks/` - Build scripts for Google Docs fetching and style processing

### Data Integration
- **Embedded data**: Import CSV/JSON directly with `import data from "$data/file.csv"`
- **Server-side processing**: Use `+page.server.js` to process data and optimize client payload
- **Google Docs/Sheets**: Configure in `google.config.js`, fetch with `npm run gdoc`

### Styling System
- Style Dictionary manages design tokens in `properties/` folder
- Global styles in `src/styles/app.css`
- Custom fonts go in `static/assets/` and reference in `src/styles/font.css`
- CSS utility classes available in `reset.css` (`.sr-only`, `.text-outline`)

### Import Aliases
- `$components` → `src/components`
- `$actions` → `src/actions`
- `$runes` → `src/runes`
- `$utils` → `src/utils`
- `$data` → `src/data`

### Deployment
- **GitHub Pages**: Uses `docs/` folder, deployed via `make staging`
- **Production AWS**: Configured for pudding.cool domain
- **Password Protection**: Available via `make protect` command

### Migration Notes
- This project is actively migrating to Svelte 5
- Some components in `src/components/*/migrate/` folders need Svelte 5 migration
- LayerCake components require separate `layercake` package installation