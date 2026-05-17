<?php

/**
 * ============================================================================
 * EXAMPLE: Using the Native X12 EDI Architecture
 * ============================================================================
 * 
 * This file demonstrates how to:
 * 1. Receive inbound X12 EDI messages
 * 2. Parse them into structured DTOs
 * 3. Generate outbound X12 EDI messages
 * 4. Transmit them to partner endpoints
 * 
 * Location: backend/examples/X12_USAGE_EXAMPLES.php
 * Not for production - educational reference only
 */

// ============================================================================
// EXAMPLE 1: RECEIVE INBOUND EDI 850 (Purchase Order)
// ============================================================================

namespace App\Examples;

use App\Services\Edi\Parsers\Edi850Parser;
use App\DTOs\Edi\Edi850PurchaseOrderDto;

// Raw X12 850 string from manufacturer
$rawEdi850 = <<<EDI
ISA*00*00*00*01*MANUFACTURER    *01*PHILHARVEST   *210517*0101*U*00401*000000001*0*P*:~
GS*PO*MANUFACTURER*PHILHARVEST*20260517*010101*1*X*004010~
ST*850*0001~
BEG*00*SA*PO123456*20260517~
DTM*137*20260517*102~
N1*MF*Acme Manufacturing*ACME001~
PO1*1*100*EA*25.00*2500.00*~*PART001~
SE*7*0001~
GE*1*1~
IEA*1*000000001~
EDI;

// Parse the X12 string
$parser = new Edi850Parser();
$purchaseOrder = $parser->parse($rawEdi850);

// Access parsed data
echo "Purchase Order Received:\n";
echo "  PO Number: {$purchaseOrder->poNumber}\n";
echo "  PO Date: {$purchaseOrder->poDate}\n";
echo "  Manufacturer: {$purchaseOrder->manufacturerName}\n";
echo "  Total Amount: \${$purchaseOrder->totalAmount}\n";
echo "  Line Items: " . count($purchaseOrder->lineItems) . "\n";

// Store in database
$transaction = \App\Models\EdiTransaction::create([
    'transaction_type' => '850',
    'control_number' => $purchaseOrder->controlNumber,
    'partner_id' => $purchaseOrder->manufacturerId,
    'raw_payload' => $rawEdi850,
    'parsed_data' => $purchaseOrder->toArray(),
    'status' => 'RECEIVED',
]);

echo "Transaction ID: {$transaction->id}\n";

// ============================================================================
// EXAMPLE 2: RECEIVE INBOUND EDI 990 (Carrier Response)
// ============================================================================

use App\Services\Edi\Parsers\Edi990Parser;

$rawEdi990 = <<<EDI
ISA*00*00*00*01*CARRIER         *01*PHILHARVEST   *210518*1200*U*00401*000000002*0*P*:~
GS*PO*CARRIER*PHILHARVEST*20260518*120000*1*X*004010~
ST*990*0001~
BEG*AA*LOAD001~
DTM*137*20260518*1200~
N1*CN*Fast Freight Inc*CARRIER123~
SE*6*0001~
GE*1*1~
IEA*1*000000002~
EDI;

$parser = new Edi990Parser();
$response = $parser->parse($rawEdi990);

echo "\nCarrier Response:\n";
echo "  Response Code: {$response->responseCode} (" . ($response->isAccepted() ? 'ACCEPTED' : 'REJECTED') . ")\n";
echo "  Carrier: {$response->carrierName}\n";
echo "  Load Tender ID: {$response->loadTenderId}\n";
echo "  Estimated Delivery: {$response->estimatedDeliveryDate}\n";

// ============================================================================
// EXAMPLE 3: GENERATE OUTBOUND EDI 855 (PO Acknowledgment)
// ============================================================================

use App\Services\Edi\Generators\Edi855Generator;
use App\DTOs\Edi\Edi855PurchaseOrderAckDto;
use App\DTOs\Edi\Edi855LineAckDto;

// Build the DTO from business logic
$ack = new Edi855PurchaseOrderAckDto(
    controlNumber: uniqid('PH855_'),
    poNumber: 'PO123456',
    poDate: '2026-05-17',
    manufacturerId: 'ACME001',
    acknowledgmentCode: 'AA',  // AA = Accept
    acknowledgedDate: date('Y-m-d'),
);

// Add line acknowledgments
$ack->addLineAck(new Edi855LineAckDto(
    lineNumber: '1',
    acknowledgmentCode: 'AA',
    acceptedQuantity: 100,
    quantityUom: 'EA',
    estimatedDeliveryDate: date('Y-m-d', strtotime('+15 days')),
));

// Generate X12 string
$generator = new Edi855Generator();
$ediString = $generator->generate($ack);

echo "\nGenerated EDI 855:\n";
echo $ediString . "\n";

