<?php

namespace App\Http\Controllers\Api\Edi;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use App\Services\Edi\Generators\Edi855Generator;
use App\Services\Edi\Generators\Edi204Generator;
use App\Services\Edi\Generators\Edi856Generator;
use App\Services\Edi\Generators\Edi810Generator;
use App\Services\Edi\OutboundEdiTransmissionService;
use App\DTOs\Edi\Edi855PurchaseOrderAckDto;
use App\DTOs\Edi\Edi855LineAckDto;
use App\Models\EdiTransaction;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;

/**
 * EDI Outbound Controller - Refactored for Native X12
 * 
 * Handles generating and transmitting X12 EDI strings to partners
 * Supports:
 * - EDI 855: Purchase Order Acknowledgment (to Manufacturer)
 * - EDI 204: Motor Carrier Load Tender (to Logistics Partner)
 * - EDI 856: Advance Ship Notice / ASN (to Manufacturer)
 * - EDI 810: Invoice (to Manufacturer)
 */
class OutboundX12Controller
{
    private Edi855Generator $edi855Generator;
    private Edi204Generator $edi204Generator;
    private Edi856Generator $edi856Generator;
    private Edi810Generator $edi810Generator;
    private OutboundEdiTransmissionService $transmissionService;

    public function __construct(
        Edi855Generator $edi855Generator,
        Edi204Generator $edi204Generator,
        Edi856Generator $edi856Generator,
        Edi810Generator $edi810Generator,
        OutboundEdiTransmissionService $transmissionService
    ) {
        $this->edi855Generator = $edi855Generator;
        $this->edi204Generator = $edi204Generator;
        $this->edi856Generator = $edi856Generator;
        $this->edi810Generator = $edi810Generator;
        $this->transmissionService = $transmissionService;
    }

