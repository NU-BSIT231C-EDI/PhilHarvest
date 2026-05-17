<?php

namespace App\Services\Edi\Generators;

use App\DTOs\Edi\Edi855PurchaseOrderAckDto;
use App\DTOs\Edi\Edi855LineAckDto;
use Illuminate\Support\Facades\Config;

/**
 * X12 855 (Purchase Order Acknowledgment) Generator
 * 
 * Generates raw X12 EDI 855 strings from DTOs
 */
class Edi855Generator
{
    private string $segmentTerminator = '~';
    private string $fieldSeparator = '*';
    private string $componentSeparator = '^';
    private string $controlNumber = '001';

    public function __construct()
    {
        // Initialize control number
        $this->controlNumber = $this->generateControlNumber();
    }

    /**
     * Generate X12 855 from DTO
     */
    public function generate(Edi855PurchaseOrderAckDto $dto): string
    {
        $this->controlNumber = $this->generateControlNumber();
        $segments = [];

        // ISA - Interchange Control Header
        $segments[] = $this->buildISA();

        // GS - Functional Group Header
        $segments[] = $this->buildGS('855');

        // ST - Transaction Set Header
        $segments[] = $this->buildST('855');

        // BEG - Beginning of Purchase Order Acknowledgment
        $segments[] = $this->buildBEG($dto);

        // CUR - Currency (if not USD)
        if ($dto->poDate) {
            $segments[] = $this->buildDTM($dto);
        }

        // N1 - Name Loop
        $segments[] = $this->buildN1Manufacturer($dto);
        $segments[] = $this->buildN1Buyer($dto);

        // PO1 - Line Item Detail (Baseline Item Data)
        foreach ($dto->lineAcknowledgments as $lineAck) {
            foreach ($this->buildLineAcknowledgmentSegments($lineAck) as $lineSegment) {
                $segments[] = $lineSegment;
            }
        }

        // CTT - Transaction Total
        $segments[] = $this->buildCTT($dto);

        // SE - Transaction Set Trailer
        $count = count($segments) + 1;  // +1 for SE itself
        $segments[] = "SE{$this->fieldSeparator}$count{$this->fieldSeparator}0001";

        // GE - Functional Group Trailer
        $segments[] = "GE{$this->fieldSeparator}1{$this->fieldSeparator}1";

        // IEA - Interchange Control Trailer
        $segments[] = "IEA{$this->fieldSeparator}1{$this->fieldSeparator}{$this->controlNumber}";

        return implode($this->segmentTerminator, $segments) . $this->segmentTerminator;
    }

    /**
     * Build ISA segment (Interchange Control Header)
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
        $elements = [
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
        ];

        return implode($this->fieldSeparator, $elements);
    }

    /**
     * Build GS segment (Functional Group Header)
     */
    private function buildGS(string $transactionCode): string
    {
        $date = date('Ymd');
        $time = date('His');
        return "GS{$this->fieldSeparator}PO{$this->fieldSeparator}PHILHARVEST{$this->fieldSeparator}MANUFACTURER{$this->fieldSeparator}{$date}{$this->fieldSeparator}{$time}{$this->fieldSeparator}1{$this->fieldSeparator}X{$this->fieldSeparator}004010";
    }

    /**
     * Build ST segment (Transaction Set Header)
     */
    private function buildST(string $transactionCode): string
    {
        return "ST{$this->fieldSeparator}{$transactionCode}{$this->fieldSeparator}0001";
    }

    /**
     * Build BEG segment (Beginning of Purchase Order Acknowledgment)
     */
    private function buildBEG(Edi855PurchaseOrderAckDto $dto): string
    {
        $poDate = $this->formatDateForX12($dto->poDate);
        return "BEG{$this->fieldSeparator}{$dto->acknowledgmentCode}{$this->fieldSeparator}04{$this->fieldSeparator}{$dto->poNumber}{$this->fieldSeparator}{$poDate}";
    }

    /**
     * Build DTM segment (Date/Time Reference)
     */
    private function buildDTM(Edi855PurchaseOrderAckDto $dto): string
    {
        $date = $this->formatDateForX12($dto->acknowledgedDate);
        return "DTM{$this->fieldSeparator}137{$this->fieldSeparator}{$date}{$this->fieldSeparator}102";
    }

    /**
     * Build N1 segment for Manufacturer
     */
    private function buildN1Manufacturer(Edi855PurchaseOrderAckDto $dto): string
    {
        return "N1{$this->fieldSeparator}MF{$this->fieldSeparator}{$dto->manufacturerId}";
    }

    /**
     * Build N1 segment for Buyer
     */
    private function buildN1Buyer(Edi855PurchaseOrderAckDto $dto): string
    {
        return "N1{$this->fieldSeparator}BY{$this->fieldSeparator}PHILHARVEST";
    }

    /**
     * Build PO1 segment (Line Item Detail)
     */
    private function buildLineAcknowledgmentSegments(Edi855LineAckDto $lineAck): array
    {
        $segments = [];

        $segments[] = "PO1{$this->fieldSeparator}{$lineAck->lineNumber}";
        $segments[] = $this->buildACK($lineAck);

        if (!empty($lineAck->estimatedDeliveryDate)) {
            $segments[] = "DTM{$this->fieldSeparator}017{$this->fieldSeparator}{$this->formatDateForX12($lineAck->estimatedDeliveryDate)}";
        }

        return $segments;
    }

    /**
     * Build ACK segment (Line item acknowledgment)
     */
    private function buildACK(Edi855LineAckDto $lineAck): string
    {
        $date = !empty($lineAck->estimatedDeliveryDate)
            ? $this->fieldSeparator . '017' . $this->fieldSeparator . $this->formatDateForX12($lineAck->estimatedDeliveryDate)
            : '';

        return "ACK{$this->fieldSeparator}{$lineAck->acknowledgmentCode}{$this->fieldSeparator}{$lineAck->acceptedQuantity}{$this->fieldSeparator}{$lineAck->quantityUom}{$date}";
    }

    /**
     * Build CTT segment (Transaction Total)
     */
    private function buildCTT(Edi855PurchaseOrderAckDto $dto): string
    {
        $count = count($dto->lineAcknowledgments);
        return "CTT{$this->fieldSeparator}{$count}";
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

    /**
     * Format incoming dates to X12 CCYYMMDD format
     */
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
