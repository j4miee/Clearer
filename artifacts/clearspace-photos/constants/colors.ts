/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#0E1314',
    tint: '#FF5A36',

    // Core surfaces
    background: '#E4E3DF',
    foreground: '#0E1314',

    // Cards / elevated surfaces
    card: 'rgba(255,255,255,0.76)',
    cardForeground: '#0E1314',

    // Primary action color (buttons, links, active states)
    primary: '#FF5A36',
    primaryForeground: '#FFFFFF',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#E7E6E1',
    secondaryForeground: '#334044',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#D9D8D3',
    mutedForeground: '#657074',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#FFC93C',
    accentForeground: '#493711',

    // Destructive actions (delete, error states)
    destructive: '#D94835',
    destructiveForeground: '#FFFFFF',

    // Borders and input outlines
    border: 'rgba(255,255,255,0.78)',
    input: 'rgba(14,19,20,0.18)',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 14,
};

export default colors;