// ============================================================================
// EXAMPLE 4: GENERATE OUTBOUND EDI 204 (Load Tender)
// ============================================================================

use App\Services\Edi\Generators\Edi204Generator;
use App\DTOs\Edi\Edi204MotorCarrierLoadTenderDto;
use App\DTOs\Edi\Edi204ShipmentDto;
use App\DTOs\Edi\Edi204ShipmentLineItemDto;

$loadTender = new Edi204MotorCarrierLoadTenderDto(
    controlNumber: uniqid('PH204_'),
    loadTenderId: 'LOAD001',
    shipperCompanyName: 'Phil Harvest Inc',
    shipperAddress: [
        'street' => '123 Main St',
        'city' => 'Springfield',
        'state' => 'IL',
        'zip' => '62701',
    ],
    carrierCode: 'CARRIER123',
    shipToAddress: [
        'company_name' => 'Acme Manufacturing',
        'street' => '456 Oak Ave',
        'city' => 'Chicago',
        'state' => 'IL',
        'zip' => '60601',
    ],
    pickupDate: date('Ymd'),
    deliveryDate: date('Ymd', strtotime('+2 days')),
);

// Add shipment
$shipment = new Edi204ShipmentDto(
    shipmentNumber: 'SHIP001',
    shipmentType: 'TL',
    weight: 25000,
    weightUom: 'LB',
);

$shipment->addLineItem(new Edi204ShipmentLineItemDto(
    lineNumber: '1',
    poNumber: 'PO123456',
    poLineNumber: '1',
    partNumber: 'PART001',
    partDescription: 'Widget',
    quantity: 100,
    quantityUom: 'EA',
    weight: 2500,
));

$loadTender->addShipment($shipment);

// Generate and transmit
$generator = new Edi204Generator();
$ediString = $generator->generate($loadTender);

// Transmit via service
$transmissionService = app(\App\Services\Edi\OutboundEdiTransmissionService::class);
$transaction = $transmissionService->send204($ediString, $loadTender->loadTenderId);

echo "\nLoad Tender Generated and Transmitted:\n";
echo "  Transaction ID: {$transaction->id}\n";
echo "  Status: {$transaction->status}\n";
echo "  Control Number: {$transaction->control_number}\n";

// ============================================================================
// EXAMPLE 5: GENERATE OUTBOUND EDI 856 (Advance Ship Notice)
// ============================================================================

use App\Services\Edi\Generators\Edi856Generator;
use App\DTOs\Edi\Edi856AdvanceShipNoticeDto;
use App\DTOs\Edi\Edi856BoxDto;
use App\DTOs\Edi\Edi856BoxLineItemDto;

$asn = new Edi856AdvanceShipNoticeDto(
    controlNumber: uniqid('PH856_'),
    asnNumber: 'ASN001',
    poNumber: 'PO123456',
    poDate: '2026-05-17',
    manufacturerId: 'ACME001',
    shipDate: date('Y-m-d'),
    shipFromAddress: [
        'street' => '123 Main St',
        'city' => 'Springfield',
        'state' => 'IL',
        'zip' => '62701',
    ],
    shipToAddress: [
        'company_name' => 'Acme Manufacturing',
        'street' => '456 Oak Ave',
        'city' => 'Chicago',
        'state' => 'IL',
        'zip' => '60601',
    ],
    carrierCode: 'CARRIER123',
    trackingNumber: 'TRK123456789',
);

// Add box
$box = new Edi856BoxDto(
    boxNumber: 'BOX001',
    weight: 50,
    weightUom: 'LB',
);

$box->addLineItem(new Edi856BoxLineItemDto(
    lineNumber: '1',
    poLineNumber: '1',
    partNumber: 'PART001',
    partDescription: 'Widget',
    shippedQuantity: 100,
    quantityUom: 'EA',
));

$asn->addBox($box);

// Generate and transmit
$generator = new Edi856Generator();
$ediString = $generator->generate($asn);

$transmissionService = app(\App\Services\Edi\OutboundEdiTransmissionService::class);
$transaction = $transmissionService->send856($ediString, $asn->asnNumber);

echo "\nAdvance Ship Notice Generated and Transmitted:\n";
echo "  Transaction ID: {$transaction->id}\n";
echo "  Status: {$transaction->status}\n";

// ============================================================================
// EXAMPLE 6: GENERATE OUTBOUND EDI 810 (Invoice)
// ============================================================================

use App\Services\Edi\Generators\Edi810Generator;
use App\DTOs\Edi\Edi810InvoiceDto;
use App\DTOs\Edi\Edi810LineItemDto;

