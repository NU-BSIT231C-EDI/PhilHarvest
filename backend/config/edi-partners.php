<?php

/**
 * EDI Partner Configuration
 * 
 * This file centrally manages partner routing endpoints for outbound EDI transmissions.
 * All endpoints are loaded from environment variables for flexibility across environments.
 */

return [
    /**
     * Manufacturer Partner Configuration
     * Handles PO Acknowledgments (855), ASNs (856), and Invoices (810)
     */
    'manufacturer' => [
        'name' => env('EDI_MANUFACTURER_NAME', 'Manufacturer Partner'),
        'code' => env('EDI_MANUFACTURER_CODE', 'MANU'),
        'endpoints' => [
            '855' => env('EDI_MANUFACTURER_ENDPOINT_855'),  // PO Acknowledgment
            '856' => env('EDI_MANUFACTURER_ENDPOINT_856'),  // ASN
            '810' => env('EDI_MANUFACTURER_ENDPOINT_810'),  // Invoice
        ],
        'authentication' => [
            'type' => env('EDI_MANUFACTURER_AUTH_TYPE', 'api_key'),  // api_key, oauth, basic
            'api_key' => env('EDI_MANUFACTURER_API_KEY'),
            'username' => env('EDI_MANUFACTURER_USERNAME'),
            'password' => env('EDI_MANUFACTURER_PASSWORD'),
        ],
        'timeout' => env('EDI_MANUFACTURER_TIMEOUT', 30),
        'retry' => [
            'max_attempts' => env('EDI_MANUFACTURER_RETRY_ATTEMPTS', 3),
            'delay_seconds' => env('EDI_MANUFACTURER_RETRY_DELAY', 5),
        ],
    ],

    /**
     * Logistics Partner Configuration
     * Handles Motor Carrier Load Tenders (204)
     */
    'logistics' => [
        'name' => env('EDI_LOGISTICS_NAME', 'Logistics Partner'),
        'code' => env('EDI_LOGISTICS_CODE', 'LOGI'),
        'endpoints' => [
            '204' => env('EDI_LOGISTICS_ENDPOINT_204'),  // Motor Carrier Load Tender
            '990' => env('EDI_LOGISTICS_ENDPOINT_990'),  // Response Webhook (for their responses)
        ],
        'authentication' => [
            'type' => env('EDI_LOGISTICS_AUTH_TYPE', 'api_key'),
            'api_key' => env('EDI_LOGISTICS_API_KEY'),
            'username' => env('EDI_LOGISTICS_USERNAME'),
            'password' => env('EDI_LOGISTICS_PASSWORD'),
        ],
        'timeout' => env('EDI_LOGISTICS_TIMEOUT', 30),
        'retry' => [
            'max_attempts' => env('EDI_LOGISTICS_RETRY_ATTEMPTS', 3),
            'delay_seconds' => env('EDI_LOGISTICS_RETRY_DELAY', 5),
        ],
    ],

    /**
     * Global EDI Configuration
     */
    'global' => [
        // X12 standard version
        'x12_version' => env('EDI_X12_VERSION', '004010'),
        
        // Company identifiers for ISA segment
        'sender_id' => env('EDI_SENDER_ID', 'PHILHARVEST'),
        'sender_qualifier' => env('EDI_SENDER_QUALIFIER', '01'),  // DUNS number
        
        // Control number generation
        'control_number_prefix' => env('EDI_CONTROL_PREFIX', 'PH'),
        'control_number_padding' => 9,  // Total length of numeric portion
    ],
];
