# AI Translation App Design Guidelines

## Design Approach

**System:** Shadcn UI + Modern SaaS Dashboard Aesthetic

Drawing inspiration from Linear's clean productivity interface, Vercel's dashboard design, and Notion's multi-panel layouts. This utility-focused application prioritizes clarity, efficiency, and information density over visual flair.

## Core Design Principles

1. **Information Hierarchy:** Clear visual separation between panels and functional areas
2. **Efficient Workflows:** Minimal clicks to perform translation tasks
3. **Scannable Content:** Easy identification of translation history and outputs
4. **Professional Polish:** Clean, modern interface appropriate for business use

---

## Typography

**Font Families:**
- Primary: Inter (sans-serif) - clean, professional, excellent readability
- Monospace: JetBrains Mono - for API keys and technical content

**Type Scale:**
- Page Headers: text-2xl font-semibold (Admin pages, settings sections)
- Panel Headers: text-lg font-medium (Translation History, Input, Output panel titles)
- Section Labels: text-sm font-medium uppercase tracking-wide (Form labels, tab labels)
- Body Text: text-base (Input/output content, translation text)
- Secondary Text: text-sm text-muted-foreground (Metadata, timestamps, helper text)
- Micro Text: text-xs (Character counts, status indicators)

---

## Layout System

**Spacing Primitives:** Use Tailwind units of 2, 4, 6, and 8 for consistency
- Micro spacing: p-2, gap-2 (tight groups)
- Standard spacing: p-4, gap-4, m-4 (default component padding)
- Section spacing: p-6, gap-6 (panel headers, form sections)
- Large spacing: p-8, gap-8 (page margins, major sections)

**Three-Panel Layout:**

**Desktop (lg and above):**
- Left Sidebar (Translation History): w-80 (20rem) - fixed width
- Middle Panel (Input): flex-1 with max-w-3xl - flexible, centered content
- Right Panel (Output): flex-1 with max-w-3xl - flexible, centered content
- Panel separation: 1px border dividers
- Container: Full viewport height with overflow handling per panel

**Tablet (md):**
- Stack panels vertically or use collapsible sidebar
- Middle and right panels take full width when sidebar collapsed

**Mobile:**
- Single column stack
- Tab-based navigation between History, Input, Output views

**Admin Layout:**
- Single panel, centered content with max-w-4xl
- Tabbed navigation at top of content area
- Form layouts with clear section grouping

---

## Component Library

### Authentication

**Login Page:**
- Centered card on full-height page
- App logo/title at top (text-3xl font-bold)
- "Sign in with Google" button (large, prominent)
- Clean background with subtle gradient or pattern
- Card: max-w-md, p-8, rounded-lg, shadow-lg

### Navigation Header

**Structure:**
- Full-width header, h-16, border-b
- Left: App logo/title (text-xl font-semibold)
- Center: Navigation tabs (Translate, Proofread) - pill-style active states
- Right: User avatar dropdown (Settings, Logout)
- Sticky positioning (sticky top-0)

**Tab Navigation:**
- Use Shadcn Tabs component
- Horizontal layout with underline indicator
- Active tab: font-medium with accent underline
- Inactive: text-muted-foreground with hover state

### Left Panel: Translation History

**Panel Structure:**
- Header with "Translation History" title + "New" button
- Scrollable list of saved translations
- Each item shows: title, date, language count
- Hover state reveals rename/delete icons
- Active translation highlighted with subtle background

**List Items:**
- p-4 padding per item
- border-b dividers
- Truncate long titles with ellipsis
- Right-aligned metadata (date, badge count)
- Rename: inline edit with input field

### Middle Panel: Input

**Structure:**
- Header section with controls (h-20)
  - Language multi-select (Combobox with checkboxes)
  - Model selector (Dropdown)
  - Translate button (primary, prominent)
- Textarea for input text (flex-1, full height, resize-none)
- Character counter in bottom-right corner

**Controls Layout:**
- Horizontal flex layout with gap-4
- Multi-select: min-w-64
- Model selector: min-w-48
- Translate button: ml-auto (right-aligned), with loading spinner state

