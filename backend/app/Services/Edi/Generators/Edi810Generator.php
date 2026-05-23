<?php

namespace App\Services\Edi\Generators;

use App\DTOs\Edi\Edi810InvoiceDto;
use Illuminate\Support\Facades\Config;

/**
 * X12 810 (Invoice) Generator
 * 
 * Generates raw X12 EDI 810 strings for manufacturers
 */
class Edi810Generator
{
    private string $segmentTerminator = '~';
    private string $fieldSeparator = '*';
    private string $controlNumber = '001';

    public function __construct()
    {
        $this->controlNumber = $this->generateControlNumber();
    }

    /**
     * Generate X12 810 from DTO
     */
    public function generate(Edi810InvoiceDto $dto): string
    {
        $this->controlNumber = $this->generateControlNumber();
        $segments = [];

        // ISA - Interchange Control Header
        $segments[] = $this->buildISA();

        // GS - Functional Group Header
        $segments[] = $this->buildGS();

        // ST - Transaction Set Header
        $segments[] = $this->buildST();

        // BIG - Beginning Segment for Invoice
        $segments[] = $this->buildBIG($dto);

        // NM101 - Bill To Name
        $segments[] = $this->buildN1BillTo($dto);
        if (!empty($dto->billToAddress)) {
            $segments[] = $this->buildN3($dto->billToAddress);
            $segments[] = $this->buildN4($dto->billToAddress);
        }

        // N1 - Ship From
        $senderId = Config::get('edi-partners.manufacturer.x12.sender_id', Config::get('edi-partners.global.sender_id', 'PHILHARVEST'));
        $segments[] = "N1{$this->fieldSeparator}SF{$this->fieldSeparator}{$senderId}";
        if (!empty($dto->shipFromAddress)) {
            $segments[] = $this->buildN3($dto->shipFromAddress);
            $segments[] = $this->buildN4($dto->shipFromAddress);
        }

        // ITD - Terms of Sale/Deferred Payment
        if ($dto->paymentTerms) {
            $segments[] = "ITD{$this->fieldSeparator}{$dto->paymentTerms}";
        }

        // DTM - Date/Time Reference
        $segments[] = "DTM{$this->fieldSeparator}002{$this->fieldSeparator}" . date('Ymd');

        // IT1 - Line Items (Invoice equivalent of PO1)
        foreach ($dto->lineItems as $lineItem) {
            $segments[] = $this->buildIT1($lineItem);
        }

        // Ensure totals are calculated before summary segments
        if ($dto->totalAmount === null) {
            $dto->calculateTotals();
        }

        // TDS - Total Monetary Value Summary (mandatory in 810)
        $tdsAmount = number_format((float)($dto->totalAmount ?? 0), 2, '.', '');
        $segments[] = "TDS{$this->fieldSeparator}{$tdsAmount}";

        // TXI - Tax Information
        if ($dto->taxAmount && $dto->taxAmount > 0) {
            $segments[] = "TXI{$this->fieldSeparator}TX{$this->fieldSeparator}{$dto->taxAmount}";
        }

        // AMT - Monetary Amount (subtotal)
        if ($dto->subtotalAmount) {
            $segments[] = "AMT{$this->fieldSeparator}1{$this->fieldSeparator}{$dto->subtotalAmount}";
        }

        // CTT - Transaction Totals
        $lineCount = count($dto->lineItems);
        $segments[] = "CTT{$this->fieldSeparator}{$lineCount}";

        // SE - Transaction Set Trailer (counts ST through SE, excluding ISA and GS)
        $count = count($segments) - 2 + 1; // subtract ISA and GS, add SE itself
        $segments[] = "SE{$this->fieldSeparator}{$count}{$this->fieldSeparator}0001";

        // GE - Functional Group Trailer
        $segments[] = "GE{$this->fieldSeparator}1{$this->fieldSeparator}1";

        // IEA - Interchange Control Trailer
        $segments[] = "IEA{$this->fieldSeparator}1{$this->fieldSeparator}{$this->controlNumber}";

        return implode($this->segmentTerminator . "\n", $segments) . $this->segmentTerminator . "\n";
    }

