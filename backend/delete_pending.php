<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

$deleted = \DB::table('edi_transactions')->where('status', 'PENDING')->delete();
echo "Deleted $deleted pending transactions\n";
