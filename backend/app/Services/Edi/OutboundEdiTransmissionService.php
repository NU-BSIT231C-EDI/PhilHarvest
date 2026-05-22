<?php

namespace App\Services\Edi;

use App\Models\EdiTransaction;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Log;

/**
 * Outbound EDI Transmission Service
 * 
 * Handles sending X12 EDI messages to partner endpoints with:
 * - Dynamic endpoint resolution from configuration
 * - Multiple authentication types (API Key, Basic Auth, OAuth)
 * - Automatic retry logic with exponential backoff
 * - Transaction logging and status tracking
 */
class OutboundEdiTransmissionService
{
    private Client $httpClient;

    public function __construct()
    {
        $this->httpClient = new Client(['verify' => false]);  // Note: In production, use verify => true
    }

    /**
     * Send EDI 855 (PO Acknowledgment) to Manufacturer
     */
    public function send855(string $x12Payload): EdiTransaction
    {
        $partnerCode = Config::get('edi-partners.manufacturer.code', 'SERMACROPS');
        $transaction = EdiTransaction::create([
            'transaction_type' => '855',
            'control_number' => $this->extractControlNumber($x12Payload),
            'partner_id' => $partnerCode,
            'raw_payload' => $x12Payload,
            'generated_x12_payload' => $x12Payload,
            'status' => 'PENDING',
        ]);

        return $this->transmit($transaction, '855', 'manufacturer');
    }

    /**
     * Send EDI 204 (Motor Carrier Load Tender) to Logistics Partner
     */
    public function send204(string $x12Payload): EdiTransaction
    {
        $transaction = EdiTransaction::create([
            'transaction_type' => '204',
            'control_number' => $this->extractControlNumber($x12Payload),
            'partner_id' => 'LOGISTICS',
            'raw_payload' => $x12Payload,
            'generated_x12_payload' => $x12Payload,
            'status' => 'PENDING',
        ]);

        return $this->transmit($transaction, '204', 'logistics');
    }

    /**
     * Send EDI 856 (Advance Ship Notice) to Manufacturer
     */
    public function send856(string $x12Payload): EdiTransaction
    {
        $partnerCode = Config::get('edi-partners.manufacturer.code', 'SERMACROPS');
        $transaction = EdiTransaction::create([
            'transaction_type' => '856',
            'control_number' => $this->extractControlNumber($x12Payload),
            'partner_id' => $partnerCode,
            'raw_payload' => $x12Payload,
            'generated_x12_payload' => $x12Payload,
            'status' => 'PENDING',
        ]);

        return $this->transmit($transaction, '856', 'manufacturer');
    }

    /**
     * Send EDI 810 (Invoice) to Manufacturer
     */
    public function send810(string $x12Payload): EdiTransaction
    {
        $partnerCode = Config::get('edi-partners.manufacturer.code', 'SERMACROPS');
        $transaction = EdiTransaction::create([
            'transaction_type' => '810',
            'control_number' => $this->extractControlNumber($x12Payload),
            'partner_id' => $partnerCode,
            'raw_payload' => $x12Payload,
            'generated_x12_payload' => $x12Payload,
            'status' => 'PENDING',
        ]);

        return $this->transmit($transaction, '810', 'manufacturer');
    }

