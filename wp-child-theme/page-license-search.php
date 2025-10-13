<?php
/**
 * Template Name: License Search
 * Description: Provides the markup shell for the License Search page (progressive enhancement ready).
 * Version: 1.0.0
 */
if (!defined('ABSPATH')) { exit; }

csc_log('License Search template loaded for page ID ' . get_the_ID());

get_header();
?>
<main id="primary" class="site-main license-search-template" role="main">
    <header class="page-header">
        <h1 class="page-title"><?php echo esc_html( get_the_title() ); ?></h1>
    </header>

    <section id="license-search-root" class="search-app" aria-labelledby="license-search-heading" data-search-context="license">
        <h2 id="license-search-heading" class="screen-reader-text">License Search Interface</h2>
        <form id="license-search-form" class="csc-search-form" role="search" aria-describedby="license-search-help" method="get" action="<?php echo esc_url( home_url('/') ); ?>">
            <label for="license-query" class="csc-label">Search Licenses</label>
            <input type="text" id="license-query" name="q" placeholder="Enter number, holder, keyword" aria-required="false" />
            <button type="submit">Search</button>
            <p id="license-search-help" class="form-help">Basic placeholder form. Enhanced JS layer can attach here later.</p>
        </form>
        <div id="license-search-results" class="csc-results" aria-live="polite" aria-busy="false"></div>
        <noscript><p class="no-js-fallback">JavaScript is disabled; live filtering unavailable. Submit the form to perform a basic query.</p></noscript>
    </section>

    <?php if (defined('SEARCH_TEMPLATE_LOG') && SEARCH_TEMPLATE_LOG): ?>
        <div class="template-diagnostics" style="margin-top:2rem; font-size: .85rem; opacity:.7;">
            <strong>Diagnostics:</strong> License template active. Page ID: <?php echo (int) get_the_ID(); ?>
        </div>
    <?php endif; ?>
</main>
<?php
get_footer();
