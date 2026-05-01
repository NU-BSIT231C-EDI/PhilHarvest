<?php

return [
    /**
     * EDI Authentication Configuration
     */
    'auth' => [
        // Master API key (for testing/admin)
        'api_key' => env('EDI_AUTH_TOKEN', 'test_token_here'),

        // Partner-specific API keys (can expand this to database lookup)
        'partner_keys' => [
            'TESTPARTNER' => env('EDI_PARTNER_TEST_KEY', 'partner_test_key_123'),
            'PARTNER2' => env('EDI_PARTNER_2_KEY', 'partner_2_key_456'),
        ],

        // IP Whitelist (empty = allow all, set specific IPs to restrict)
        'ip_whitelist' => [
            // '192.168.1.1',
            // '10.0.0.0/8',  // CIDR notation supported
        ],

        // Enable HMAC signature verification (advanced security)
        'enable_hmac' => env('EDI_ENABLE_HMAC', false),
        'hmac_algorithm' => 'sha256',
    ],

    /**
     * Rate Limiting Configuration
     */
    'rate_limiting' => [
        // Global rate limit: requests per minute
        'global' => [
            'requests' => env('EDI_RATE_LIMIT_GLOBAL', 1000),
            'window' => 60, // seconds
        ],

        // Per-partner rate limits
        'per_partner' => [
            'requests' => env('EDI_RATE_LIMIT_PARTNER', 100),
            'window' => 60, // seconds
        ],

        // Per-IP rate limits
        'per_ip' => [
            'requests' => env('EDI_RATE_LIMIT_IP', 500),
            'window' => 60, // seconds
        ],

        // Burst allowance (temporary spike tolerance)
        'burst_multiplier' => env('EDI_RATE_LIMIT_BURST', 1.5),
    ],

    /**
     * Partner Configuration
     */
    'partners' => [
        'TESTPARTNER' => [
            'name' => 'Test Partner',
            'enabled' => true,
            'api_key' => env('EDI_PARTNER_TEST_KEY', 'partner_test_key_123'),
            'allowed_ips' => [], // Empty = all IPs
            'rate_limit' => 100, // requests per minute
        ],
    ],

    /**
     * EDI Processing
     */
    'processing' => [
        'raw_storage_path' => env('EDI_STORAGE_PATH', 'edi/raw'),
        'archive_retention_days' => env('EDI_ARCHIVE_DAYS', 2555), // ~7 years
        'enable_duplicate_check' => true,
        'duplicate_window_hours' => 24,
    ],

    /**
     * Logging
     */
    'logging' => [
        'log_all_requests' => true,
        'log_successful_edi' => true,
        'log_failed_edi' => true,
        'log_auth_failures' => true,
    ],
];
