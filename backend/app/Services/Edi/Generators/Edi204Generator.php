<?php

namespace App\Services\Edi\Generators;

use App\DTOs\Edi\Edi204MotorCarrierLoadTenderDto;
use Illuminate\Support\Facades\Config;

/**
 * X12 204 (Motor Carrier Load Tender) Generator — Document B spec
 *
 * Flat structure (no S5/LX/L5 loops):
 *   ISA / GS / ST
 *   B2   — B2-02=SenderName, B2-04=PO/REF, B2-06=PP
 *   B2A  — 00 / LT
 *   L11  — PO reference
 *   G62*37 — pickup date  |  G62*38 — delivery date
 *   MS3  — carrier / H / ZZ
 *   AT5  — AB (service level)
 *   N1*SH / N3 / N4  — shipper
 *   N1*CN / N3 / N4  — consignee
 *   AT8*G*LB  — total gross weight
 *   L3***<pieces>   — piece count only
 *   NTE** — special instructions
 *   SE / GE / IEA
 */
class Edi204Generator
{
    private string $segmentTerminator = '~';
    private string $fieldSeparator    = '*';
    private string $controlNumber     = '000000001';

    public function __construct()
    {
        $this->controlNumber = $this->generateControlNumber();
    }

    public function generate(Edi204MotorCarrierLoadTenderDto $dto): string
    {
        $this->controlNumber = $this->generateControlNumber();
        $fs  = $this->fieldSeparator;
        $seg = [];

        $seg[] = $this->buildISA();
        $seg[] = $this->buildGS();
        $seg[] = "ST{$fs}204{$fs}{$this->controlNumber}";

        // B2 — B2-02=Sender, B2-04=PO/REF, B2-06=PP
        $ref    = $dto->poNumber ?: $dto->loadTenderId;
        $sender = substr($dto->shipperCompanyName, 0, 35);
        $seg[]  = "B2{$fs}{$fs}{$sender}{$fs}{$fs}{$ref}{$fs}{$fs}PP";

        // B2A — transaction set purpose / transportation type
        $seg[] = "B2A{$fs}00{$fs}LT";

        // L11 — PO reference at header level
        $seg[] = "L11{$fs}{$ref}{$fs}PO";

        // G62 — date qualifiers: 37=pickup, 38=delivery
        $pickupDate = $this->formatDate($dto->pickupDate);
        $seg[] = "G62{$fs}37{$fs}{$pickupDate}";

        if (!empty($dto->deliveryDate)) {
            $seg[] = "G62{$fs}38{$fs}" . $this->formatDate($dto->deliveryDate);
        }

        // MS3 — carrier routing: qualifier H, routing code ZZ
        $carrierCode = strtoupper(trim($dto->carrierCode));
        $seg[] = "MS3{$fs}{$carrierCode}{$fs}H{$fs}ZZ";

        // AT5 — service level AB
        $seg[] = "AT5{$fs}AB";

        // N1*SH — Shipper (flat, no S5/LX nesting)
        $seg[] = "N1{$fs}SH{$fs}{$sender}";
        if (!empty($dto->shipperAddress)) {
            $seg[] = $this->buildN3($dto->shipperAddress);
            $seg[] = $this->buildN4($dto->shipperAddress);
        }

        // N1*CN — Consignee
        $consigneeName = substr($dto->shipToAddress['company_name'] ?? '', 0, 35);
        $seg[] = "N1{$fs}CN{$fs}{$consigneeName}";
        if (!empty($dto->shipToAddress)) {
            $seg[] = $this->buildN3($dto->shipToAddress);
            $seg[] = $this->buildN4($dto->shipToAddress);
        }

        // L3 — piece count only at position 3; positions 1 and 2 empty
        $pieceCount = count($dto->shipments);
        $seg[] = "L3{$fs}{$fs}{$fs}{$pieceCount}";

        // AT8 — total gross weight in LB (aggregated across all shipments)
        $totalWeight = $this->aggregateWeight($dto);
        if ($totalWeight !== null) {
            $seg[] = "AT8{$fs}G{$fs}LB{$fs}{$totalWeight}";
        }

        // NTE — special instructions (empty qualifier per Document B)
        if (!empty($dto->specialInstructions)) {
            $note = substr($dto->specialInstructions, 0, 80);
            $seg[] = "NTE{$fs}{$fs}{$note}";
        }

        // SE — count from ST through SE inclusive (ISA and GS are excluded)
        $stIndex  = 2; // ISA=0, GS=1, ST=2
        $seCount  = count($seg) - $stIndex + 1; // +1 for SE itself
        $seg[] = "SE{$fs}{$seCount}{$fs}{$this->controlNumber}";

        $seg[] = "GE{$fs}1{$fs}1";
        $seg[] = "IEA{$fs}1{$fs}{$this->controlNumber}";

        return implode($this->segmentTerminator . "\n", $seg) . $this->segmentTerminator . "\n";
    }

