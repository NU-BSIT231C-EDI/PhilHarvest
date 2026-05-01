<?php

namespace App\Services\Edi\Contracts;

interface EdiValidatorInterface
{
    public function validate(array $data): bool;
    public function getErrors(): array;
}