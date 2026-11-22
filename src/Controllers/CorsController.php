<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Common\ResponseHelper;
use Psr\Http\Message\ResponseInterface;

class CorsController
{
    public function handle(): ResponseInterface
    {
        return ResponseHelper::options();
    }
}