    /**
     * Generate and send EDI 855 (Purchase Order Acknowledgment)
     * POST /api/edi/855/send
     * 
     * Request body:
     * {
     *   "po_number": "PO123456",
     *   "po_date": "2026-05-17",
     *   "manufacturer_id": "MANU001",
     *   "acknowledgment_code": "AA",
     *   "line_acknowledgments": [
     *     {
     *       "line_number": "1",
     *       "acknowledgment_code": "AA",
     *       "accepted_quantity": 100,
     *       "quantity_uom": "EA"
     *     }
     *   ]
     * }
     */
    public function send855(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'po_number' => 'required|string',
                'po_date' => 'required|date',
                'manufacturer_id' => 'required|string',
                'acknowledgment_code' => 'required|in:AA,RE,IA',
                'line_acknowledgments' => 'required|array|min:1',
                'line_acknowledgments.*.line_number' => 'required|string',
                'line_acknowledgments.*.acknowledgment_code' => 'required|in:AA,RE,IA',
                'line_acknowledgments.*.accepted_quantity' => 'required|numeric|min:0',
                'line_acknowledgments.*.quantity_uom' => 'required|string',
                'line_acknowledgments.*.rejected_quantity' => 'nullable|numeric|min:0',
                'line_acknowledgments.*.rejection_reason' => 'nullable|string',
                'line_acknowledgments.*.estimated_delivery_date' => 'nullable|date',
                'line_acknowledgments.*.part_number' => 'nullable|string',
                'line_acknowledgments.*.unit_price' => 'nullable|numeric|min:0',
                'rejection_reason' => 'nullable|string',
                'manufacturer_address' => 'nullable|array',
                'seller_address' => 'nullable|array',
            ]);

            $validator->after(function ($validator) use ($request) {
                $payload = $request->all();
                $headerCode = $payload['acknowledgment_code'] ?? null;
                $lineAcks = $payload['line_acknowledgments'] ?? [];

                if ($headerCode === 'RE' && empty($payload['rejection_reason'])) {
                    $validator->errors()->add('rejection_reason', 'A rejection reason is required when the acknowledgment code is RE.');
                }

                foreach ($lineAcks as $index => $lineAck) {
                    $lineCode = $lineAck['acknowledgment_code'] ?? null;
                    $acceptedQuantity = (float)($lineAck['accepted_quantity'] ?? 0);
                    $rejectedQuantity = array_key_exists('rejected_quantity', $lineAck)
                        ? (float)$lineAck['rejected_quantity']
                        : null;
                    $linePath = "line_acknowledgments.$index";

                    if ($lineCode === 'AA' && $acceptedQuantity <= 0) {
                        $validator->errors()->add("$linePath.accepted_quantity", 'Accepted quantity must be greater than 0 for AA line acknowledgments.');
                    }

                    if ($lineCode === 'AA' && $rejectedQuantity !== null && $rejectedQuantity > 0) {
                        $validator->errors()->add("$linePath.rejected_quantity", 'Rejected quantity must be 0 or omitted for AA line acknowledgments.');
                    }

                    if ($lineCode === 'RE') {
                        if ($acceptedQuantity != 0.0) {
                            $validator->errors()->add("$linePath.accepted_quantity", 'Accepted quantity must be 0 for RE line acknowledgments.');
                        }

                        if ($rejectedQuantity === null || $rejectedQuantity <= 0) {
                            $validator->errors()->add("$linePath.rejected_quantity", 'Rejected quantity is required and must be greater than 0 for RE line acknowledgments.');
                        }

                        if (empty($lineAck['rejection_reason'])) {
                            $validator->errors()->add("$linePath.rejection_reason", 'A rejection reason is required for RE line acknowledgments.');
                        }
                    }

                    if ($lineCode === 'IA') {
                        if ($acceptedQuantity <= 0) {
                            $validator->errors()->add("$linePath.accepted_quantity", 'Accepted quantity must be greater than 0 for IA line acknowledgments.');
                        }

                        if ($rejectedQuantity === null || $rejectedQuantity <= 0) {
                            $validator->errors()->add("$linePath.rejected_quantity", 'Rejected quantity is required and must be greater than 0 for IA line acknowledgments.');
                        }
                    }
                }
            });

            $validated = $validator->validate();

            // Build DTO
            $dto = new Edi855PurchaseOrderAckDto(
                controlNumber: uniqid('PH855_'),
                poNumber: $validated['po_number'],
                poDate: $validated['po_date'],
                manufacturerId: $validated['manufacturer_id'],
                acknowledgmentCode: $validated['acknowledgment_code'],
                acknowledgedDate: date('Y-m-d'),
                rejectionReason: $validated['rejection_reason'] ?? null,
                manufacturerAddress: $validated['manufacturer_address'] ?? null,
                sellerAddress: $validated['seller_address'] ?? null,
            );

            // Add line acknowledgments
            foreach ($validated['line_acknowledgments'] as $lineAck) {
                $dto->addLineAck(new Edi855LineAckDto(
                    lineNumber: $lineAck['line_number'] ?? '0',
                    acknowledgmentCode: $lineAck['acknowledgment_code'] ?? 'AA',
                    acceptedQuantity: (float)($lineAck['accepted_quantity'] ?? 0),
                    quantityUom: $lineAck['quantity_uom'] ?? 'EA',
                    rejectedQuantity: $lineAck['rejected_quantity'] ?? null,
                    rejectionReason: $lineAck['rejection_reason'] ?? null,
                    estimatedDeliveryDate: $lineAck['estimated_delivery_date'] ?? null,
                    partNumber: $lineAck['part_number'] ?? null,
                    unitPrice: isset($lineAck['unit_price']) ? (float)$lineAck['unit_price'] : null,
                ));
            }

            // Generate X12 string
            $x12Payload = $this->edi855Generator->generate($dto);

            // Transmit to manufacturer
            $transaction = $this->transmissionService->send855($x12Payload);

            Log::info('EDI 855 generated and transmitted', [
                'transaction_id' => $transaction->id,
                'po_number' => $dto->poNumber,
                'status' => $transaction->status,
            ]);

            return response()->json([
                'success' => $transaction->status === 'SENT',
                'message' => 'EDI 855 ' . ($transaction->status === 'SENT' ? 'sent' : 'transmission queued'),
                'transaction_id' => $transaction->id,
                'control_number' => $transaction->control_number,
                'status' => $transaction->status,
            ], $transaction->status === 'SENT' ? Response::HTTP_OK : Response::HTTP_ACCEPTED);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'message' => $e->errors(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);

        } catch (\Exception $e) {
            Log::error('Error generating/sending EDI 855', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => 'Internal server error',
                'message' => 'Failed to generate or send EDI 855',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Preview X12 format for EDI 855 without sending
     * POST /api/edi/855/preview
     */
    public function preview855(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'po_number' => 'required|string',
                'po_date' => 'required|date',
                'manufacturer_id' => 'required|string',
                'acknowledgment_code' => 'required|in:AA,RE,IA',
                'line_acknowledgments' => 'required|array|min:1',
                'line_acknowledgments.*.line_number' => 'required|string',
                'line_acknowledgments.*.acknowledgment_code' => 'required|in:AA,RE,IA',
                'line_acknowledgments.*.accepted_quantity' => 'required|numeric|min:0',
                'line_acknowledgments.*.quantity_uom' => 'required|string',
                'line_acknowledgments.*.part_number' => 'nullable|string',
                'line_acknowledgments.*.unit_price' => 'nullable|numeric|min:0',
                'manufacturer_address' => 'nullable|array',
                'seller_address' => 'nullable|array',
            ]);

            $validated = $validator->validate();

            // Build DTO
            $dto = new Edi855PurchaseOrderAckDto(
                controlNumber: uniqid('PREV855_'),
                poNumber: $validated['po_number'],
                poDate: $validated['po_date'],
                manufacturerId: $validated['manufacturer_id'],
                acknowledgmentCode: $validated['acknowledgment_code'],
                acknowledgedDate: date('Y-m-d'),
                manufacturerAddress: $validated['manufacturer_address'] ?? null,
                sellerAddress: $validated['seller_address'] ?? null,
            );

            // Add line acknowledgments
            foreach ($validated['line_acknowledgments'] as $lineAck) {
                $dto->addLineAck(new Edi855LineAckDto(
                    lineNumber: $lineAck['line_number'] ?? '0',
                    acknowledgmentCode: $lineAck['acknowledgment_code'] ?? 'AA',
                    acceptedQuantity: (float)($lineAck['accepted_quantity'] ?? 0),
                    quantityUom: $lineAck['quantity_uom'] ?? 'EA',
                    partNumber: $lineAck['part_number'] ?? null,
                    unitPrice: isset($lineAck['unit_price']) ? (float)$lineAck['unit_price'] : null,
                ));
            }

            // Generate X12 string
            $x12Payload = $this->edi855Generator->generate($dto);

            return response()->json([
                'x12_payload' => $x12Payload,
                'message' => 'X12 855 preview generated (not sent)',
            ], Response::HTTP_OK);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'message' => $e->errors(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);

        } catch (\Exception $e) {
            Log::error('Error previewing EDI 855', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Preview failed',
                'message' => 'Failed to generate EDI 855 preview',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Generate and send EDI 204 (Motor Carrier Load Tender)
     * POST /api/edi/204/send
     */
    public function send204(Request $request)
    {
        try {
            $validated = $request->validate([
                'load_tender_id'                  => 'required|string',
                'shipper_company_name'            => 'required|string',
                'shipper_address'                 => 'required|array',
                'carrier_code'                    => 'required|string',
                'ship_to_address'                 => 'required|array',
                'shipments'                       => 'required|array|min:1',
                'shipments.*.shipment_number'     => 'required|string',
                'shipments.*.weight'              => 'nullable|numeric',
                'shipments.*.weight_uom'          => 'nullable|string',
                'shipments.*.commodity'           => 'nullable|string',
                'pickup_date'                     => 'nullable|date',
                'delivery_date'                   => 'nullable|date',
            ]);

            $dto = new \App\DTOs\Edi\Edi204MotorCarrierLoadTenderDto(
                controlNumber:      uniqid('PH204_'),
                loadTenderId:       $validated['load_tender_id'],
                shipperCompanyName: $validated['shipper_company_name'],
                shipperAddress:     $validated['shipper_address'],
                carrierCode:        $validated['carrier_code'],
                shipToAddress:      $validated['ship_to_address'],
                pickupDate:         $validated['pickup_date'] ?? date('Y-m-d'),
                deliveryDate:       $validated['delivery_date'] ?? null,
            );

            foreach ($validated['shipments'] as $s) {
                $dto->addShipment(new \App\DTOs\Edi\Edi204ShipmentDto(
                    shipmentNumber: $s['shipment_number'],
                    shipmentType:   $s['shipment_type'] ?? 'TL',
                    weight:         isset($s['weight']) ? (float)$s['weight'] : null,
                    weightUom:      $s['weight_uom'] ?? 'LB',
                    commodity:      $s['commodity'] ?? null,
                ));
            }

            $x12Payload = $this->edi204Generator->generate($dto);

            // Transmit to logistics partner
            $transaction = $this->transmissionService->send204($x12Payload);

            Log::info('EDI 204 generated and transmitted', [
                'transaction_id' => $transaction->id,
                'load_tender_id' => $dto->loadTenderId,
                'status' => $transaction->status,
            ]);

            return response()->json([
                'success' => $transaction->status === 'SENT',
                'message' => 'EDI 204 ' . ($transaction->status === 'SENT' ? 'sent' : 'transmission queued'),
                'transaction_id' => $transaction->id,
                'control_number' => $transaction->control_number,
                'status' => $transaction->status,
            ], $transaction->status === 'SENT' ? Response::HTTP_OK : Response::HTTP_ACCEPTED);

        } catch (\Exception $e) {
            Log::error('Error generating/sending EDI 204', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Internal server error',
                'message' => 'Failed to generate or send EDI 204',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Generate and send EDI 856 (Advance Ship Notice)
     * POST /api/edi/856/send
     */
    public function send856(Request $request)
    {
        try {
            $validated = $request->validate([
                'asn_number' => 'required|string',
                'po_number' => 'required|string',
                'po_date' => 'required|date',
                'manufacturer_id' => 'required|string',
                'ship_date' => 'required|date',
                'ship_from_address' => 'required|array',
                'ship_to_address' => 'required|array',
                'boxes' => 'required|array',
            ]);

            // Build DTO
            $dto = new \App\DTOs\Edi\Edi856AdvanceShipNoticeDto(
                controlNumber: uniqid('PH856_'),
                asnNumber: $validated['asn_number'],
                poNumber: $validated['po_number'],
                poDate: $validated['po_date'],
                manufacturerId: $validated['manufacturer_id'],
                shipDate: $validated['ship_date'],
                shipFromAddress: $validated['ship_from_address'],
                shipToAddress: $validated['ship_to_address'],
            );

            // Add boxes and line items
            // (Implementation depends on boxes/line items data structure)

            // Generate X12 string
            $x12Payload = $this->edi856Generator->generate($dto);

            // Transmit to manufacturer
            $transaction = $this->transmissionService->send856($x12Payload);

            Log::info('EDI 856 generated and transmitted', [
                'transaction_id' => $transaction->id,
                'asn_number' => $dto->asnNumber,
                'status' => $transaction->status,
            ]);

            return response()->json([
                'success' => $transaction->status === 'SENT',
                'message' => 'EDI 856 ' . ($transaction->status === 'SENT' ? 'sent' : 'transmission queued'),
                'transaction_id' => $transaction->id,
                'control_number' => $transaction->control_number,
                'status' => $transaction->status,
            ], $transaction->status === 'SENT' ? Response::HTTP_OK : Response::HTTP_ACCEPTED);

        } catch (\Exception $e) {
            Log::error('Error generating/sending EDI 856', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Internal server error',
                'message' => 'Failed to generate or send EDI 856',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Generate and send EDI 810 (Invoice)
     * POST /api/edi/810/send
     */
    public function send810(Request $request)
    {
        try {
            $validated = $request->validate([
                'invoice_number' => 'required|string',
                'invoice_date' => 'required|date',
                'po_number' => 'required|string',
                'po_date' => 'required|date',
                'manufacturer_id' => 'required|string',
                'bill_to_name' => 'required|string',
                'bill_to_address' => 'required|array',
                'ship_from_address' => 'required|array',
                'line_items' => 'required|array',
                'total_amount' => 'required|numeric',
            ]);

            // Build DTO
            $dto = new \App\DTOs\Edi\Edi810InvoiceDto(
                controlNumber: uniqid('PH810_'),
                invoiceNumber: $validated['invoice_number'],
                invoiceDate: $validated['invoice_date'],
                poNumber: $validated['po_number'],
                poDate: $validated['po_date'],
                manufacturerId: $validated['manufacturer_id'],
                billToName: $validated['bill_to_name'],
                billToAddress: $validated['bill_to_address'],
                shipFromAddress: $validated['ship_from_address'],
                totalAmount: (float)$validated['total_amount'],
            );

            // Add line items
            foreach ($validated['line_items'] as $lineItem) {
                $dto->addLineItem(new \App\DTOs\Edi\Edi810LineItemDto(
                    lineNumber: $lineItem['line_number'] ?? '0',
                    poLineNumber: $lineItem['po_line_number'] ?? '0',
                    partNumber: $lineItem['part_number'],
                    partDescription: $lineItem['part_description'],
                    invoicedQuantity: (float)$lineItem['invoiced_quantity'],
                    quantityUom: $lineItem['quantity_uom'] ?? 'EA',
                    unitPrice: (float)$lineItem['unit_price'],
                ));
            }

            // Calculate totals
            $dto->calculateTotals();

            // Generate X12 string
            $x12Payload = $this->edi810Generator->generate($dto);

            // Transmit to manufacturer
            $transaction = $this->transmissionService->send810($x12Payload, $dto->invoiceNumber);

            Log::info('EDI 810 generated and transmitted', [
                'transaction_id' => $transaction->id,
                'invoice_number' => $dto->invoiceNumber,
                'status' => $transaction->status,
            ]);

            return response()->json([
                'success' => $transaction->status === 'SENT',
                'message' => 'EDI 810 ' . ($transaction->status === 'SENT' ? 'sent' : 'transmission queued'),
                'transaction_id' => $transaction->id,
                'control_number' => $transaction->control_number,
                'status' => $transaction->status,
            ], $transaction->status === 'SENT' ? Response::HTTP_OK : Response::HTTP_ACCEPTED);

        } catch (\Exception $e) {
            Log::error('Error generating/sending EDI 810', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Internal server error',
                'message' => 'Failed to generate or send EDI 810',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get transmission status
     * GET /api/edi/transmissions/{controlNumber}
     */
    public function getTransmissionStatus(string $controlNumber)
    {
        try {
            $transaction = $this->transmissionService->getTransmissionStatus($controlNumber);

            if (!$transaction) {
                return response()->json([
                    'error' => 'Not found',
                    'message' => 'No transmission found with this control number',
                ], Response::HTTP_NOT_FOUND);
            }

            return response()->json([
                'transaction_id' => $transaction->id,
                'transaction_type' => $transaction->transaction_type,
                'control_number' => $transaction->control_number,
                'partner_id' => $transaction->partner_id,
                'status' => $transaction->status,
                'created_at' => $transaction->created_at,
                'updated_at' => $transaction->updated_at,
                'error_message' => $transaction->error_message,
            ]);

        } catch (\Exception $e) {
            Log::error('Error retrieving transmission status', [
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Internal server error',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Relay an outbound EDI request to any partner URL server-side (avoids browser CORS).
     * POST /api/edi/relay
     *
     * Body: { url, method, headers, body }
     */
    public function relay(Request $request)
    {
        $validated = $request->validate([
            'url'     => 'required|string',
            'method'  => 'required|in:GET,POST,PUT,DELETE,PATCH',
            'headers' => 'nullable|array',
            'body'    => 'nullable|string',
        ]);

        try {
            $headers     = $validated['headers'] ?? [];
            $contentType = $headers['Content-Type'] ?? $headers['content-type'] ?? 'application/json';
            $method      = strtolower($validated['method']);
            $url         = $validated['url'];
            $body        = $validated['body'] ?? null;

            $http = \Illuminate\Support\Facades\Http::withHeaders($headers)->timeout(30);

            $response = ($method === 'get')
                ? $http->get($url)
                : $http->withBody($body ?? '', $contentType)->{$method}($url);

            Log::info('EDI relay forwarded', [
                'url'    => $url,
                'method' => strtoupper($method),
                'status' => $response->status(),
            ]);

            return response()->json([
                'status' => $response->status(),
                'body'   => $response->body(),
            ]);
        } catch (\Exception $e) {
            Log::error('EDI relay failed', ['url' => $validated['url'], 'error' => $e->getMessage()]);
            return response()->json([
                'error'   => 'Relay failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Retry failed transmission
     * POST /api/edi/transmissions/{transactionId}/retry
     */
    public function retryTransmission(string $transactionId)
    {
        try {
            $transaction = EdiTransaction::findOrFail($transactionId);

            if ($transaction->status !== 'FAILED') {
                return response()->json([
                    'error' => 'Invalid status',
                    'message' => 'Only failed transmissions can be retried',
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }

            $retried = $this->transmissionService->retryFailed($transaction);

            return response()->json([
                'success' => true,
                'message' => 'Transmission retry initiated',
                'transaction_id' => $retried->id,
                'status' => $retried->status,
            ]);

        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json([
                'error' => 'Not found',
            ], Response::HTTP_NOT_FOUND);
        }
    }

    /**
     * Preview X12 format for EDI 204 without sending
     * POST /api/edi/204/preview
     */
    public function preview204(Request $request)
    {
        try {
            $validated = $request->validate([
                'load_tender_id'              => 'required|string',
                'shipper_company_name'        => 'required|string',
                'shipper_address'             => 'required|array',
                'carrier_code'               => 'required|string',
                'ship_to_address'            => 'required|array',
                'shipments'                  => 'required|array|min:1',
                'shipments.*.shipment_number' => 'required|string',
                'shipments.*.weight'          => 'nullable|numeric',
                'shipments.*.weight_uom'      => 'nullable|string',
                'shipments.*.commodity'       => 'nullable|string',
                'pickup_date'                => 'nullable|date',
                'delivery_date'              => 'nullable|date',
            ]);

            $dto = new \App\DTOs\Edi\Edi204MotorCarrierLoadTenderDto(
                controlNumber:      uniqid('PREV204_'),
                loadTenderId:       $validated['load_tender_id'],
                shipperCompanyName: $validated['shipper_company_name'],
                shipperAddress:     $validated['shipper_address'],
                carrierCode:        $validated['carrier_code'],
                shipToAddress:      $validated['ship_to_address'],
                pickupDate:         $validated['pickup_date'] ?? date('Y-m-d'),
                deliveryDate:       $validated['delivery_date'] ?? null,
            );

            foreach ($validated['shipments'] as $s) {
                $dto->addShipment(new \App\DTOs\Edi\Edi204ShipmentDto(
                    shipmentNumber: $s['shipment_number'],
                    shipmentType:   $s['shipment_type'] ?? 'TL',
                    weight:         isset($s['weight']) ? (float)$s['weight'] : null,
                    weightUom:      $s['weight_uom'] ?? 'LB',
                    commodity:      $s['commodity'] ?? null,
                ));
            }

            $x12Payload = $this->edi204Generator->generate($dto);

            return response()->json([
                'x12_payload' => $x12Payload,
                'message' => 'X12 204 preview generated (not sent)',
            ], Response::HTTP_OK);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'message' => $e->errors(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);

        } catch (\Exception $e) {
            Log::error('Error previewing EDI 204', ['error' => $e->getMessage()]);
            return response()->json([
                'error' => 'Preview failed',
                'message' => 'Failed to generate EDI 204 preview',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Preview X12 format for EDI 856 without sending
     * POST /api/edi/856/preview
     */
    public function preview856(Request $request)
    {
        try {
            $validated = $request->validate([
                'asn_number'       => 'required|string',
                'po_number'        => 'required|string',
                'po_date'          => 'required|date',
                'manufacturer_id'  => 'required|string',
                'ship_date'        => 'required|date',
                'ship_from_address'=> 'required|array',
                'ship_to_address'  => 'required|array',
                'boxes'            => 'required|array',
            ]);

            $dto = new \App\DTOs\Edi\Edi856AdvanceShipNoticeDto(
                controlNumber:    uniqid('PREV856_'),
                asnNumber:        $validated['asn_number'],
                poNumber:         $validated['po_number'],
                poDate:           $validated['po_date'],
                manufacturerId:   $validated['manufacturer_id'],
                shipDate:         $validated['ship_date'],
                shipFromAddress:  $validated['ship_from_address'],
                shipToAddress:    $validated['ship_to_address'],
            );

            $x12Payload = $this->edi856Generator->generate($dto);

            return response()->json([
                'x12_payload' => $x12Payload,
                'message' => 'X12 856 preview generated (not sent)',
            ], Response::HTTP_OK);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'message' => $e->errors(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);

        } catch (\Exception $e) {
            Log::error('Error previewing EDI 856', ['error' => $e->getMessage()]);
            return response()->json([
                'error' => 'Preview failed',
                'message' => 'Failed to generate EDI 856 preview',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Preview X12 format for EDI 810 without sending
     * POST /api/edi/810/preview
     */
    public function preview810(Request $request)
    {
        try {
            $validated = $request->validate([
                'invoice_number'    => 'required|string',
                'invoice_date'      => 'required|date',
                'po_number'         => 'required|string',
                'po_date'           => 'required|date',
                'manufacturer_id'   => 'required|string',
                'bill_to_name'      => 'required|string',
                'bill_to_address'   => 'required|array',
                'ship_from_address' => 'required|array',
                'line_items'        => 'required|array',
                'total_amount'      => 'required|numeric',
            ]);

            $dto = new \App\DTOs\Edi\Edi810InvoiceDto(
                controlNumber:    uniqid('PREV810_'),
                invoiceNumber:    $validated['invoice_number'],
                invoiceDate:      $validated['invoice_date'],
                poNumber:         $validated['po_number'],
                poDate:           $validated['po_date'],
                manufacturerId:   $validated['manufacturer_id'],
                billToName:       $validated['bill_to_name'],
                billToAddress:    $validated['bill_to_address'],
                shipFromAddress:  $validated['ship_from_address'],
                totalAmount:      (float)$validated['total_amount'],
            );

            foreach ($validated['line_items'] as $lineItem) {
                $dto->addLineItem(new \App\DTOs\Edi\Edi810LineItemDto(
                    lineNumber:       $lineItem['line_number'] ?? '0',
                    poLineNumber:     $lineItem['po_line_number'] ?? '0',
                    partNumber:       $lineItem['part_number'],
                    partDescription:  $lineItem['part_description'],
                    invoicedQuantity: (float)$lineItem['invoiced_quantity'],
                    quantityUom:      $lineItem['quantity_uom'] ?? 'EA',
                    unitPrice:        (float)$lineItem['unit_price'],
                ));
            }

            $dto->calculateTotals();
            $x12Payload = $this->edi810Generator->generate($dto);

            return response()->json([
                'x12_payload' => $x12Payload,
                'message' => 'X12 810 preview generated (not sent)',
            ], Response::HTTP_OK);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'error' => 'Validation failed',
                'message' => $e->errors(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);

        } catch (\Exception $e) {
            Log::error('Error previewing EDI 810', ['error' => $e->getMessage()]);
            return response()->json([
                'error' => 'Preview failed',
                'message' => 'Failed to generate EDI 810 preview',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }
}

