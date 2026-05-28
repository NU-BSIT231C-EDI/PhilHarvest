<?php

namespace App\Services\Edi\Generators;

use App\DTOs\Edi\Edi856AdvanceShipNoticeDto;
use Illuminate\Support\Facades\Config;

/**
 * X12 856 (Advance Ship Notice / ASN) Generator
 *
 * Structure: ISA/GS > ST > BSN > HL*S (shipment) > TD5/DTM/W12/PKG/N1*SF/N1*ST
 *            > HL*O (order) > PRF > LIN/SN1 pairs > CTT > SE > GE > IEA
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

    public function generate(Edi856AdvanceShipNoticeDto $dto): string
    {
        $this->controlNumber = $this->generateControlNumber();
        $segments = [];
        $fs = $this->fieldSeparator;

        $segments[] = $this->buildISA();
        $segments[] = $this->buildGS();
        $segments[] = $this->buildST();
        $segments[] = $this->buildBSN($dto);

        // HL*1**S — Shipment level
        $segments[] = "HL{$fs}1{$fs}{$fs}S";

        // TD5 — carrier (TD5-04=ZZ, TD5-05=carrier name)
        $carrier = $dto->carrierCode ?? '';
        $segments[] = "TD5{$fs}{$fs}{$fs}{$fs}ZZ{$fs}{$carrier}";

        // DTM*011 — ship date
        $segments[] = "DTM{$fs}011{$fs}" . $this->formatDateForX12($dto->shipDate ?? null);

        // W12 — gross weight (only when provided)
        if ($dto->totalWeight !== null && $dto->totalWeight > 0) {
            $segments[] = "W12{$fs}LB{$fs}" . number_format((float)$dto->totalWeight, 0, '.', '');
        }

        // PKG — package count
        $pkgCount = count($dto->boxes) ?: 1;
        $segments[] = "PKG{$fs}F{$fs}{$pkgCount}";

        // N1*SF — Ship From (PhilHarvest)
        $senderId = Config::get('edi-partners.manufacturer.x12.sender_id',
            Config::get('edi-partners.global.sender_id', 'PHILHARVEST'));
        $segments[] = "N1{$fs}SF{$fs}{$senderId}";
        array_push($segments, ...$this->buildAddressBlocks($dto->shipFromAddress));

        // N1*ST — Ship To
        $shipToName = trim($dto->shipToAddress['company_name'] ?? ($dto->manufacturerId ?? 'ShipTo'));
        $segments[] = "N1{$fs}ST{$fs}{$shipToName}";
        array_push($segments, ...$this->buildAddressBlocks($dto->shipToAddress));

        // HL*2*1*O — Order level
        $segments[] = "HL{$fs}2{$fs}1{$fs}O";
        $segments[] = "PRF{$fs}{$dto->poNumber}";

        // LIN + SN1 pairs — flatten all box line items
        $lineSeq = 0;
        foreach ($dto->boxes as $box) {
            foreach ($box->lineItems as $lineItem) {
                $lineSeq++;
                $uom = strtoupper($lineItem->quantityUom);
                $segments[] = "LIN{$fs}{$lineSeq}{$fs}VN{$fs}{$lineItem->partNumber}";
                $segments[] = "SN1{$fs}{$fs}{$lineItem->shippedQuantity}{$fs}{$uom}";
            }
        }

        $segments[] = "CTT{$fs}{$lineSeq}";

        // SE: -2 for ISA+GS, +1 for SE itself = net -1
        $seCount = count($segments) - 1;
        $segments[] = "SE{$fs}{$seCount}{$fs}0001";
        $segments[] = "GE{$fs}1{$fs}1";
        $segments[] = "IEA{$fs}1{$fs}{$this->controlNumber}";

        return implode($this->segmentTerminator . "\n", $segments) . $this->segmentTerminator . "\n";
    }

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
            'ISA', '00', str_repeat(' ', 10), '00', str_repeat(' ', 10),
            $senderQual, $senderId, $receiverQual, $receiverId,
            $date, $time, '^', $version, $this->controlNumber, '0', 'P', ':',
        ]);
    }

    private function buildGS(): string
    {
        $partnerConfig = Config::get('edi-partners.manufacturer', []);
        $x12Config = $partnerConfig['x12'] ?? [];
        $senderId = $x12Config['sender_id'] ?? Config::get('edi-partners.global.sender_id', 'PHILHARVEST');
        $receiverId = $x12Config['receiver_id'] ?? ($partnerConfig['code'] ?? 'SERMACROPS');
        $fs = $this->fieldSeparator;
        return "GS{$fs}SH{$fs}{$senderId}{$fs}{$receiverId}{$fs}" . date('Ymd') . "{$fs}" . date('His') . "{$fs}1{$fs}X{$fs}005010";
    }

    private function buildST(): string
    {
        return "ST{$this->fieldSeparator}856{$this->fieldSeparator}0001";
    }

    private function buildBSN(Edi856AdvanceShipNoticeDto $dto): string
    {
        $fs = $this->fieldSeparator;
        $date = $this->formatDateForX12($dto->shipDate ?? null);
        $time = date('Hi');
        return "BSN{$fs}00{$fs}{$dto->asnNumber}{$fs}{$date}{$fs}{$time}";
    }

    private function buildAddressBlocks(array $address): array
    {
        $segs = [];
        $fs = $this->fieldSeparator;

        $street = trim($address['street'] ?? '');
        $street2 = trim($address['address_line_2'] ?? '');
        if ($street !== '') {
            $n3 = "N3{$fs}{$street}";
            if ($street2 !== '') {
                $n3 .= "{$fs}{$street2}";
            }
            $segs[] = $n3;
        }

        $city    = trim($address['city']        ?? '');
        $state   = trim($address['state']       ?? '');
        $postal  = trim($address['postal_code'] ?? '');
        $country = trim($address['country']     ?? '');
        if ($city !== '' || $state !== '' || $postal !== '' || $country !== '') {
            $segs[] = "N4{$fs}{$city}{$fs}{$state}{$fs}{$postal}{$fs}{$country}";
        }

        return $segs;
    }

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
            return preg_replace('/\D/', '', $date);
        }
        return date('Ymd', $timestamp);
    }

    private function formatIsaVersion(string $version): string
    {
        $normalized = preg_replace('/\D/', '', $version);
        return substr(str_pad($normalized ?: '005010', 5, '0', STR_PAD_LEFT), 0, 5);
    }
}
