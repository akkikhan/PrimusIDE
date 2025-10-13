<?php
/**
 * Custom Search Child Theme functions
 * Purpose: Safely provide dedicated templates for Institution & License search pages without modifying parent theme.
 */

if (!defined('ABSPATH')) {
    exit; // Hard exit if accessed directly.
}

// Version constant for cache busting.
define('CUSTOM_SEARCH_CHILD_VERSION', '1.0.0');

/**
 * Enqueue parent and (optional) child assets.
 */
add_action('wp_enqueue_scripts', function () {
    // Ensure parent stylesheet loads.
    wp_enqueue_style('parent-style', get_template_directory_uri() . '/style.css', [], null);

    // Placeholder for future enhancement JS; only load on target templates when created.
    if (is_page_template('page-institution-search.php')) {
        // wp_enqueue_script('institution-search', get_stylesheet_directory_uri() . '/assets/js/institution-search.js', ['wp-element'], CUSTOM_SEARCH_CHILD_VERSION, true);
    }
    if (is_page_template('page-license-search.php')) {
        // wp_enqueue_script('license-search', get_stylesheet_directory_uri() . '/assets/js/license-search.js', ['wp-element'], CUSTOM_SEARCH_CHILD_VERSION, true);
    }
});

/**
 * Optional: Debug flag for temporary template execution logging.
 * To enable, define in wp-config.php: define('SEARCH_TEMPLATE_LOG', true);
 */
if (!defined('SEARCH_TEMPLATE_LOG')) {
    define('SEARCH_TEMPLATE_LOG', false);
}

// Utility helper for uniform logging (safe no-op if disabled or WP_DEBUG false)
function csc_log($message) {
    if (SEARCH_TEMPLATE_LOG && defined('WP_DEBUG') && WP_DEBUG) {
        error_log('[CSC] ' . $message);
    }
}
