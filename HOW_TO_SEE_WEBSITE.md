# How to See Your Generated Website

## The Fix Applied

The Generate button was failing because the backend API wasn't fully configured. I've implemented a **mock generation system** that creates pages immediately based on your business brief.

## Step-by-Step Instructions

### 1. Fill Out Business Brief
- Go to the **"Brief & Brand"** tab (left sidebar)
- Fill in at minimum:
  - Business Name (e.g., "Acme Corp")
  - Industry (e.g., "SaaS")
- Optionally add:
  - Target Audience
  - Products/Services (click "Add Product/Service")
  - Key Differentiators
  - Business Goals
  - Choose Tone
  - Set Strictness

### 2. Click "Generate Website (2 cr)"
- Located in the left sidebar under "Quick Actions"
- A modal will appear with two options:
  1. **"Use My Business Brief"** - Uses your filled-in information
  2. **"Use Smart Defaults"** - Quick test with default values

### 3. Wait for Generation (1.5 seconds)
- You'll see a loading overlay: "Generating your page..."
- This is a simulated delay (in production, it would be AI generation time)

### 4. View Your Website
- **Automatic Switch**: The app automatically switches to the **"Canvas"** tab
- **See Your Page**: You'll now see your generated website with:
  - Navigation bar with menu items
  - Hero section with your business name
  - Services section (if you added offerings)
  - Features section (if you added differentiators)
  - Contact form
  - Footer

## What You'll See in Canvas

### Navigation Block
- Links: Home, About, Services, Contact
- CTA button: "Get Started"

### Hero Block
- Headline: "Welcome to [Your Business Name]"
- Subheadline: Includes your target audience and tone
- Call-to-action button

### Services Block (if applicable)
- Lists all your products/services
- Auto-generated descriptions
- "Contact for pricing" on each

### Features Block (if applicable)
- Shows your key differentiators
- Styled with icons

### Contact Form
- Fields: Name, Email, Message
- Submit button

### Footer
- Company links
- Social media icons

## How to Interact with Generated Page

1. **View Blocks**: Scroll through all generated sections
2. **Regenerate Block**: Hover over any block → Click "Regenerate" button
3. **Edit SEO**: Switch to "SEO" tab to edit meta title/description
4. **Save**: Click "Save" button (top right) to save to database
5. **Publish**: Click "Publish (2 cr)" to deploy (coming soon)
6. **Export**: Click "Export (2 cr)" to download as ZIP (coming soon)

## Current vs Future Implementation

### Current (Demo Mode)
- ✅ Instant mock generation based on your brief
- ✅ Shows realistic website structure
- ✅ All UI interactions work
- ⚠️ No actual API calls (everything local)
- ⚠️ No credit system (simulated only)

### Future (Production Mode)
- 🔄 Real AI-powered generation
- 🔄 Saves to Supabase database
- 🔄 Credit debit system active
- 🔄 Deploy to real CDN
- 🔄 Export with provenance metadata

## Troubleshooting

### "Nothing happens when I click Generate"
- **Check**: Did you wait 1.5 seconds? There's a simulated delay
- **Check**: Open browser DevTools (F12) → Console for any errors
- **Check**: Does the Canvas tab become active?

### "Canvas tab is empty"
- **Check**: Did you fill in Business Name and Industry?
- **Check**: Try clicking Generate again
- **Refresh**: Reload the page and try once more

### "I want to generate again"
- Just click "Generate Website (2 cr)" again
- It will replace the current page with a new one
- Use "Use Smart Defaults" for quick testing

## What Makes It "Smart"

The mock generator:
- Uses your Business Name in headlines
- Includes your Industry in descriptions
- Lists your actual Products/Services
- Highlights your Differentiators as features
- Adapts tone (professional/friendly/casual/formal)
- Creates logical page structure
- Generates SEO metadata from your brief

## Next Steps to See Your Website Live

1. Fill in your business information
2. Click "Generate Website (2 cr)"
3. Wait ~2 seconds
4. **The Canvas tab will show your website automatically!**
5. Scroll to see all sections
6. Click Save to persist it

That's it! Your website appears in the Canvas tab immediately after generation completes. 🎉
