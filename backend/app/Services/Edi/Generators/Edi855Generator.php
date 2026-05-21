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
    private string $controlNumber = '001';

    public function __construct()
    {
        $this->controlNumber = $this->generateControlNumber();
    }

    /**
     * Generate X12 855 from DTO
     */
    public function generate(Edi855PurchaseOrderAckDto $dto): string
    {
        $this->controlNumber = $this->generateControlNumber();
        $segments = [];

        $segments[] = $this->buildISA();
        $segments[] = $this->buildGS();
        $segments[] = $this->buildST();
        $segments[] = $this->buildBAK($dto);

        if ($dto->poDate) {
            $segments[] = $this->buildDTM($dto);
        }

        // N1 name loops with N3/N4 address detail when available
        array_push($segments, ...$this->buildN1ManufacturerLoop($dto));
        array_push($segments, ...$this->buildN1SellerLoop($dto));

        // PO1 / ACK pairs
        foreach ($dto->lineAcknowledgments as $lineAck) {
            foreach ($this->buildLineAcknowledgmentSegments($lineAck) as $seg) {
                $segments[] = $seg;
            }
        }

        $segments[] = $this->buildCTT($dto);

        // SE counts segments from ST through SE inclusive.
        // ISA and GS (indices 0-1) are outside the transaction set, so subtract them.
        $seCount = count($segments) - 1;  // -2 for ISA+GS, +1 for SE itself = -1
        $segments[] = "SE{$this->fieldSeparator}{$seCount}{$this->fieldSeparator}0001";
        $segments[] = "GE{$this->fieldSeparator}1{$this->fieldSeparator}1";
        $segments[] = "IEA{$this->fieldSeparator}1{$this->fieldSeparator}{$this->controlNumber}";

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
        return "GS{$fs}PR{$fs}{$senderId}{$fs}{$receiverId}{$fs}" . date('Ymd') . "{$fs}" . date('His') . "{$fs}1{$fs}X{$fs}005010";
    }

    private function buildST(): string
    {
        return "ST{$this->fieldSeparator}855{$this->fieldSeparator}0001";
    }

    /**
     * BAK01=00 (Original), BAK02=acknowledgment type, BAK03=PO number, BAK04=date
     */
    private function buildBAK(Edi855PurchaseOrderAckDto $dto): string
    {
        $fs = $this->fieldSeparator;
        $poDate = $this->formatDateForX12($dto->poDate);
        return "BAK{$fs}00{$fs}{$dto->acknowledgmentCode}{$fs}{$dto->poNumber}{$fs}{$poDate}";
    }

    private function buildDTM(Edi855PurchaseOrderAckDto $dto): string
    {
        $fs = $this->fieldSeparator;
        $date = $this->formatDateForX12($dto->acknowledgedDate);
        return "DTM{$fs}137{$fs}{$date}{$fs}102";
    }

    /**
     * N1*MF loop (manufacturer) with optional N3/N4 address segments
     */
    private function buildN1ManufacturerLoop(Edi855PurchaseOrderAckDto $dto): array
    {
        $segs = ["N1{$this->fieldSeparator}BY{$this->fieldSeparator}{$dto->manufacturerId}"];
        $this->appendAddressSegments($segs, $dto->manufacturerAddress);
        return $segs;
    }

    /**
     * N1*SE loop (selling party/us) with optional N3/N4 address segments
     */
    private function buildN1SellerLoop(Edi855PurchaseOrderAckDto $dto): array
    {
        $senderId = Config::get('edi-partners.manufacturer.x12.sender_id', Config::get('edi-partners.global.sender_id', 'PHILHARVEST'));
        $segs = ["N1{$this->fieldSeparator}SE{$this->fieldSeparator}{$senderId}"];
        $this->appendAddressSegments($segs, $dto->sellerAddress);
        return $segs;
    }

    private function appendAddressSegments(array &$segs, ?array $address): void
    {
        if (empty($address)) {
            return;
        }
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
    }

    /**
     * PO1 + ACK pair (+ optional DTM) for one line acknowledgment
     */
    private function buildLineAcknowledgmentSegments(Edi855LineAckDto $lineAck): array
    {
        $segments = [];
        $segments[] = $this->buildPO1($lineAck);
        $segments[] = $this->buildACK($lineAck);

        if (!empty($lineAck->estimatedDeliveryDate)) {
            $segments[] = "DTM{$this->fieldSeparator}017{$this->fieldSeparator}{$this->formatDateForX12($lineAck->estimatedDeliveryDate)}";
        }

        return $segments;
    }

    /**
     * PO1*lineNum*qty*uom*price**VN*partNumber
     * Price and part are included when present.
     */
    private function buildPO1(Edi855LineAckDto $lineAck): string
    {
        $fs  = $this->fieldSeparator;
        $qty = $lineAck->acceptedQuantity;
        $uom = strtoupper($lineAck->quantityUom);

        if (!empty($lineAck->partNumber)) {
            $price = number_format((float)($lineAck->unitPrice ?? 0), 2, '.', '');
            return "PO1{$fs}{$lineAck->lineNumber}{$fs}{$qty}{$fs}{$uom}{$fs}{$price}{$fs}{$fs}VN{$fs}{$lineAck->partNumber}";
        }

        if ($lineAck->unitPrice !== null && $lineAck->unitPrice > 0) {
            $price = number_format((float)$lineAck->unitPrice, 2, '.', '');
            return "PO1{$fs}{$lineAck->lineNumber}{$fs}{$qty}{$fs}{$uom}{$fs}{$price}";
        }

        return "PO1{$fs}{$lineAck->lineNumber}{$fs}{$qty}{$fs}{$uom}";
    }

    private function buildACK(Edi855LineAckDto $lineAck): string
    {
        $fs  = $this->fieldSeparator;
        $uom = strtoupper($lineAck->quantityUom);
        $date = !empty($lineAck->estimatedDeliveryDate)
            ? "{$fs}017{$fs}" . $this->formatDateForX12($lineAck->estimatedDeliveryDate)
            : '';
        return "ACK{$fs}{$lineAck->acknowledgmentCode}{$fs}{$lineAck->acceptedQuantity}{$fs}{$uom}{$date}";
    }

    private function buildCTT(Edi855PurchaseOrderAckDto $dto): string
    {
        return "CTT{$this->fieldSeparator}" . \count($dto->lineAcknowledgments);
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
