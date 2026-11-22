<?php

declare(strict_types=1);

namespace App\Common;

use HttpSoft\Message\Response;
use Psr\Http\Message\ResponseInterface;

class ResponseHelper
{
    private static function corsHeaders(): array
    {
        return [
          'Content-Type' => 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin' => '*',
          'Access-Control-Allow-Methods' => 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers' => 'Content-Type, Authorization, X-Requested-With, X-Idempotency-Key, X-Internal-Secret',
        ];
    }

    public static function json(
        array $payload,
        int $statusCode = 200,
        array $headers = []
    ): ResponseInterface {
        $mergedHeaders = array_merge(self::corsHeaders(), $headers);
        $response = new Response($statusCode, $mergedHeaders);
        $response->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
        return $response;
    }

    public static function success(
        mixed $data = null,
        string $message = 'Operation successful',
        int $statusCode = 200,
        array $meta = []
    ): ResponseInterface {
        $defaultMeta = [
            'timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
            'version' => '1.0.0',
        ];

        return self::json([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'meta' => array_merge($defaultMeta, $meta),
        ], $statusCode);
    }

    public static function error(
        string $message,
        int $statusCode = 400,
        array $errors = [],
        string $code = 'ERROR'
    ): ResponseInterface {
        return self::json([
            'success' => false,
            'message' => $message,
            'code' => $code,
            'errors' => empty($errors) ? (object)[] : $errors,
        ], $statusCode);
    }

    public static function options(): ResponseInterface
    {
        return new Response(204, self::corsHeaders());
    }
}
