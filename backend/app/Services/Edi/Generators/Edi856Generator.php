<?php

namespace App\Services\Edi\Generators;

use App\DTOs\Edi\Edi856AdvanceShipNoticeDto;
use Illuminate\Support\Facades\Config;

/**
 * X12 856 (Advance Ship Notice / ASN) Generator
 * 
 * Generates raw X12 EDI 856 strings for manufacturers
 */
class Edi856Generator
{
    private string $segmentTerminator = '~';
    private string $fieldSeparator = '*';
    private string $controlNumber = '001';

    public function __construct()
    {
        $this->controlNumber = $this->generateControlNumber();
    }

    /**
     * Generate X12 856 from DTO
     */
    public function generate(Edi856AdvanceShipNoticeDto $dto): string
    {
        $this->controlNumber = $this->generateControlNumber();
        $segments = [];

        // ISA - Interchange Control Header
        $segments[] = $this->buildISA();

        // GS - Functional Group Header
        $segments[] = $this->buildGS();

        // ST - Transaction Set Header
        $segments[] = $this->buildST();

        // BSN - Beginning Segment
        $segments[] = $this->buildBSN($dto);

        // DTM - Date/Time Reference
        $segments[] = "DTM{$this->fieldSeparator}011{$this->fieldSeparator}" . date('Ymd');

        // N1 - Name Loop (Shipper)
        $segments[] = $this->buildN1Shipper();
        if (!empty($dto->shipFromAddress)) {
            $segments[] = $this->buildN3ShipFrom($dto->shipFromAddress);
            $segments[] = $this->buildN4ShipFrom($dto->shipFromAddress);
        }

        // N1 - Ship To
        $segments[] = "N1{$this->fieldSeparator}ST{$this->fieldSeparator}" . ($dto->shipToAddress['company_name'] ?? 'ShipTo');
        if (!empty($dto->shipToAddress)) {
            $segments[] = $this->buildN3ShipTo($dto->shipToAddress);
            $segments[] = $this->buildN4ShipTo($dto->shipToAddress);
        }

        // HL - Hierarchy Loop
        $hlNum = 1;
        foreach ($dto->boxes as $box) {
            // HL segment for shipment
            $segments[] = "HL{$this->fieldSeparator}{$hlNum}{$this->fieldSeparator}{$this->fieldSeparator}O";
            $hlNum++;

            // DTM for box
            $segments[] = "DTM{$this->fieldSeparator}011{$this->fieldSeparator}" . date('Ymd');

            // MAN - Marks and Numbers
            $segments[] = "MAN{$this->fieldSeparator}92{$this->fieldSeparator}{$box->boxNumber}";

            // HL for package
            $parentHl = $hlNum - 1;
            $segments[] = "HL{$this->fieldSeparator}{$hlNum}{$this->fieldSeparator}{$parentHl}{$this->fieldSeparator}P";
            $hlNum++;

            // PO1 - Line items in box
            foreach ($box->lineItems as $lineItem) {
                $segments[] = $this->buildPO1($lineItem);
            }
        }

        // CTT - Transaction Total
        $segments[] = "CTT{$this->fieldSeparator}1";

        // SE - Transaction Set Trailer
        $count = count($segments) + 1;
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
        return "GS{$this->fieldSeparator}SH{$this->fieldSeparator}{$senderId}{$this->fieldSeparator}{$receiverId}{$this->fieldSeparator}{$date}{$this->fieldSeparator}{$time}{$this->fieldSeparator}1{$this->fieldSeparator}X{$this->fieldSeparator}005010";
    }

    /**
     * Build ST segment
     */
    private function buildST(): string
    {
        return "ST{$this->fieldSeparator}856{$this->fieldSeparator}0001";
    }

    /**
     * Build BSN segment (Beginning Segment)
     */
    private function buildBSN(Edi856AdvanceShipNoticeDto $dto): string
    {
        $date = $this->formatDateForX12($dto->shipDate ?? null);
        $time = date('His');
        return "BSN{$this->fieldSeparator}92{$this->fieldSeparator}{$dto->asnNumber}{$this->fieldSeparator}{$date}{$this->fieldSeparator}{$time}";
    }

    /**
     * Build N1 Shipper
     */
    private function buildN1Shipper(): string
    {
        $senderId = Config::get('edi-partners.manufacturer.x12.sender_id', Config::get('edi-partners.global.sender_id', 'PHILHARVEST'));
        return "N1{$this->fieldSeparator}SH{$this->fieldSeparator}{$senderId}";
    }

    /**
     * Build N3 Ship From
     */
    private function buildN3ShipFrom(array $address): string
    {
        $street = $address['street'] ?? '';
        return "N3{$this->fieldSeparator}{$street}";
    }

    /**
     * Build N4 Ship From
     */
    private function buildN4ShipFrom(array $address): string
    {
        $city = $address['city'] ?? '';
        $state = $address['state'] ?? '';
        $zip = $address['zip'] ?? '';
        return "N4{$this->fieldSeparator}{$city}{$this->fieldSeparator}{$state}{$this->fieldSeparator}{$zip}";
    }

    /**
     * Build N3 Ship To
     */
    private function buildN3ShipTo(array $address): string
    {
        $street = $address['street'] ?? '';
        return "N3{$this->fieldSeparator}{$street}";
    }

    /**
     * Build N4 Ship To
     */
    private function buildN4ShipTo(array $address): string
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
        $quantity = $lineItem->shippedQuantity;
        $uom = $lineItem->quantityUom;
        $partNum = $lineItem->partNumber;

        return "PO1{$this->fieldSeparator}{$lineItem->lineNumber}{$this->fieldSeparator}{$quantity}{$this->fieldSeparator}{$uom}{$this->fieldSeparator}{$this->fieldSeparator}{$this->fieldSeparator}{$partNum}";
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
