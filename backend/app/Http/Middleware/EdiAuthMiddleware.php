<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use Illuminate\Support\Facades\Log;

class EdiAuthMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): SymfonyResponse
    {
        $config = config('edi.auth');

        // 1. Extract and validate Authorization header
        $token = $this->extractBearerToken($request);
        if (!$token) {
            Log::warning('EDI Auth: Missing or invalid Authorization header', [
                'ip' => $request->ip(),
                'path' => $request->path(),
            ]);
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Missing or invalid Authorization header. Use: Authorization: Bearer <token>',
            ], 401);
        }

        // 2. Validate token format and lookup partner
        $partnerId = $this->validateToken($token, $config);
        if (!$partnerId) {
            Log::warning('EDI Auth: Invalid token', [
                'token' => substr($token, 0, 10) . '***',
                'ip' => $request->ip(),
            ]);
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Invalid authentication token',
            ], 401);
        }

        // 3. Check IP whitelist if configured
        if (!empty($config['ip_whitelist'])) {
            if (!$this->isIpWhitelisted($request->ip(), $config['ip_whitelist'])) {
                Log::warning('EDI Auth: IP not whitelisted', [
                    'ip' => $request->ip(),
                    'partner_id' => $partnerId,
                ]);
                return response()->json([
                    'error' => 'Forbidden',
                    'message' => 'Your IP address is not whitelisted',
                ], 403);
            }
        }

        // 4. Validate HMAC signature if enabled
        if ($config['enable_hmac'] && !$this->validateHmacSignature($request, $token, $config)) {
            Log::warning('EDI Auth: HMAC signature invalid', [
                'ip' => $request->ip(),
                'partner_id' => $partnerId,
            ]);
            return response()->json([
                'error' => 'Unauthorized',
                'message' => 'Invalid request signature',
            ], 401);
        }

        // 5. Attach partner info to request for downstream use
        $request->attributes->add([
            'edi_partner_id' => $partnerId,
            'edi_auth_token' => $token,
            'edi_authenticated_at' => now(),
        ]);

        Log::info('EDI Auth: Request authenticated', [
            'partner_id' => $partnerId,
            'ip' => $request->ip(),
            'endpoint' => $request->path(),
        ]);

        return $next($request);
    }

    /**
     * Extract Bearer token from Authorization header.
     */
    private function extractBearerToken(Request $request): ?string
    {
        $header = $request->header('Authorization');

        if (!$header) {
            return null;
        }

        // Expected format: "Bearer <token>"
        if (!preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
            return null;
        }

        return trim($matches[1]);
    }

    /**
     * Validate token against configured keys and return partner ID.
     */
    private function validateToken(string $token, array $config): ?string
    {
        // Check master API key
        if ($token === $config['api_key']) {
            return 'SYSTEM'; // Master key represents system
        }

        // Check partner-specific keys
        foreach ($config['partner_keys'] as $partnerId => $partnerKey) {
            if ($token === $partnerKey) {
                return $partnerId;
            }
        }

        // Token not found
        return null;
    }

    /**
     * Check if IP is in whitelist (supports CIDR notation).
     */
    private function isIpWhitelisted(string $ip, array $whitelist): bool
    {
        foreach ($whitelist as $whitelistedIp) {
            // Simple IP match
            if ($ip === $whitelistedIp) {
                return true;
            }

            // CIDR notation (e.g., "10.0.0.0/8")
            if (str_contains($whitelistedIp, '/')) {
                if ($this->ipInCidr($ip, $whitelistedIp)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Check if IP is in CIDR range.
     */
    private function ipInCidr(string $ip, string $cidr): bool
    {
        [$subnet, $bits] = explode('/', $cidr);
        $ip = ip2long($ip);
        $subnet = ip2long($subnet);
        $mask = -1 << (32 - (int)$bits);
        $subnet &= $mask;

        return ($ip & $mask) === $subnet;
    }

    /**
     * Validate HMAC signature if enabled (advanced feature).
     */
    private function validateHmacSignature(Request $request, string $token, array $config): bool
    {
        if (!$config['enable_hmac']) {
            return true;
        }

        $signature = $request->header('X-Signature');
        if (!$signature) {
            return false;
        }

        $body = $request->getContent();
        $expectedSignature = hash_hmac(
            $config['hmac_algorithm'],
            $body,
            $token,
            false
        );

        return hash_equals($expectedSignature, $signature);
    }
}
