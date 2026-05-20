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

// ============================================================================
// NATIVE X12 EDI API ROUTES (Refactored - No CSV)
// ============================================================================

Route::prefix('edi')->middleware(['api', 'edi.auth', 'edi.rate-limit'])->group(function () {
    
    // ========================================================================
    // ORDER MANAGEMENT ENDPOINTS - List and view purchase orders
    // ========================================================================
    
    // List all purchase orders (paginated)
    Route::get('/orders', [\App\Http\Controllers\Api\Edi\OutboundController::class, 'listOrders']);
    
    // Get specific purchase order with line items
    Route::get('/orders/{id}', [\App\Http\Controllers\Api\Edi\OutboundController::class, 'showOrder']);

    // List recent EDI transactions for dashboard monitoring
    Route::get('/transactions', [\App\Http\Controllers\Api\Edi\OutboundController::class, 'listTransactions']);

    // Delete all transactions except the N most recent (for dashboard cleanup)
    Route::delete('/transactions', [\App\Http\Controllers\Api\Edi\OutboundController::class, 'clearTransactions']);
    
    // ========================================================================
    // INBOUND ENDPOINTS - Receive raw X12 EDI strings
    // ========================================================================
    
    // EDI 850: Purchase Order (from Manufacturer)
    Route::post('/850/receive', [\App\Http\Controllers\Api\Edi\InboundX12Controller::class, 'receive850']);
    Route::post('/inbound/x12', [\App\Http\Controllers\Api\Edi\InboundX12Controller::class, 'receiveInbound']);
    
    // EDI 990: Response to Load Tender (from Logistics Partner)
    Route::post('/990/receive', [\App\Http\Controllers\Api\Edi\InboundX12Controller::class, 'receive990']);
    
    // ========================================================================
    // OUTBOUND ENDPOINTS - Generate and transmit raw X12 EDI strings
    // ========================================================================
    
    // Relay: proxy an outbound EDI HTTP call server-side (avoids browser CORS)
    Route::post('/relay', [\App\Http\Controllers\Api\Edi\OutboundX12Controller::class, 'relay']);

    // EDI 855: Purchase Order Acknowledgment (to Manufacturer)
    Route::post('/855/send', [\App\Http\Controllers\Api\Edi\OutboundX12Controller::class, 'send855']);
    Route::post('/855/preview', [\App\Http\Controllers\Api\Edi\OutboundX12Controller::class, 'preview855']);
    
    // EDI 204: Motor Carrier Load Tender (to Logistics Partner)
    Route::post('/204/send', [\App\Http\Controllers\Api\Edi\OutboundX12Controller::class, 'send204']);
    Route::post('/204/preview', [\App\Http\Controllers\Api\Edi\OutboundX12Controller::class, 'preview204']);
    
    // EDI 856: Advance Ship Notice / ASN (to Manufacturer)
    Route::post('/856/send', [\App\Http\Controllers\Api\Edi\OutboundX12Controller::class, 'send856']);
    Route::post('/856/preview', [\App\Http\Controllers\Api\Edi\OutboundX12Controller::class, 'preview856']);
    
    // EDI 810: Invoice (to Manufacturer)
    Route::post('/810/send', [\App\Http\Controllers\Api\Edi\OutboundX12Controller::class, 'send810']);
    Route::post('/810/preview', [\App\Http\Controllers\Api\Edi\OutboundX12Controller::class, 'preview810']);
    
    // ========================================================================
    // TRANSACTION MANAGEMENT ENDPOINTS
    // ========================================================================
    
    // Get inbound transaction status
    Route::get('/transactions/inbound/{id}', [\App\Http\Controllers\Api\Edi\InboundX12Controller::class, 'getTransactionStatus']);
    
    // Get outbound transmission status by control number
    Route::get('/transmissions/{controlNumber}', [\App\Http\Controllers\Api\Edi\OutboundX12Controller::class, 'getTransmissionStatus']);
    
    // Retry failed transmission
    Route::post('/transmissions/{transactionId}/retry', [\App\Http\Controllers\Api\Edi\OutboundX12Controller::class, 'retryTransmission']);
});

// ============================================================================
// AWS LAMBDA / SQS WEBHOOK ROUTES
// ============================================================================

// Lambda webhook to process queued jobs
Route::post('/webhook/process-queue-job', [\App\Http\Controllers\Webhook\QueueWebhookController::class, 'processQueueJob']);