    private function buildISA(): string
    {
        $global       = Config::get('edi-partners.global');
        $logistics    = Config::get('edi-partners.logistics.x12', []);
        $senderQual   = $global['sender_qualifier']           ?? 'ZZ';
        $senderId     = str_pad($global['sender_id']          ?? 'PHILHARVEST', 15, ' ');
        $receiverQual = $logistics['receiver_qualifier']       ?? 'ZZ';
        $receiverId   = str_pad($logistics['receiver_id']      ?? 'LOGISTICS',  15, ' ');
        $date         = date('ymd');
        $time         = date('Hi');

        $fs = $this->fieldSeparator;
        return implode($fs, [
            'ISA',
            '00', str_repeat(' ', 10),
            '00', str_repeat(' ', 10),
            $senderQual, $senderId,
            $receiverQual, $receiverId,
            $date, $time,
            '^', '00501',
            $this->controlNumber,
            '0', 'P', ':',
        ]);
    }

    private function buildGS(): string
    {
        $global    = Config::get('edi-partners.global');
        $logistics = Config::get('edi-partners.logistics.x12', []);
        $senderId  = $global['sender_id']         ?? 'PHILHARVEST';
        $receiverId = $logistics['receiver_id']   ?? 'LOGISTICS';
        $date = date('Ymd');
        $time = date('Hi');
        $fs   = $this->fieldSeparator;

        // GS01 must be QO for 204; GS08 must be 005010
        return "GS{$fs}QO{$fs}{$senderId}{$fs}{$receiverId}{$fs}{$date}{$fs}{$time}{$fs}1{$fs}X{$fs}005010";
    }

    /**
     * N3 — combine address_line_1 and address_line_2 with * as per Document B.
     * Output: N3*<line1>*<line2>  (or N3*<line1>* if line2 absent)
     */
    private function buildN3(array $address): string
    {
        $line1 = $address['street']         ?? $address['address_line_1'] ?? '';
        $line2 = $address['address_line_2'] ?? '';
        $fs    = $this->fieldSeparator;
        return "N3{$fs}{$line1}{$fs}{$line2}";
    }

    /** N4*<city>*<state>*<postal>*<country> */
    private function buildN4(array $address): string
    {
        $city    = $address['city']        ?? '';
        $state   = $address['state']       ?? '';
        $postal  = $address['postal_code'] ?? $address['zip'] ?? '';
        $country = $address['country']     ?? '';
        $fs      = $this->fieldSeparator;
        return "N4{$fs}{$city}{$fs}{$state}{$fs}{$postal}{$fs}{$country}";
    }

    /** Sum weights across all shipments; return null if none have weight. */
    private function aggregateWeight(Edi204MotorCarrierLoadTenderDto $dto): ?float
    {
        // Prefer explicit total on the DTO
        if ($dto->shipmentWeight !== null && $dto->shipmentWeight !== '') {
            return (float) $dto->shipmentWeight;
        }

        $total = null;
        foreach ($dto->shipments as $shipment) {
            if ($shipment->weight !== null) {
                $total = ($total ?? 0) + (float) $shipment->weight;
            }
        }
        return $total;
    }

    private function generateControlNumber(): string
    {
        $config  = Config::get('edi-partners.global');
        $padding = $config['control_number_padding'] ?? 9;
        $ts      = (int)(microtime(true) * 1000) % (10 ** $padding);
        return str_pad((string) $ts, $padding, '0', STR_PAD_LEFT);
    }

    private function formatDate(?string $date): string
    {
        if (empty($date)) {
            return date('Ymd');
        }
        $ts = strtotime($date);
        return $ts !== false ? date('Ymd', $ts) : preg_replace('/[^0-9]/', '', $date);
    }
}