$invoice = new Edi810InvoiceDto(
    controlNumber: uniqid('PH810_'),
    invoiceNumber: 'INV001',
    invoiceDate: date('Y-m-d'),
    poNumber: 'PO123456',
    poDate: '2026-05-17',
    manufacturerId: 'ACME001',
    billToName: 'Acme Manufacturing',
    billToAddress: [
        'street' => '456 Oak Ave',
        'city' => 'Chicago',
        'state' => 'IL',
        'zip' => '60601',
    ],
    shipFromAddress: [
        'street' => '123 Main St',
        'city' => 'Springfield',
        'state' => 'IL',
        'zip' => '62701',
    ],
);

// Add line items
$invoice->addLineItem(new Edi810LineItemDto(
    lineNumber: '1',
    poLineNumber: '1',
    partNumber: 'PART001',
    partDescription: 'Widget',
    invoicedQuantity: 100,
    quantityUom: 'EA',
    unitPrice: 25.00,
));

$invoice->calculateTotals();

// Generate and transmit
$generator = new Edi810Generator();
$ediString = $generator->generate($invoice);

$transmissionService = app(\App\Services\Edi\OutboundEdiTransmissionService::class);
$transaction = $transmissionService->send810($ediString, $invoice->invoiceNumber);

echo "\nInvoice Generated and Transmitted:\n";
echo "  Transaction ID: {$transaction->id}\n";
echo "  Status: {$transaction->status}\n";
echo "  Total Amount: \${$invoice->totalAmount}\n";

// ============================================================================
// EXAMPLE 7: CHECK TRANSMISSION STATUS & RETRY FAILED
// ============================================================================

$transmission = $transmissionService->getTransmissionStatus($transaction->control_number);

echo "\nTransmission Status:\n";
echo "  Status: {$transmission->status}\n";
echo "  Created: {$transmission->created_at}\n";
echo "  Updated: {$transmission->updated_at}\n";

if ($transmission->status === 'FAILED') {
    echo "  Error: {$transmission->error_message}\n";
    
    // Retry
    echo "\nRetrying failed transmission...\n";
    $retried = $transmissionService->retryFailed($transmission);
    echo "  New Status: {$retried->status}\n";
}

// ============================================================================
// EXAMPLE 8: X12 FORMATTING UTILITIES
// ============================================================================

use App\Services\Edi\Utilities\X12Formatter;

// Validate X12 format
$errors = X12Formatter::isValidX12($rawEdi850);
if (empty($errors)) {
    echo "\nX12 format is valid\n";
} else {
    echo "\nX12 format errors:\n";
    foreach ($errors as $error) {
        echo "  - $error\n";
    }
}

// Extract control number
$controlNum = X12Formatter::extractControlNumber($rawEdi850);
echo "Control Number: $controlNum\n";

// Format dates
$formattedDate = X12Formatter::formatDateForX12('2026-05-17');
echo "Formatted Date for X12: $formattedDate\n";

$parsedDate = X12Formatter::parseX12Date('20260517');
echo "Parsed X12 Date: {$parsedDate->format('Y-m-d')}\n";

// Describe response codes
echo "Response Code 'AA' means: " . X12Formatter::describeResponseCode('AA') . "\n";
echo "Response Code 'RE' means: " . X12Formatter::describeResponseCode('RE') . "\n";

// ============================================================================
// EXAMPLE 9: USING VIA HTTP ENDPOINTS
// ============================================================================

/*
The examples above show direct service usage. Typically, you'll use the HTTP endpoints:

1. RECEIVE EDI 850:
   curl -X POST http://localhost:8000/api/edi/850/receive \
     -H "Content-Type: application/x-edi" \
     --data-binary @valid-850.edi

2. RECEIVE EDI 990:
   curl -X POST http://localhost:8000/api/edi/990/receive \
     -H "Content-Type: application/x-edi" \
     --data-binary @valid-990.edi

3. SEND EDI 855:
   curl -X POST http://localhost:8000/api/edi/855/send \
     -H "Content-Type: application/json" \
     -d '{"po_number":"PO123","po_date":"2026-05-17",...}'

4. SEND EDI 204:
   curl -X POST http://localhost:8000/api/edi/204/send \
     -H "Content-Type: application/json" \
     -d '{"load_tender_id":"LOAD001",...}'

5. SEND EDI 856:
   curl -X POST http://localhost:8000/api/edi/856/send \
     -H "Content-Type: application/json" \
     -d '{"asn_number":"ASN001",...}'

6. SEND EDI 810:
   curl -X POST http://localhost:8000/api/edi/810/send \
     -H "Content-Type: application/json" \
     -d '{"invoice_number":"INV001",...}'

7. GET STATUS:
   curl http://localhost:8000/api/edi/transmissions/CTLNUMBER

8. RETRY FAILED:
   curl -X POST http://localhost:8000/api/edi/transmissions/TRANSACTIONID/retry
*/

echo "\n✓ All examples completed successfully!\n";
