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
        $segments[] = "N1{$this->fieldSeparator}SF{$this->fieldSeparator}PHILHARVEST";
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

        // PO1 - Line Items
        foreach ($dto->lineItems as $lineItem) {
            $segments[] = $this->buildPO1($lineItem);
        }

        // TXI - Tax Information
        if ($dto->taxAmount && $dto->taxAmount > 0) {
            $segments[] = "TXI{$this->fieldSeparator}TX{$this->fieldSeparator}{$dto->taxAmount}";
        }

        // AMT - Monetary Amount
        if ($dto->subtotalAmount) {
            $segments[] = "AMT{$this->fieldSeparator}1{$this->fieldSeparator}{$dto->subtotalAmount}";
        }

        // CTT - Transaction Total
        $lineCount = count($dto->lineItems);
        $segments[] = "CTT{$this->fieldSeparator}{$lineCount}";

        // TDS - Total Data Summary
        if ($dto->totalAmount) {
            $segments[] = "TDS{$this->fieldSeparator}{$dto->totalAmount}";
        }

        // SE - Transaction Set Trailer
        $count = count($segments) + 1;
        $segments[] = "SE{$this->fieldSeparator}{$count}{$this->fieldSeparator}0001";

        // GE - Functional Group Trailer
        $segments[] = "GE{$this->fieldSeparator}1{$this->fieldSeparator}1";

        // IEA - Interchange Control Trailer
        $segments[] = "IEA{$this->fieldSeparator}1{$this->fieldSeparator}{$this->controlNumber}";

        return implode($this->segmentTerminator, $segments) . $this->segmentTerminator;
    }

    /**
     * Build ISA segment
     */
    private function buildISA(): string
    {
        $config = Config::get('edi-partners.global');
        $senderQual = $config['sender_qualifier'] ?? '01';
        $senderId = str_pad($config['sender_id'] ?? 'PHILHARVEST', 15, ' ');
        $receiverQual = '01';
        $receiverId = str_pad('MANUFACTURER', 15, ' ');
        $date = date('ymd');
        $time = date('Hi');

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
            '00401',
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
        $date = date('Ymd');
        $time = date('His');
        return "GS{$this->fieldSeparator}IN{$this->fieldSeparator}PHILHARVEST{$this->fieldSeparator}MANUFACTURER{$this->fieldSeparator}{$date}{$this->fieldSeparator}{$time}{$this->fieldSeparator}1{$this->fieldSeparator}X{$this->fieldSeparator}004010";
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

        return "BIG{$this->fieldSeparator}{$dto->invoiceNumber}{$this->fieldSeparator}{$invDate}{$this->fieldSeparator}{$dto->poNumber}{$this->fieldSeparator}{$poDate}";
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
        $city = $address['city'] ?? '';
        $state = $address['state'] ?? '';
        $zip = $address['zip'] ?? '';
        return "N4{$this->fieldSeparator}{$city}{$this->fieldSeparator}{$state}{$this->fieldSeparator}{$zip}";
    }

    /**
     * Build PO1 segment (Line Item)
     */
    private function buildPO1($lineItem): string
    {
        $quantity = $lineItem->invoicedQuantity;
        $uom = $lineItem->quantityUom;
        $price = $lineItem->unitPrice;
        $partNum = $lineItem->partNumber;

        return "PO1{$this->fieldSeparator}{$lineItem->lineNumber}{$this->fieldSeparator}{$quantity}{$this->fieldSeparator}{$uom}{$this->fieldSeparator}{$price}{$this->fieldSeparator}{$this->fieldSeparator}{$partNum}";
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
}
