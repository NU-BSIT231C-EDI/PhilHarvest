<?php

namespace App\Services\Edi\Generators;

use App\DTOs\Edi\Edi204MotorCarrierLoadTenderDto;
use Illuminate\Support\Facades\Config;

/**
 * X12 204 (Motor Carrier Load Tender) Generator
 * 
 * Generates raw X12 EDI 204 strings for logistics partners
 */
class Edi204Generator
{
    private string $segmentTerminator = '~';
    private string $fieldSeparator = '*';
    private string $controlNumber = '001';

    public function __construct()
    {
        $this->controlNumber = $this->generateControlNumber();
    }

    /**
     * Generate X12 204 from DTO
     */
    public function generate(Edi204MotorCarrierLoadTenderDto $dto): string
    {
        $this->controlNumber = $this->generateControlNumber();
        $segments = [];

        // ISA - Interchange Control Header
        $segments[] = $this->buildISA();

        // GS - Functional Group Header
        $segments[] = $this->buildGS();

        // ST - Transaction Set Header
        $segments[] = $this->buildST();

        // BX - Beginning Segment for Motor Carrier Load Tender
        $segments[] = $this->buildBX($dto);

        // G62 - Date/Time Produced
        $segments[] = $this->buildG62($dto);

        // N1 - Party Identification (Shipper)
        $segments[] = $this->buildN1Shipper($dto);

        // N2 - Additional Party Identification Data
        if (!empty($dto->shipperCompanyName)) {
            $segments[] = "N2{$this->fieldSeparator}{$dto->shipperCompanyName}";
        }

        // N3 - Party Location
        if (!empty($dto->shipperAddress)) {
            $segments[] = $this->buildN3($dto->shipperAddress);
        }

        // N4 - Geographic Location
        if (!empty($dto->shipperAddress)) {
            $segments[] = $this->buildN4($dto->shipperAddress);
        }

        // Repeat N1 loop for Ship-To
        $shipToName = $dto->shipToAddress['company_name'] ?? 'ShipTo';
        $segments[] = "N1{$this->fieldSeparator}ST{$this->fieldSeparator}{$shipToName}";
        if (!empty($dto->shipToAddress)) {
            $segments[] = $this->buildN3($dto->shipToAddress);
            $segments[] = $this->buildN4($dto->shipToAddress);
        }

        // Shipment details
        foreach ($dto->shipments as $shipmentIndex => $shipment) {
            // S5 - Shipment Information
            $segments[] = "S5{$this->fieldSeparator}" . ($shipmentIndex + 1);

            // Shipment details from DTOs would go here
            foreach ($shipment->lineItems as $lineItem) {
                $segments[] = $this->buildL0($lineItem);
            }
        }

        // LX - Transaction Set Line Number
        $segments[] = "LX{$this->fieldSeparator}1";

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
        $config = Config::get('edi-partners.global');
        $senderQual = $config['sender_qualifier'] ?? '01';
        $senderId = str_pad($config['sender_id'] ?? 'PHILHARVEST', 15, ' ');
        $receiverQual = '01';
        $receiverId = str_pad('LOGISTICS', 15, ' ');
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
        return "GS{$this->fieldSeparator}MC{$this->fieldSeparator}PHILHARVEST{$this->fieldSeparator}LOGISTICS{$this->fieldSeparator}{$date}{$this->fieldSeparator}{$time}{$this->fieldSeparator}1{$this->fieldSeparator}X{$this->fieldSeparator}004010";
    }

    /**
     * Build ST segment
     */
    private function buildST(): string
    {
        return "ST{$this->fieldSeparator}204{$this->fieldSeparator}0001";
    }

    /**
     * Build BX segment (Beginning of Motor Carrier Load Tender)
     */
    private function buildBX(Edi204MotorCarrierLoadTenderDto $dto): string
    {
        $shipmentType = $dto->shipments[0]->shipmentType ?? 'TL';
        return "BX{$this->fieldSeparator}00{$this->fieldSeparator}{$dto->loadTenderId}{$this->fieldSeparator}{$shipmentType}";
    }

    /**
     * Build G62 segment (Date/Time Produced)
     */
    private function buildG62(Edi204MotorCarrierLoadTenderDto $dto): string
    {
        $date = $this->formatDateForX12($dto->pickupDate ?? null);
        $time = $this->formatTimeForX12($dto->pickupTime ?? null, 'His');
        return "G62{$this->fieldSeparator}137{$this->fieldSeparator}{$date}{$this->fieldSeparator}{$time}";
    }

    /**
     * Build N1 segment (Shipper)
     */
    private function buildN1Shipper(Edi204MotorCarrierLoadTenderDto $dto): string
    {
        $name = substr($dto->shipperCompanyName, 0, 60);
        return "N1{$this->fieldSeparator}SH{$this->fieldSeparator}{$name}";
    }

    /**
     * Build N3 segment (Address)
     */
    private function buildN3(array $address): string
    {
        $street = $address['street'] ?? '';
        return "N3{$this->fieldSeparator}{$street}";
    }

    /**
     * Build N4 segment (City, State, ZIP)
     */
    private function buildN4(array $address): string
    {
        $city = $address['city'] ?? '';
        $state = $address['state'] ?? '';
        $zip = $address['zip'] ?? '';
        return "N4{$this->fieldSeparator}{$city}{$this->fieldSeparator}{$state}{$this->fieldSeparator}{$zip}";
    }

    /**
     * Build L0 segment (Line Item)
     */
    private function buildL0($lineItem): string
    {
        $weight = $lineItem->weight ?? 0;
        $uom = $lineItem->weightUom ?? 'LB';
        return "L0{$this->fieldSeparator}1{$this->fieldSeparator}{$weight}{$this->fieldSeparator}{$uom}";
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

    private function formatTimeForX12(?string $time, string $format = 'Hi'): string
    {
        if (empty($time)) {
            return date($format);
        }

        $timestamp = strtotime($time);
        if ($timestamp === false) {
            return preg_replace('/[^0-9]/', '', $time);
        }

        return date($format, $timestamp);
    }
}
