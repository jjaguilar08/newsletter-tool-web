// Shared Tailwind class-name conventions for the app's light theme - a
// single source of truth so every page/modal renders buttons, fields,
// tables, and cards the same way instead of each hand-rolling its own
// classes. Plain string constants, not components, so this file can be
// imported anywhere (including files that also export a component) without
// tripping eslint-plugin-react-refresh's only-export-components rule.
//
// Palette: Beacon's terracotta/cream/ink brand palette (see index.css's
// @theme block for the actual tokens) - terracotta for primary actions/
// links/focus rings/active states, the cream/ink/muted neutrals for
// surfaces/text/borders. Red is deliberately untouched by the rebrand and
// still means destructive actions/errors - it's a universal danger signal,
// not a brand color, same reasoning CampaignStatusBadge's own per-status
// colors (amber/blue/green, plus its neutral "draft" slate) are kept as-is
// rather than folded into the single new accent color.

const buttonBase =
    'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

const buttonBaseSm =
    'inline-flex items-center justify-center rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'

export const buttonPrimary = `${buttonBase} bg-beacon-terracotta text-beacon-cream-text hover:bg-beacon-terracotta-dark focus-visible:ring-beacon-terracotta`
export const buttonSecondary = `${buttonBase} border border-beacon-muted-banner bg-white text-beacon-ink hover:bg-beacon-cream focus-visible:ring-beacon-terracotta`
export const buttonDestructive = `${buttonBase} bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500`

// Compact variants for dense table-row action groups (Edit/Delete/View/
// Preview/Schedule/Send Now can all appear in one row) - same colors, less
// padding, so a row of five actions doesn't overwhelm the row height.
export const buttonPrimarySm = `${buttonBaseSm} bg-beacon-terracotta text-beacon-cream-text hover:bg-beacon-terracotta-dark focus-visible:ring-beacon-terracotta`
export const buttonSecondarySm = `${buttonBaseSm} border border-beacon-muted-banner bg-white text-beacon-ink hover:bg-beacon-cream focus-visible:ring-beacon-terracotta`
export const buttonDestructiveSm = `${buttonBaseSm} bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500`

// Icon-only variants of the Sm buttons above, for row-action groups
// (Campaigns/Subscribers list) rendered as a FontAwesomeIcon + aria-label +
// title (native tooltip) instead of visible text - a row of five actions
// as icons reads as one coherent toolbar instead of a wall of small text
// buttons. Circular/fixed-size rather than px/py padding since there's no
// label text to size around.
const iconButtonBase =
    'inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
export const iconButtonPrimary = `${iconButtonBase} bg-beacon-terracotta text-beacon-cream-text hover:bg-beacon-terracotta-dark focus-visible:ring-beacon-terracotta`
export const iconButtonSecondary = `${iconButtonBase} border border-beacon-muted-banner bg-white text-beacon-muted hover:bg-beacon-cream hover:text-beacon-ink focus-visible:ring-beacon-terracotta`
export const iconButtonDestructive = `${iconButtonBase} border border-red-200 bg-white text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:ring-red-500`

export const label = 'mb-1 block text-sm font-medium text-beacon-ink'

const controlBase =
    'block w-full rounded-md border border-beacon-muted-banner px-3 py-2 text-sm text-beacon-ink shadow-sm placeholder:text-beacon-muted/60 focus:border-beacon-terracotta focus:outline-none focus:ring-2 focus:ring-beacon-terracotta/30 disabled:bg-beacon-cream disabled:text-beacon-muted'

export const input = controlBase
export const select = controlBase
export const textarea = `${controlBase} min-h-32 resize-y`

export const fieldError = 'mt-1 text-sm text-red-600'

export const alertError =
    'rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700'

export const card = 'rounded-lg border border-beacon-muted-banner bg-white shadow-sm'

export const pageContainer = 'mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8'

export const pageHeading = 'font-serif text-2xl font-bold tracking-tight text-beacon-ink'

export const modalTitle = 'font-serif text-lg font-bold text-beacon-ink'

export const subheading = 'text-sm font-semibold uppercase tracking-wide text-beacon-muted'

export const sidebar =
    'flex w-64 shrink-0 flex-col justify-between border-r border-beacon-muted-banner bg-white px-4 py-6'

export const sidebarBrand = 'px-2 font-serif text-lg font-bold tracking-tight text-beacon-ink'

export const sidebarNav = 'mt-8 flex flex-col gap-1'

const sidebarNavLinkBase =
    'rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-beacon-terracotta focus-visible:ring-offset-2'

export const sidebarNavLink = `${sidebarNavLinkBase} text-beacon-muted hover:bg-beacon-cream hover:text-beacon-ink`
export const sidebarNavLinkActive = `${sidebarNavLinkBase} bg-beacon-terracotta/10 text-beacon-terracotta`

export const sidebarFooter = 'border-t border-beacon-muted-banner pt-4'

export const tableWrapper =
    'overflow-x-auto rounded-lg border border-beacon-muted-banner bg-white shadow-sm'
export const table = 'min-w-full divide-y divide-beacon-muted-banner'
export const tableHeadRow = 'bg-beacon-cream'
export const th =
    'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-beacon-muted'
export const tableBody = 'divide-y divide-beacon-muted-banner bg-white'
export const tableRow = 'hover:bg-beacon-cream'
export const td = 'px-4 py-3 text-sm whitespace-nowrap text-beacon-ink'
export const tdActions = 'px-4 py-3 text-sm'
export const rowActions = 'flex flex-wrap gap-2'

