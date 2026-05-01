<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;
use Illuminate\Cache\RateLimiter;
use Illuminate\Support\Facades\Log;

class EdiRateLimitMiddleware
{
    /**
     * The rate limiter instance.
     */
    protected RateLimiter $limiter;

    public function __construct(RateLimiter $limiter)
    {
        $this->limiter = $limiter;
    }

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): SymfonyResponse
    {
        $config = config('edi.rate_limiting');
        $partnerId = $request->attributes->get('edi_partner_id', 'unknown');

        // 1. Check global rate limit
        if (!$this->checkGlobalLimit($config)) {
            Log::warning('EDI RateLimit: Global limit exceeded', [
                'partner_id' => $partnerId,
                'ip' => $request->ip(),
            ]);
            return response()->json([
                'error' => 'Too Many Requests',
                'message' => 'Global rate limit exceeded. Please try again later.',
            ], 429)
                ->header('Retry-After', 60)
                ->header('X-RateLimit-Limit', $config['global']['requests'])
                ->header('X-RateLimit-Remaining', 0);
        }

        // 2. Check per-partner rate limit
        $remaining = $this->checkPartnerLimit($partnerId, $config);
        if ($remaining < 0) {
            Log::warning('EDI RateLimit: Partner limit exceeded', [
                'partner_id' => $partnerId,
                'ip' => $request->ip(),
            ]);
            return response()->json([
                'error' => 'Too Many Requests',
                'message' => 'Partner rate limit exceeded. Please try again later.',
            ], 429)
                ->header('Retry-After', $config['per_partner']['window'])
                ->header('X-RateLimit-Limit', $config['per_partner']['requests'])
                ->header('X-RateLimit-Remaining', max(0, $remaining))
                ->header('X-RateLimit-Reset', now()->addSeconds($config['per_partner']['window'])->timestamp);
        }

        // 3. Check per-IP rate limit
        $ipRemaining = $this->checkIpLimit($request->ip(), $config);
        if ($ipRemaining < 0) {
            Log::warning('EDI RateLimit: IP limit exceeded', [
                'partner_id' => $partnerId,
                'ip' => $request->ip(),
            ]);
            return response()->json([
                'error' => 'Too Many Requests',
                'message' => 'Too many requests from your IP address. Please try again later.',
            ], 429)
                ->header('Retry-After', $config['per_ip']['window'])
                ->header('X-RateLimit-Limit', $config['per_ip']['requests'])
                ->header('X-RateLimit-Remaining', max(0, $ipRemaining));
        }

        // 4. Request passes - add rate limit headers to response
        $response = $next($request);

        $response->header('X-RateLimit-Limit', $config['per_partner']['requests']);
        $response->header('X-RateLimit-Remaining', max(0, $remaining - 1));
        $response->header('X-RateLimit-Reset', now()->addSeconds($config['per_partner']['window'])->timestamp);

        Log::info('EDI RateLimit: Request allowed', [
            'partner_id' => $partnerId,
            'remaining' => max(0, $remaining - 1),
        ]);

        return $response;
    }

    /**
     * Check global rate limit.
     */
    private function checkGlobalLimit(array $config): bool
    {
        $key = 'edi:ratelimit:global';
        $limit = $config['global']['requests'];
        $window = $config['global']['window'];

        return $this->limiter->attempt(
            $key,
            (int)($limit / $window),
            fn() => true,
            $window
        );
    }

    /**
     * Check per-partner rate limit and return remaining requests.
     */
    private function checkPartnerLimit(string $partnerId, array $config): int
    {
        $key = "edi:ratelimit:partner:{$partnerId}";
        $limit = $config['per_partner']['requests'];
        $window = $config['per_partner']['window'];

        // Get current count
        $current = cache()->get($key, 0);

        if ($current >= $limit) {
            return -1; // Limit exceeded
        }

        // Increment counter
        cache()->put($key, $current + 1, now()->addSeconds($window));

        return $limit - $current - 1; // Remaining requests
    }

    /**
     * Check per-IP rate limit and return remaining requests.
     */
    private function checkIpLimit(string $ip, array $config): int
    {
        $key = "edi:ratelimit:ip:{$ip}";
        $limit = $config['per_ip']['requests'];
        $window = $config['per_ip']['window'];

        // Get current count
        $current = cache()->get($key, 0);

        if ($current >= $limit) {
            return -1; // Limit exceeded
        }

        // Increment counter
        cache()->put($key, $current + 1, now()->addSeconds($window));

        return $limit - $current - 1; // Remaining requests
    }
}
