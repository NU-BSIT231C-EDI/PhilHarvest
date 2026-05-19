<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$trans = \App\Models\EdiTransaction::where('control_number', '5588990011')->first();
if ($trans) {
  echo "Transaction Found!\n";
  echo "ID: " . $trans->id . "\n";
  echo "Control Number: " . $trans->control_number . "\n";
  echo "PO Number: " . $trans->po_number . "\n";
  echo "Status: " . $trans->status . "\n";
  echo "Created: " . $trans->created_at . "\n";
  echo "Parsed Data: " . json_encode($trans->parsed_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . "\n";
} else {
  echo "Transaction not found with control number 5588990011\n";
  echo "\nLatest transactions:\n";
  $latest = \App\Models\EdiTransaction::latest()->limit(5)->get();
  foreach ($latest as $t) {
    echo "  - ID: {$t->id}, Control: {$t->control_number}, Status: {$t->status}\n";
  }
}
