# North-Star UX Implementation Plan

## Current State vs Target State

### What We Have ✅
- Basic Brief capture (businessName, industry, offerings, differentiators, goals, tone, strictness)
- WebBlock types (hero, features, services, contact, footer, nav, etc.)
- Mock generation working
- Canvas preview with block rendering
- Basic SEO types
- BrandTokens structure

### What's Missing 🔴
1. **Two-Path Entry**: AI-Built vs Custom choice
2. **Company Details**: Logo upload, email/phone/address, tagline
3. **Color Extraction**: Logo → palette with WCAG contrast
4. **Page Selection**: Checkboxes for Home, About, Solutions, Pricing, etc.
5. **E-commerce**: Stripe/PayPal, Products, digital downloads
6. **Legal Pages**: Auto-generated Privacy, Terms, AI Disclaimer
7. **Integrations**: Analytics (GA4), Newsletter (Mailchimp/Beehiiv), GitHub
8. **Templates**: 12 starter templates (classic-hero, saas-lite, etc.)
9. **AI Chat Builder**: Conversational edits with undo/redo
10. **Publishing**: Netlify, VPS, Export ZIP
11. **Version History**: Diffs, compare, restore
12. **Preview URL**: /preview/{siteId} with shareable link

## Implementation Phases

### Phase 1: Foundation & Data Model (2-3 hours)
**Goal**: Extend types and database schema

#### Tasks:
1. Extend `Site` type with:
   - company (name, tagline, description, email, phone, address, logoUrl)
   - theme.mode ("match-logo" | "manual")
   - theme.templateId
   - ecommerce (enabled, providers, products)
   - legal flags
   - integrations

2. Create `Product` type for digital goods

3. Add database migrations:
   - sites table updates
   - products table
   - versions table (for undo/redo)
   - integrations table

4. Create RPC functions:
   - ensure_default_site
   - extract_logo_palette
   - generate_legal_pages

**Deliverable**: Full type system + database schema

---

### Phase 2: Entry Flow & Brief Capture (3-4 hours)
**Goal**: "How do you want to build?" → Brief in 90 seconds

#### Tasks:
1. Create `BuildModeSelector` component:
   - AI-Built (chat-first)
   - Custom (wizard/templates)

2. Extend `BriefPanel` with:
   - Logo upload with preview
   - Email, phone, address fields
   - Tagline field
   - "Match colors to logo" checkbox
   - Page selection checkboxes (Home, About, Services, Pricing, Contact, Blog, Legal, etc.)
   - Stripe/PayPal checkboxes
   - Newsletter provider dropdown
   - Analytics GA4 ID input

3. Create `LogoUploader` component:
   - Drag & drop
   - Preview
   - Triggers color extraction on upload

4. Create color extraction service:
   - Uses ColorThief algorithm (client-side for demo)
   - Generates palette: primary, secondary, accent, bg, fg
   - Validates WCAG AA contrast ratios
   - Adjusts if needed

**Deliverable**: Complete brief capture in <90 seconds

---

### Phase 3: Template System (2-3 hours)
**Goal**: 12 templates with full designs

#### Templates to Build:
1. `classic-hero` - Traditional business
2. `saas-lite` - SaaS landing page
3. `product-focus` - Product showcase
4. `portfolio` - Creative portfolio
5. `consulting` - Professional services
6. `ecommerce-digital` - Digital store
7. `blog-first` - Content-focused
8. `agency` - Marketing agency
9. `local-service` - Local business
10. `event` - Event/conference
11. `creator` - Personal brand
12. `one-page` - Single page site

#### Tasks:
1. Create `templates/` directory with JSON definitions
2. Each template defines:
   - Default page structure
   - Block arrangements
   - Color scheme defaults
   - Typography settings
   - Section presets

3. Create `TemplateSelector` component
4. Create template preview thumbnails

**Deliverable**: 12 working templates

---

### Phase 4: Smart Generation (3-4 hours)
**Goal**: AI creates complete multi-page sites

#### Tasks:
1. Update `website-draft` edge function:
   - Accept full Site model
   - Generate multiple pages based on selections
   - Auto-fill legal pages with company variables
   - Create SEO meta for all pages
   - Generate sitemap.xml structure
   - Generate robots.txt

2. Create legal page templates:
   - Privacy Policy with {{company.name}}, {{company.email}}
   - Terms of Service
   - AI Outputs Disclaimer
   - Copyright footer

3. Enhance mock generator (or wire to real AI):
   - Generate based on selected template
   - Create multiple pages (Home, About, Services, etc.)
   - Apply logo palette if mode = "match-logo"
   - Include nav, footer on all pages
   - Add products to store page if ecommerce enabled

**Deliverable**: Multi-page generation working

---

### Phase 5: Preview & Navigation (2-3 hours)
**Goal**: /preview/{siteId} with page switcher

#### Tasks:
1. Create `PreviewShell` component:
   - Top nav with site name
   - Page list dropdown
   - Current page indicator
   - Edit/Preview toggle
   - Device size toggles (mobile/tablet/desktop)

2. Update `CanvasPanel`:
   - Full-page preview mode
   - Nav between pages
   - Live updates

