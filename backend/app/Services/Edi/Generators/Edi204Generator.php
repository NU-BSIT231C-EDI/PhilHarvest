<?php

namespace App\Services\Edi\Generators;

use App\DTOs\Edi\Edi204MotorCarrierLoadTenderDto;
use Illuminate\Support\Facades\Config;

/**
 * X12 204 (Motor Carrier Load Tender) Generator
 *
 * Generates raw X12 EDI 204 strings for logistics partners.
 *
 * Structure:
 *   ISA / GS / ST
 *   B2   — beginning segment (carrier SCAC, load tender ID, payment method PP)
 *   B2A  — transaction set purpose (00=Original) and transportation type (LT=Load Tender)
 *   G62  — pickup date (qualifier 10 = Requested Ship Date)
 *   G62  — delivery date (qualifier 02), when present
 *   N1*SH loop — shipper at header level
 *   S5*1*PU loop — pickup stop
 *     N1*SF + N3 + N4 — shipper party at this stop
 *     LX / L5 / AT8 / L11 — one set per shipment
 *   S5*2*SO loop — delivery stop
 *     N1*ST + N3 + N4 — consignee party
 *   SE / GE / IEA
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

    public function generate(Edi204MotorCarrierLoadTenderDto $dto): string
    {
        $this->controlNumber = $this->generateControlNumber();
        $segments = [];

        $segments[] = $this->buildISA();
        $segments[] = $this->buildGS();
        $segments[] = $this->buildST();

        // B2 + B2A — Beginning segments (X12 204 standard; BX is not valid for 204)
        $segments[] = $this->buildB2($dto);
        $segments[] = "B2A{$this->fieldSeparator}00{$this->fieldSeparator}LT";

        // G62 — Pickup date (qualifier 10 = Requested Ship Date, 2-char)
        $pickupDate = $this->formatDateForX12($dto->pickupDate ?? null);
        $segments[] = "G62{$this->fieldSeparator}10{$this->fieldSeparator}{$pickupDate}";

        // G62 — Delivery date (qualifier 02 = Delivery Requested), when set
        if (!empty($dto->deliveryDate)) {
            $deliveryDate = $this->formatDateForX12($dto->deliveryDate);
            $segments[] = "G62{$this->fieldSeparator}02{$this->fieldSeparator}{$deliveryDate}";
        }

        // N1*SH — Shipper (header-level party identification)
        $shipperName = substr($dto->shipperCompanyName, 0, 60);
        $segments[] = "N1{$this->fieldSeparator}SH{$this->fieldSeparator}{$shipperName}";
        if (!empty($dto->shipperAddress)) {
            $segments[] = $this->buildN3($dto->shipperAddress);
            $segments[] = $this->buildN4($dto->shipperAddress);
        }

        // S5*1*PU — Pickup stop
        $segments[] = "S5{$this->fieldSeparator}1{$this->fieldSeparator}PU";
        $segments[] = "N1{$this->fieldSeparator}SF{$this->fieldSeparator}{$shipperName}";
        if (!empty($dto->shipperAddress)) {
            $segments[] = $this->buildN3($dto->shipperAddress);
            $segments[] = $this->buildN4($dto->shipperAddress);
        }

        // LX loop — one per shipment, nested inside pickup stop
        foreach ($dto->shipments as $idx => $shipment) {
            $lineNum = $idx + 1;
            $segments[] = "LX{$this->fieldSeparator}{$lineNum}";

            if (!empty($shipment->commodity)) {
                $segments[] = "L5{$this->fieldSeparator}{$lineNum}{$this->fieldSeparator}{$shipment->commodity}";
            }

            if ($shipment->weight !== null) {
                $weightCode = $this->mapWeightUom($shipment->weightUom ?? 'LB');
                $segments[] = "AT8{$this->fieldSeparator}G{$this->fieldSeparator}{$weightCode}{$this->fieldSeparator}{$shipment->weight}";
            }

            if (!empty($shipment->shipmentNumber)) {
                $segments[] = "L11{$this->fieldSeparator}{$shipment->shipmentNumber}{$this->fieldSeparator}SI";
            }
        }

        // S5*2*SO — Delivery (Sell-Off / Ship-To) stop
        $segments[] = "S5{$this->fieldSeparator}2{$this->fieldSeparator}SO";
        $shipToName = $dto->shipToAddress['company_name'] ?? '';
        $segments[] = "N1{$this->fieldSeparator}ST{$this->fieldSeparator}{$shipToName}";
        if (!empty($dto->shipToAddress)) {
            $segments[] = $this->buildN3($dto->shipToAddress);
            $segments[] = $this->buildN4($dto->shipToAddress);
        }

        // SE — counts ST through SE inclusive (excludes ISA and GS)
        $count = count($segments) - 2 + 1; // -2 for ISA/GS, +1 for SE itself
        $segments[] = "SE{$this->fieldSeparator}{$count}{$this->fieldSeparator}0001";

        $segments[] = "GE{$this->fieldSeparator}1{$this->fieldSeparator}1";
        $segments[] = "IEA{$this->fieldSeparator}1{$this->fieldSeparator}{$this->controlNumber}";

        return implode($this->segmentTerminator . "\n", $segments) . $this->segmentTerminator . "\n";
    }

    private function buildISA(): string
    {
        $config = Config::get('edi-partners.global');
        $senderQual = $config['sender_qualifier'] ?? 'ZZ';
        $senderId   = str_pad($config['sender_id'] ?? 'PHILHARVEST', 15, ' ');
        $receiverQual = '01';
        $receiverId   = str_pad('LOGISTICS', 15, ' ');
        $date = date('ymd');
        $time = date('Hi');

        return implode($this->fieldSeparator, [
            'ISA',
            '00', str_repeat(' ', 10),
            '00', str_repeat(' ', 10),
            $senderQual, $senderId,
            $receiverQual, $receiverId,
            $date, $time,
            '^', '00401',
            $this->controlNumber,
            '0', 'P', ':',
        ]);
    }

    private function buildGS(): string
    {
        $config    = Config::get('edi-partners.global');
        $senderId  = $config['sender_id'] ?? 'PHILHARVEST';
        $date = date('Ymd');
        $time = date('Hi'); // GS04 must be exactly 4 digits (HHMM)
        return "GS{$this->fieldSeparator}MC{$this->fieldSeparator}{$senderId}{$this->fieldSeparator}LOGISTICS{$this->fieldSeparator}{$date}{$this->fieldSeparator}{$time}{$this->fieldSeparator}1{$this->fieldSeparator}X{$this->fieldSeparator}004010";
    }

    private function buildST(): string
    {
        return "ST{$this->fieldSeparator}204{$this->fieldSeparator}0001";
    }

    /**
     * B2-01: blank (Shipment Method of Payment — omitted; declared via B2-06)
     * B2-02: Carrier code
     * B2-03: blank (Bill of Lading Number)
     * B2-04: Shipment Identification Number (load tender ID)
     * B2-05: blank
     * B2-06: PP (Prepaid)
     *
     * Produces: B2**{carrierCode}**{loadTenderId}**PP
     */
    private function buildB2(Edi204MotorCarrierLoadTenderDto $dto): string
    {
        $fs = $this->fieldSeparator;
        return "B2{$fs}{$fs}{$dto->carrierCode}{$fs}{$fs}{$dto->loadTenderId}{$fs}{$fs}PP";
    }

    private function buildN3(array $address): string
    {
        $street = $address['street'] ?? '';
        return "N3{$this->fieldSeparator}{$street}";
    }

    /**
     * N4*{city}*{state}*{postal}*{country}
     * Accepts both 'postal_code' and 'zip' keys for the postal field.
     */
    private function buildN4(array $address): string
    {
        $city    = $address['city'] ?? '';
        $state   = $address['state'] ?? '';
        $postal  = $address['postal_code'] ?? $address['zip'] ?? '';
        $country = $address['country'] ?? '';
        return "N4{$this->fieldSeparator}{$city}{$this->fieldSeparator}{$state}{$this->fieldSeparator}{$postal}{$this->fieldSeparator}{$country}";
    }

    /** Map human-readable UOM to X12 AT8-02 weight unit code. */
    private function mapWeightUom(string $uom): string
    {
        return match (strtoupper($uom)) {
            'KG', 'KGS', 'K' => 'K',
            default           => 'L', // LB, LBS → L (Pounds)
        };
    }

    private function generateControlNumber(): string
    {
        $config  = Config::get('edi-partners.global');
        $padding = $config['control_number_padding'] ?? 9;
        $ts = (int)(microtime(true) * 1000) % (10 ** $padding);
        return str_pad((string) $ts, $padding, '0', STR_PAD_LEFT);
    }

    private function formatDateForX12(?string $date): string
    {
        if (empty($date)) {
            return date('Ymd');
        }
        $ts = strtotime($date);
        return $ts !== false ? date('Ymd', $ts) : preg_replace('/[^0-9]/', '', $date);
    }
}