    /**
     * Build ISA segment
     */
    private function buildISA(): string
    {
        $partnerConfig = Config::get('edi-partners.manufacturer', []);
        $x12Config = $partnerConfig['x12'] ?? [];
        $senderQual = $x12Config['sender_qualifier'] ?? Config::get('edi-partners.global.sender_qualifier', 'ZZ');
        $senderId = str_pad($x12Config['sender_id'] ?? Config::get('edi-partners.global.sender_id', 'PHILHARVEST'), 15, ' ');
        $receiverQual = $x12Config['receiver_qualifier'] ?? 'ZZ';
        $receiverId = str_pad($x12Config['receiver_id'] ?? ($partnerConfig['code'] ?? 'SERMACROPS'), 15, ' ');
        $date = date('ymd');
        $time = date('Hi');
        $version = $this->formatIsaVersion($x12Config['version'] ?? Config::get('edi-partners.global.x12_version', '005010'));

        return implode($this->fieldSeparator, [
            'ISA',
            '00',
            str_repeat(' ', 10),
            '00',
            str_repeat(' ', 10),
            $senderQual,
            $senderId,
            $receiverQual,
            $receiverId,
            $date,
            $time,
            '^',
            $version,
            $this->controlNumber,
            '0',
            'P',
            ':',
        ]);
    }

    /**
     * Build GS segment
     */
    private function buildGS(): string
    {
        $partnerConfig = Config::get('edi-partners.manufacturer', []);
        $x12Config = $partnerConfig['x12'] ?? [];
        $senderId = $x12Config['sender_id'] ?? Config::get('edi-partners.global.sender_id', 'PHILHARVEST');
        $receiverId = $x12Config['receiver_id'] ?? ($partnerConfig['code'] ?? 'SERMACROPS');
        $date = date('Ymd');
        $time = date('His');
        return "GS{$this->fieldSeparator}IN{$this->fieldSeparator}{$senderId}{$this->fieldSeparator}{$receiverId}{$this->fieldSeparator}{$date}{$this->fieldSeparator}{$time}{$this->fieldSeparator}1{$this->fieldSeparator}X{$this->fieldSeparator}005010";
    }

    /**
     * Build ST segment
     */
    private function buildST(): string
    {
        return "ST{$this->fieldSeparator}810{$this->fieldSeparator}0001";
    }

    /**
     * Build BIG segment (Beginning Segment for Invoice)
     */
    private function buildBIG(Edi810InvoiceDto $dto): string
    {
        $invDate = $this->formatDateForX12($dto->invoiceDate ?? null);
        $poDate = $this->formatDateForX12($dto->poDate ?? null);

        // BIG01=InvoiceDate, BIG02=InvoiceNumber, BIG03=PODate, BIG04=PONumber
        return "BIG{$this->fieldSeparator}{$invDate}{$this->fieldSeparator}{$dto->invoiceNumber}{$this->fieldSeparator}{$poDate}{$this->fieldSeparator}{$dto->poNumber}";
    }

    /**
     * Build N1 Bill To
     */
    private function buildN1BillTo(Edi810InvoiceDto $dto): string
    {
        return "N1{$this->fieldSeparator}BT{$this->fieldSeparator}{$dto->billToName}";
    }

    /**
     * Build N3 Address
     */
    private function buildN3(array $address): string
    {
        $street = $address['street'] ?? '';
        return "N3{$this->fieldSeparator}{$street}";
    }

    /**
     * Build N4 City/State/ZIP
     */
    private function buildN4(array $address): string
    {
        $city  = $address['city']  ?? '';
        $state = $address['state'] ?? '';
        $zip   = $address['postal_code'] ?? $address['zip'] ?? '';
        return "N4{$this->fieldSeparator}{$city}{$this->fieldSeparator}{$state}{$this->fieldSeparator}{$zip}";
    }

    /**
     * Build IT1 segment (Invoice Line Item — 810 equivalent of PO1 in 850)
     */
    private function buildIT1($lineItem): string
    {
        $quantity = $lineItem->invoicedQuantity;
        $uom = $lineItem->quantityUom;
        $price = $lineItem->unitPrice;
        $partNum = $lineItem->partNumber;

        return "IT1{$this->fieldSeparator}{$lineItem->lineNumber}{$this->fieldSeparator}{$quantity}{$this->fieldSeparator}{$uom}{$this->fieldSeparator}{$price}{$this->fieldSeparator}{$this->fieldSeparator}{$partNum}";
    }

    /**
     * Generate control number
     */
    private function generateControlNumber(): string
    {
        $config = Config::get('edi-partners.global');
        $padding = $config['control_number_padding'] ?? 9;

        $timestamp = (int)(microtime(true) * 1000) % (10 ** $padding);
        return str_pad((string) $timestamp, $padding, '0', STR_PAD_LEFT);
    }

    private function formatDateForX12(?string $date): string
    {
        if (empty($date)) {
            return date('Ymd');
        }

        $timestamp = strtotime($date);
        if ($timestamp === false) {
            return preg_replace('/[^0-9]/', '', $date);
        }

        return date('Ymd', $timestamp);
    }

    private function formatIsaVersion(string $version): string
    {
        $normalized = preg_replace('/[^0-9]/', '', $version);
        return substr(str_pad($normalized ?: '005010', 5, '0', STR_PAD_LEFT), 0, 5);
    }
}