3. Create shareable preview links:
   - Generate preview token
   - Optional password protection
   - /preview/{siteId}?token={token}

**Deliverable**: Full preview experience

---

### Phase 6: AI Chat Builder (4-5 hours)
**Goal**: Conversational edits with undo/redo

#### Tasks:
1. Create `AIChatPanel` component:
   - Chat interface
   - Message history
   - Typing indicators
   - Preset action buttons:
     - Change palette
     - Swap template
     - Add page
     - Rewrite section
     - Add product

2. Create `/api/ai/apply` endpoint:
   - Parse natural language requests
   - Generate JSON patches
   - Apply to site model
   - Return updated site + diff

3. Implement version control:
   - Store each change as version
   - Undo/redo stack
   - Compare view
   - Restore to any version

4. Preset actions:
   - "Make buttons rounded"
   - "Switch to deep blue palette"
   - "Rewrite About to be friendlier"
   - "Add Case Studies page"
   - "Create Pricing FAQ section"
   - "Add digital product 'Website Manual' for $29"

**Deliverable**: Working AI chat with undo/redo

---

### Phase 7: E-commerce (3-4 hours)
**Goal**: Stripe/PayPal with digital products

#### Tasks:
1. Create Stripe integration:
   - Connect flow
   - Create price objects
   - Checkout session
   - Webhook for fulfillment

2. Create PayPal integration:
   - Connect flow
   - Button/checkout
   - Webhook

3. Create `ProductManager` component:
   - Add/edit products
   - Name, description, price
   - File upload for digital goods
   - Test/Live mode toggle

4. Create store page template:
   - Product grid
   - Product cards with buy buttons
   - Checkout integration

5. Create download entitlement system:
   - `/api/download/{productId}`
   - Validates purchase
   - Streams file

**Deliverable**: Working e-commerce with test purchases

---

### Phase 8: Publishing (3-4 hours)
**Goal**: Netlify, VPS, Export

#### Tasks:
1. Create `PublishPanel` component:
   - Choose host (Netlify, VPS, Export)
   - Configure domain
   - GitHub connection (optional)
   - Preview before publish
   - Publish button

2. Netlify integration:
   - API key configuration
   - Build static site
   - Deploy via API
   - Return live URL

3. VPS integration:
   - SSH/API endpoint
   - Write to Nginx path
   - Reload Nginx
   - Let's Encrypt cert

4. Export function:
   - Generate static HTML/CSS/JS
   - Include all assets
   - Create sitemap.xml, robots.txt
   - ZIP and download

5. Post-publish screen:
   - Show live URL
   - Sitemap status
   - Lighthouse scores
   - "What to do next" suggestions

**Deliverable**: All 3 publish methods working

---

### Phase 9: Integrations (2-3 hours)
**Goal**: Analytics, Newsletter, GitHub

#### Tasks:
1. Analytics integration:
   - GA4 setup
   - Inject tracking code
   - Plausible/Umami options

2. Newsletter integration:
   - Mailchimp connect
   - Beehiiv connect
   - Resend connect
   - Embed signup forms

3. GitHub export:
   - Create repo
   - Push Next.js project
   - Set up CI/CD
   - README with instructions

**Deliverable**: All integrations functional

---

### Phase 10: Polish & Performance (2-3 hours)
**Goal**: Lighthouse ≥ 90/95

#### Tasks:
1. Image optimization:
   - Lazy loading
   - Responsive images
   - WebP conversion

2. Font strategy:
   - Font loading optimization
   - System font fallbacks

3. A11y improvements:
   - ARIA labels
   - Focus management
   - Keyboard navigation
   - Screen reader testing

4. SEO:
   - JSON-LD structured data
   - Canonical URLs
   - OG/Twitter cards
   - Sitemap generation

5. Performance:
   - Code splitting
   - Hydration optimization
   - Resource hints

**Deliverable**: Lighthouse scores ≥ 90 Perf, ≥ 95 A11y, ≥ 90 SEO

---

## Acceptance Checklist

- [ ] "AI-Built / Custom" choice shown first
- [ ] Brief capture in ≤ 90 seconds
- [ ] Logo upload → palette match with WCAG AA
- [ ] Generate creates siteId, drafts pages, opens /preview/{siteId}
- [ ] Page navigation works in preview
- [ ] AI Builder applies changes with undo
- [ ] Can add digital product and complete test checkout
- [ ] Publish to Netlify works, shows live URL
- [ ] Export ZIP downloads correctly
- [ ] Sitemap/robots/canonical present
- [ ] Lighthouse: Perf ≥ 90, A11y ≥ 95, SEO ≥ 90

## Total Estimated Time
**26-34 hours** of focused development

## Recommendation

This is a **massive redesign** that fundamentally changes the architecture. I recommend:

1. **Phase 1-3 First** (7-10 hours): Get the foundation, entry flow, and templates working
2. **Test with users** before continuing
3. **Phase 4-6** (9-12 hours): Core generation, preview, and AI chat
4. **Test again**
5. **Phase 7-10** (10-12 hours): E-commerce, publishing, integrations, polish

**Should I start with Phase 1 (Foundation)?** Or would you like me to focus on a specific feature first?
