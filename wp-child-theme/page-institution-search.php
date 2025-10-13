<?php
/**
 * Template Name: Institution Search
 * Description: Provides the markup shell for the Institution Search page (progressive enhancement ready).
 * Version: 1.0.0
 * Safety: No data mutations; pure rendering + optional logging.
 */
if (!defined('ABSPATH')) { exit; }

csc_log('Institution Search template loaded for page ID ' . get_the_ID());

get_header();
?>
<main id="primary" class="site-main institution-search-template" role="main">
    <header class="page-header">
        <h1 class="page-title"><?php echo esc_html( get_the_title() ); ?></h1>
    </header>

    <section id="institution-search-root" class="search-app" aria-labelledby="institution-search-heading" data-search-context="institution">
        <h2 id="institution-search-heading" class="screen-reader-text">Institution Search Interface</h2>
        <form id="institution-search-form" class="csc-search-form" role="search" aria-describedby="institution-search-help" method="get" action="<?php echo esc_url( home_url('/') ); ?>">
            <label for="institution-query" class="csc-label">Search Institutions</label>
            <input type="text" id="institution-query" name="q" placeholder="Enter name, code, keyword" aria-required="false" />
            <button type="submit">Search</button>
            <p id="institution-search-help" class="form-help">Basic placeholder form. Enhanced JS layer can attach here later.</p>
        </form>
        <div id="institution-search-results" class="csc-results" aria-live="polite" aria-busy="false">
            <!-- Dynamic results (placeholder). If JS not present, server fallback messaging below will appear. -->
        </div>
        <noscript><p class="no-js-fallback">JavaScript is disabled; live filtering unavailable. Submit the form to perform a basic query.</p></noscript>
    </section>

    <?php if (defined('SEARCH_TEMPLATE_LOG') && SEARCH_TEMPLATE_LOG): ?>
        <div class="template-diagnostics" style="margin-top:2rem; font-size: .85rem; opacity:.7;">
            <strong>Diagnostics:</strong> Institution template active. Page ID: <?php echo (int) get_the_ID(); ?>
        </div>
    <?php endif; ?>
</main>
<?php
get_footer();
