<?php

namespace App\Services\Edi\Contracts;

interface EdiParserInterface
{
    public function parse(string $payload): array;
}