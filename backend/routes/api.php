<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// EDI routes with authentication and rate limiting
Route::prefix('edi')->middleware(['api', 'edi.auth', 'edi.rate-limit'])->group(function () {
    Route::post('/850/receive', [\App\Http\Controllers\Api\Edi\InboundController::class, 'receive850']);
    Route::get('/orders', [\App\Http\Controllers\Api\Edi\OutboundController::class, 'listOrders']);
    Route::get('/orders/{id}', [\App\Http\Controllers\Api\Edi\OutboundController::class, 'showOrder']);
});

// Webhook routes (coming soon)
// Route::post('/webhooks/edi-ack', [\App\Http\Controllers\Api\Edi\WebhookController::class, 'ack']);
