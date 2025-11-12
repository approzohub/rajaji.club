# Page Title System

This document explains how the dynamic page title system works in the PlayWin application.

## Overview

The application now dynamically sets page titles based on the current page/section. All titles follow the format:
```
RajaJi - Trusted Betting Platform Online - [Page Name]
```

## Implementation

### Core Files

1. **`src/lib/page-title.ts`** - Utility functions and constants for managing page titles
2. **Individual page components** - Each page sets its own title using `useEffect`

### How It Works

1. **Base Title**: The base title is "RajaJi - Trusted Betting Platform Online"
2. **Page-Specific Titles**: Each page adds its specific name after a dash
3. **Dynamic Updates**: Titles are updated using `document.title` in client-side components

### Page Titles

| Page | Title |
|------|-------|
| Home | RajaJi - Trusted Betting Platform Online - Home |
| Game | RajaJi - Trusted Betting Platform Online - Game |
| Account (General) | RajaJi - Trusted Betting Platform Online - Account |
| My Account | RajaJi - Trusted Betting Platform Online - My Account |
| Ongoing Bids | RajaJi - Trusted Betting Platform Online - Ongoing Bids |
| Withdraw | RajaJi - Trusted Betting Platform Online - Withdraw |
| Game History | RajaJi - Trusted Betting Platform Online - Game History |
| Payment History | RajaJi - Trusted Betting Platform Online - Payment History |
| Results | RajaJi - Trusted Betting Platform Online - Results |

### Usage

To add a new page title:

1. Add the title constant to `PAGE_TITLES` in `src/lib/page-title.ts`:
```typescript
export const PAGE_TITLES = {
  // ... existing titles
  NEW_PAGE: "New Page"
} as const;
```

2. Import and use in your page component:
```typescript
import { setPageTitle, PAGE_TITLES } from "../../lib/page-title";

export default function NewPage() {
  useEffect(() => {
    setPageTitle(PAGE_TITLES.NEW_PAGE);
  }, []);
  
  // ... rest of component
}
```

### Account Page Special Handling

The account page has special handling for different sections. The title updates dynamically based on the active menu item:

```typescript
useEffect(() => {
  let title = PAGE_TITLES.ACCOUNT;
  switch (activeMenu) {
    case "My Account":
      title = PAGE_TITLES.ACCOUNT_MY_ACCOUNT;
      break;
    // ... other cases
  }
  setPageTitle(title);
}, [activeMenu]);
```

## Benefits

1. **SEO Friendly**: Each page has a unique, descriptive title
2. **User Experience**: Users can easily identify which page they're on
3. **Browser History**: Clear titles in browser tabs and history
4. **Accessibility**: Screen readers can announce the correct page title

## Technical Notes

- Uses client-side `document.title` for dynamic updates
- Compatible with Next.js 13+ App Router
- Works with both static and dynamic page content
- No server-side rendering impact since titles are set after component mount 