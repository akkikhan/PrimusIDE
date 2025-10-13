# Deployment Notes: Custom Search Child Theme

## Purpose

Restore missing page-level templates for Institution and License search pages without altering the parent theme (`twentynineteen`).

## Files Added

- `style.css`
- `functions.php`
- `page-institution-search.php`
- `page-license-search.php`

## Optional (Not added yet)

- `assets/js/institution-search.js`
- `assets/js/license-search.js`

## Activation Steps

1. Upload the `custom-search-child` (or renamed) folder into `wp-content/themes/`.
2. In WP Admin > Appearance > Themes: Activate "Custom Search Child".
3. Edit the two affected Pages: set Template dropdown to "Institution Search" and "License Search" respectively (Page Attributes box).
4. View each page with `?nocache=1` to bypass cache.
5. Confirm body classes contain `page-template-page-institution-search` / `page-template-page-license-search`.

## Diagnostics (Optional)

Enable in `wp-config.php` temporarily:

```php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('SEARCH_TEMPLATE_LOG', true);
```

Check `wp-content/debug.log` for lines starting with `[CSC]` confirming template load, then remove the constant when done.

## Rollback

1. Reassign pages back to Default template.
2. Activate original parent theme.
3. Delete child theme folder if desired.

## Security & Performance

- No database writes or direct queries introduced.
- No external network calls.
- Forms submit to home URL (placeholder) pending real search backend.

## Next Enhancements (Deferred)

- Implement AJAX / REST search endpoint.
- Add nonce-protected requests & result rendering JS.
- Accessibility review once dynamic results added.

---

Generated scaffold v1.0.0
