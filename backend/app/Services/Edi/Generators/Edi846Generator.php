<?php

namespace App\Services\Edi\Generators;

use Illuminate\Support\Facades\Config;

/**
 * X12 846 (Inventory Inquiry / Advice) Generator
 *
 * Structure: ISA/GS > ST > BIA > REF > N1*WH > LIN/QTY/UIT loops > CTT > SE > GE > IEA
 *
 * Sent to SERMACROPS whenever PhilHarvest stock is updated.
 */
class Edi846Generator
{
    private string $segmentTerminator = '~';
    private string $fieldSeparator = '*';
    private string $controlNumber = '001';

    public function __construct()
    {
        $this->controlNumber = $this->generateControlNumber();
    }

    /**
     * Generate an X12 846 string.
     *
     * @param array $data {
     *   reference_number?: string,
     *   warehouse_name?:   string,
     *   vendor_id?:        string,
     *   items: [{ sku, upc?, quantity, uom? }]
     * }
     */
    public function generate(array $data): string
    {
        $this->controlNumber = $this->generateControlNumber();
        $fs = $this->fieldSeparator;

        $referenceNumber = $data['reference_number'] ?? ('INVEN-' . date('Y-m-d'));
        $warehouseName   = $data['warehouse_name']   ?? 'PHILHARVEST WAREHOUSE';
        $vendorId        = $data['vendor_id']        ?? Config::get('edi-partners.global.sender_id', 'PHILHARVEST');
        $items           = $data['items']            ?? [];

        $segments = [];
        $segments[] = $this->buildISA();
        $segments[] = $this->buildGS();
        $segments[] = "ST{$fs}846{$fs}0001";
        $segments[] = "BIA{$fs}00{$fs}MB{$fs}{$referenceNumber}{$fs}" . date('Ymd');
        $segments[] = "REF{$fs}IA{$fs}{$vendorId}";
        $segments[] = "N1{$fs}WH{$fs}{$warehouseName}";

        $lineCount = 0;
        foreach ($items as $item) {
            $lineCount++;
            $lineNum = str_pad((string) $lineCount, 5, '0', STR_PAD_LEFT);
            $upc     = trim($item['upc'] ?? '');
            $sku     = trim($item['sku'] ?? '');
            $qty     = (int) ($item['quantity'] ?? 0);
            $uom     = strtoupper(trim($item['uom'] ?? 'EA'));

            // LIN segment — include UPC only when present
            $lin = "LIN{$fs}{$lineNum}";
            if ($upc !== '') {
                $lin .= "{$fs}UP{$fs}{$upc}";
            }
            $lin .= "{$fs}VN{$fs}{$sku}";
            $segments[] = $lin;

            // QTY*33 = Quantity On Hand / Available
            $segments[] = "QTY{$fs}33{$fs}{$qty}{$fs}{$uom}";
            $segments[] = "UIT{$fs}{$uom}";
        }

        $segments[] = "CTT{$fs}{$lineCount}";

        // SE count = segments from ST to SE inclusive = count(segments) - 2 (ISA+GS) + 1 (SE itself)
        $seCount = count($segments) - 1;
        $segments[] = "SE{$fs}{$seCount}{$fs}0001";
        $segments[] = "GE{$fs}1{$fs}1";
        $segments[] = "IEA{$fs}1{$fs}{$this->controlNumber}";

        return implode($this->segmentTerminator . "\n", $segments) . $this->segmentTerminator . "\n";
    }

    private function buildISA(): string
    {
        $partnerConfig = Config::get('edi-partners.manufacturer', []);
        $x12Config     = $partnerConfig['x12'] ?? [];

        $senderQual   = $x12Config['sender_qualifier']   ?? Config::get('edi-partners.global.sender_qualifier', 'ZZ');
        $senderId     = str_pad($x12Config['sender_id']   ?? Config::get('edi-partners.global.sender_id', 'PHILHARVEST'), 15, ' ');
        $receiverQual = $x12Config['receiver_qualifier'] ?? 'ZZ';
        $receiverId   = str_pad($x12Config['receiver_id'] ?? ($partnerConfig['code'] ?? 'SERMACROPS'), 15, ' ');
        $date    = date('ymd');
        $time    = date('Hi');
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
        $x12Config     = $partnerConfig['x12'] ?? [];
        $senderId      = $x12Config['sender_id']   ?? Config::get('edi-partners.global.sender_id', 'PHILHARVEST');
        $receiverId    = $x12Config['receiver_id'] ?? ($partnerConfig['code'] ?? 'SERMACROPS');
        $fs = $this->fieldSeparator;
        // GS02 = IB for Inventory Inquiry/Advice
        return "GS{$fs}IB{$fs}{$senderId}{$fs}{$receiverId}{$fs}" . date('Ymd') . "{$fs}" . date('His') . "{$fs}1{$fs}X{$fs}005010";
    }

    private function generateControlNumber(): string
    {
        $padding   = Config::get('edi-partners.global.control_number_padding', 9);
        $timestamp = (int) (microtime(true) * 1000) % (10 ** $padding);
        return str_pad((string) $timestamp, $padding, '0', STR_PAD_LEFT);
    }

    private function formatIsaVersion(string $version): string
    {
        $normalized = preg_replace('/\D/', '', $version);
        return substr(str_pad($normalized ?: '005010', 5, '0', STR_PAD_LEFT), 0, 5);
    }
}