**Textarea:**
- Minimal border styling (border rounded-md)
- Placeholder text: "Enter text to translate..."
- p-4 padding for comfortable typing
- Focus state: ring accent color

### Right Panel: Output

**Structure:**
- Header with language tab selector
- Editable textarea for each translation
- Copy button in top-right corner of textarea
- Status indicators (loading, success, error)

**Language Tabs:**
- Use Shadcn Tabs in pills variant
- Horizontal scrollable if many languages selected
- Each tab shows language name + flag emoji
- Badge indicator if translation has unsaved edits

**Translation Display:**
- Editable textarea matching input styling
- Same height as input panel for visual balance
- Loading skeleton while translating
- Error state with retry option

### Admin Settings

**Layout:**
- Page header: "Settings" with breadcrumb
- Horizontal tabs: API Keys, Translation, Proof Read (disabled)
- Content area with max-w-4xl, p-8

**API Keys Tab:**
- Two sections: OpenAI API Key, Anthropic API Key
- Each section: Label, password input field, Save button
- Show masked key if saved (•••••key_suffix)
- Edit button to reveal/change key

**Translation Settings Tab:**

*System Prompt Section:*
- Large textarea (h-48) for prompt editing
- Character count indicator
- Save button below

*Models Section:*
- Table layout: Model Name | Provider | Default | Actions
- Add Model button (opens dialog)
- Dialog includes: Name input, Provider select, Default checkbox
- Delete icon in Actions column

*Languages Section:*
- Grid of language chips (3-4 columns)
- Each chip: Language name, remove icon
- Add Language button (opens combobox dialog)

**Proof Read Tab:**
- Placeholder state with "Coming soon" message
- Disabled/muted appearance

### Buttons & Interactive Elements

**Button Hierarchy:**
- Primary: Translate button, Save buttons (solid background, prominent)
- Secondary: New Translation, Add Model (outline style)
- Ghost: Delete, Edit actions (hover shows background)
- Icon buttons: 24x24 click targets minimum

**Form Controls:**
- Use Shadcn Select for single-choice dropdowns
- Use Shadcn Combobox for searchable multi-select
- Checkbox: Shadcn Checkbox component
- Input fields: consistent h-10 height, rounded-md borders

### Data Display

**Translation List Items:**
- Compact card design with hover elevation
- Title (font-medium), metadata row (text-sm text-muted-foreground)
- Badge indicators for language count
- Icon buttons appear on hover (rename, delete)

**Settings Tables:**
- Striped rows for readability (even rows with subtle background)
- Header row with font-medium labels
- Adequate cell padding (p-4)
- Hover state on rows

### Status & Feedback

**Loading States:**
- Skeleton loaders for translation content
- Spinner on Translate button when processing
- Progress indicator if tracking translation progress

**Empty States:**
- Centered content with icon, message, action button
- "No translations yet. Create your first one!" in history panel
- Subtle illustrations or icons

**Error States:**
- Alert component (Shadcn Alert) with error variant
- Clear error messages with retry action
- Inline validation errors on forms

**Success States:**
- Toast notifications (Shadcn Toast) for save confirmations
- Checkmark icons for completed translations

---

## Responsive Behavior

**Breakpoints:**
- Mobile: < 768px (single column)
- Tablet: 768px - 1024px (two columns or stacked)
- Desktop: > 1024px (three panels)

**Panel Behavior:**
- Desktop: Side-by-side panels with scroll per panel
- Tablet: Collapsible sidebar, main content adjusts
- Mobile: Tab navigation between views, full-width panels

---

## Accessibility

- All interactive elements have focus states (ring-2 ring-offset-2)
- Skip navigation link for keyboard users
- ARIA labels on icon-only buttons
- Color contrast meets WCAG AA standards
- Keyboard shortcuts for common actions (Cmd+Enter to translate)

---

## Animations

Use sparingly for functional feedback only:
- Smooth panel transitions (transition-all duration-200)
- Button loading states (spinning icon)
- Tab switching (slide animation)
- Toast notifications (slide-in from top-right)
- NO decorative animations