# Security Specification - Wavelet Studio

## 1. Data Invariants
- Portfolio items must have a valid category ('place', 'food', 'nature', 'home-preview').
- 'order' must be a number to ensure consistent sorting.
- Images must have valid URLs.

## 2. Access Control
- **Read**: Public (anyone can view images and settings).
- **Write/Update/Delete**: Restricted to Admin. 
  - Note: Since we are using a simple password (0724) for the UI, we should ideally pair this with a secret doc check in Firestore.

## 3. The "Dirty Dozen" Payloads (Denial Tests)
1. Anonymous user trying to delete a portfolio item.
2. Anonymous user trying to update site settings.
3. Authenticated (but non-admin) user trying to write.
4. Setting an invalid category (e.g., 'cars').
5. Missing required fields in a PortfolioItem.
6. Injecting a massive string into the caption.
7. Attempting to change 'createdAt' after creation.
8. Using an invalid ID format.
9. Removing 'itemId' or changing it.
10. Shadow field injection in settings.
11. Bypassing size limits on captions.
12. Setting 'order' to a non-number.

## 4. Test Runner
(Standard firestore.rules.test.ts logic applies)
