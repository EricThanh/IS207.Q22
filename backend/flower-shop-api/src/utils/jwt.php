<?php
function base64url_encode($data)
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}
function base64url_decode($data)
{
    $remainder = strlen($data) % 4;
    if ($remainder) $data .= str_repeat('=', 4 - $remainder);
    return base64_decode(strtr($data, '-_', '+/'));
}

function jwt_sign(array $payload, string $secret, int $ttlSeconds = 86400): string
{
    $header = ["alg" => "HS256", "typ" => "JWT"];
    $payload["iat"] = time();
    $payload["exp"] = time() + $ttlSeconds;

    $h = base64url_encode(json_encode($header));
    $p = base64url_encode(json_encode($payload));
    $sig = hash_hmac("sha256", "$h.$p", $secret, true);
    $s = base64url_encode($sig);

    return "$h.$p.$s";
}

function jwt_verify(string $token, string $secret): array
{
    $parts = explode(".", $token);
    if (count($parts) !== 3) return [false, null];

    [$h, $p, $s] = $parts;
    $expected = base64url_encode(hash_hmac("sha256", "$h.$p", $secret, true));
    if (!hash_equals($expected, $s)) return [false, null];

    $payload = json_decode(base64url_decode($p), true);
    if (!is_array($payload)) return [false, null];
    if (isset($payload["exp"]) && time() > intval($payload["exp"])) return [false, null];

    return [true, $payload];
}