    /**
     * Core transmission logic with retry capability
     */
    private function transmit(EdiTransaction $transaction, string $transactionType, string $partner): EdiTransaction
    {
        $partnerConfig = Config::get("edi-partners.$partner");
        $endpoint = $partnerConfig['endpoints'][$transactionType] ?? null;

        if (!$endpoint) {
            $transaction->update([
                'status' => 'FAILED',
                'error_message' => "No endpoint configured for $transactionType to $partner",
            ]);
            Log::error("Missing endpoint for {$transactionType} to {$partner}");
            return $transaction;
        }

        $maxRetries = $partnerConfig['retry']['max_attempts'] ?? 3;
        $retryDelay = $partnerConfig['retry']['delay_seconds'] ?? 5;

        for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
            try {
                $bodyFormat  = $partnerConfig['body_format'] ?? 'raw';
                $contentType = $partnerConfig['content_type'] ?? 'application/x-edi';
                $body = match ($bodyFormat) {
                    'json_edi'        => json_encode(['edi'        => $transaction->raw_payload]),
                    'json_x12content' => json_encode(['x12Content' => $transaction->raw_payload]),
                    default           => $transaction->raw_payload,
                };

                $response = $this->sendRequest(
                    $endpoint,
                    $body,
                    $partnerConfig['authentication'],
                    $partnerConfig['timeout'] ?? 30,
                    $contentType
                );

                $transaction->update([
                    'status' => 'SENT',
                    'parsed_data' => [
                        'response_code' => $response->getStatusCode(),
                        'sent_at' => now()->toIso8601String(),
                        'endpoint' => $endpoint,
                    ],
                ]);

                Log::info("Successfully sent {$transactionType} transaction", [
                    'transaction_id' => $transaction->id,
                    'control_number' => $transaction->control_number,
                    'endpoint' => $endpoint,
                    'status_code' => $response->getStatusCode(),
                ]);

                return $transaction;

            } catch (GuzzleException $e) {
                Log::warning("Attempt $attempt failed for {$transactionType}", [
                    'transaction_id' => $transaction->id,
                    'error' => $e->getMessage(),
                    'attempt' => $attempt,
                    'max_retries' => $maxRetries,
                ]);

                if ($attempt < $maxRetries) {
                    sleep($retryDelay * $attempt);  // Exponential backoff
                } else {
                    $transaction->update([
                        'status' => 'FAILED',
                        'error_message' => "Failed after {$maxRetries} attempts: " . $e->getMessage(),
                    ]);

                    Log::error("Failed to send {$transactionType} after {$maxRetries} attempts", [
                        'transaction_id' => $transaction->id,
                        'endpoint' => $endpoint,
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        return $transaction;
    }

    /**
     * Send HTTP request with authentication
     */
    private function sendRequest(string $endpoint, string $payload, array $auth, int $timeout, string $contentType)
    {
        $options = [
            'timeout' => $timeout,
            'headers' => [
                'Content-Type' => $contentType,
            ],
            'body' => $payload,
        ];

        // Apply authentication
        switch ($auth['type'] ?? 'api_key') {
            case 'none':
                break;

            case 'basic':
                $options['auth'] = [
                    $auth['username'] ?? '',
                    $auth['password'] ?? '',
                ];
                break;

            case 'api_key':
                $options['headers']['Authorization'] = 'Bearer ' . ($auth['api_key'] ?? '');
                break;

            case 'oauth':
                // Implement OAuth token retrieval if needed
                $options['headers']['Authorization'] = 'Bearer ' . ($auth['api_key'] ?? '');
                break;

            default:
                // Default to API key authentication
                $options['headers']['Authorization'] = 'Bearer ' . ($auth['api_key'] ?? '');
                break;
        }

        return $this->httpClient->post($endpoint, $options);
    }

    /**
     * Extract control number from X12 ISA segment
     */
    private function extractControlNumber(string $x12Payload): string
    {
        // ISA13 is the interchange control number in a valid 17-element ISA segment.
        // Fall back to legacy malformed payloads so older generated documents do not crash inserts.
        $segments = explode('~', $x12Payload);
        foreach ($segments as $segment) {
            $fields = explode('*', trim($segment));
            if (($fields[0] ?? null) !== 'ISA') {
                continue;
            }

            if (count($fields) >= 17 && isset($fields[13])) {
                return trim($fields[13]);
            }

            if (count($fields) >= 15 && isset($fields[11]) && is_numeric(trim($fields[11]))) {
                return trim($fields[11]);
            }
        }
        return uniqid('CTL_');
    }

    /**
     * Get transmission status
     */
    public function getTransmissionStatus(string $controlNumber): ?EdiTransaction
    {
        return EdiTransaction::where('control_number', $controlNumber)->latest()->first();
    }

    /**
     * Retry failed transmission
     */
    public function retryFailed(EdiTransaction $transaction): EdiTransaction
    {
        if ($transaction->status !== 'FAILED') {
            throw new \InvalidArgumentException('Only failed transactions can be retried');
        }

        $transaction->update(['status' => 'RETRYING']);

        return $this->transmit(
            $transaction,
            $transaction->transaction_type,
            $this->resolvePartnerConfigKey($transaction)
        );
    }

    private function resolvePartnerConfigKey(EdiTransaction $transaction): string
    {
        return match ($transaction->transaction_type) {
            '204', '990' => 'logistics',
            '855', '856', '810', '850' => 'manufacturer',
            default => strtolower($transaction->partner_id),
        };
    }
}
