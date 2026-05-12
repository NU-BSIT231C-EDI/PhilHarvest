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
    // X12 and CSV inbound endpoints
    Route::post('/850/receive', [\App\Http\Controllers\Api\Edi\InboundController::class, 'receive850']);
    Route::post('/csv/upload', [\App\Http\Controllers\Api\Edi\InboundController::class, 'uploadCSV']);
    
    // Outbound endpoints
    Route::get('/orders', [\App\Http\Controllers\Api\Edi\OutboundController::class, 'listOrders']);
    Route::get('/orders/{id}', [\App\Http\Controllers\Api\Edi\OutboundController::class, 'showOrder']);
    Route::get('/orders/{id}/export/csv', [\App\Http\Controllers\Api\Edi\OutboundController::class, 'exportOrderAsCSV']);
    
    // Transaction management endpoints
    Route::get('/transactions/{id}', [\App\Http\Controllers\Api\Edi\OutboundController::class, 'getTransactionDetails']);
    Route::get('/transactions/{id}/csv', [\App\Http\Controllers\Api\Edi\OutboundController::class, 'downloadCSV'])->name('edi.download-csv');
});

// Webhook routes (coming soon)
// Route::post('/webhooks/edi-ack', [\App\Http\Controllers\Api\Edi\WebhookController::class, 'ack']);