export const mutedText = 'text-sm text-beacon-muted'

// Paired constants for label/value stat rows (Dashboard's three summary
// cards) - pulled out as shared constants rather than left as each
// dt/dd's own hand-rolled classes, same "one file, not forty call sites"
// reasoning as everything else here.
export const statLabel = 'text-beacon-muted'
export const statValue = 'font-semibold text-beacon-ink'

export const emptyState =
    'rounded-lg border border-dashed border-beacon-muted-banner bg-beacon-cream px-6 py-12 text-center text-sm text-beacon-muted'

export const loadingState =
    'flex items-center justify-center gap-3 rounded-lg border border-beacon-muted-banner bg-white px-6 py-12 text-sm text-beacon-muted'

export const paginationBar =
    'flex flex-wrap items-center justify-between gap-3 border-t border-beacon-muted-banner bg-white px-4 py-3 text-sm text-beacon-muted'

export const modalOverlay =
    'fixed inset-0 z-50 flex items-center justify-center bg-beacon-ink/50 p-4'
export const modalPanel =
    'flex max-h-[90vh] w-full max-w-md flex-col overflow-y-auto rounded-lg bg-white p-6 shadow-xl'
export const modalPanelWide =
    'flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto rounded-lg bg-white p-6 shadow-xl'
// max-w-7xl (not max-w-5xl) - the HTML editor tab splits into a
// side-by-side code/preview layout that needs real room for both panes.
export const modalPanelXWide =
    'flex max-h-[90vh] w-full max-w-7xl flex-col overflow-y-auto rounded-lg bg-white p-6 shadow-xl'

export const formStack = 'space-y-4'
export const modalActions = 'mt-6 flex justify-end gap-3'

export const tabList = 'flex gap-1 border-b border-beacon-muted-banner'
const tabBase =
    'rounded-t-md border border-b-0 border-transparent px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-beacon-terracotta'
export const tabActive = `${tabBase} border-beacon-muted-banner bg-white text-beacon-terracotta`
export const tabInactive = `${tabBase} text-beacon-muted hover:text-beacon-ink`

export const monospaceTextarea = `${textarea} min-h-64 font-mono text-xs`

// ---------------------------------------------------------------------------
// Beacon marketing page (public landing page at "/" only) - same terracotta/
// cream/sage palette and serif display type as the app-shell constants
// above now use (see index.css's @theme block for the actual tokens), but
// kept in its own section since the landing page's component scale is
// different on purpose: big pill-shaped CTAs and generous section padding
// for a marketing page read as "buying," not as the compact, high-density
// rounded-md buttons/tables the authenticated app needs for real work.

export const beaconPage = 'min-h-screen bg-beacon-cream text-beacon-ink'

export const beaconHeader =
    'sticky top-0 z-10 flex items-center justify-between border-b border-beacon-muted-banner bg-beacon-cream/95 px-6 py-4 backdrop-blur sm:px-10'

export const beaconLogo = 'font-serif text-xl font-bold tracking-tight text-beacon-ink'

const beaconButtonBase =
    'inline-flex items-center justify-center rounded-full font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-beacon-terracotta focus-visible:ring-offset-2'

export const beaconButtonPrimary = `${beaconButtonBase} px-6 py-3 text-sm bg-beacon-terracotta text-beacon-cream-text hover:bg-beacon-terracotta-dark`
export const beaconButtonPrimarySm = `${beaconButtonBase} px-5 py-2 text-sm bg-beacon-terracotta text-beacon-cream-text hover:bg-beacon-terracotta-dark`
export const beaconButtonSecondary = `${beaconButtonBase} px-6 py-3 text-sm border border-beacon-ink/20 text-beacon-ink hover:bg-beacon-ink/5`

export const beaconSection = 'mx-auto max-w-6xl px-6 py-20 sm:px-10'
export const beaconSectionSage = 'bg-beacon-sage'

export const beaconEyebrow =
    'text-xs font-semibold uppercase tracking-[0.2em] text-beacon-terracotta'
export const beaconHeadline =
    'mt-3 font-serif text-4xl font-bold leading-tight text-beacon-ink sm:text-5xl'
export const beaconSubhead = 'mt-5 max-w-2xl text-lg leading-relaxed text-beacon-muted'

export const beaconCard = 'rounded-2xl border border-beacon-muted-banner bg-white p-6 shadow-sm'
export const beaconCardIcon =
    'flex h-11 w-11 items-center justify-center rounded-full bg-beacon-terracotta/10 text-beacon-terracotta'
export const beaconCardTitle = 'mt-4 font-serif text-lg font-bold text-beacon-ink'
export const beaconCardBody = 'mt-2 text-sm leading-relaxed text-beacon-muted'

export const beaconScreenshotFrame =
    'overflow-hidden rounded-xl border border-beacon-muted-banner bg-white shadow-lg'
export const beaconScreenshotCaption = 'mt-3 text-center text-sm font-medium text-beacon-muted'

export const beaconFormInput =
    'block w-full rounded-full border border-beacon-muted-banner bg-white px-5 py-3 text-sm text-beacon-ink placeholder:text-beacon-muted focus:border-beacon-terracotta focus:outline-none focus:ring-2 focus:ring-beacon-terracotta/30'
export const beaconFormSuccess = 'mt-3 text-sm font-medium text-green-700'
export const beaconFormError = 'mt-3 text-sm font-medium text-red-600'

export const beaconFooter =
    'border-t border-beacon-muted-banner bg-beacon-cream-footer px-6 py-10 text-center text-sm text-beacon-muted sm:px-10'
