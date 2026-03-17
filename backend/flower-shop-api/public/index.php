<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

require_once __DIR__ . "/../src/config/db.php";

$method  = $_SERVER["REQUEST_METHOD"];
$uriPath = parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH);

// 1) Bỏ phần base folder chứa index.php (VD: /flower-shop-api/public)
$scriptDir = str_replace("\\", "/", dirname($_SERVER["SCRIPT_NAME"])); // /flower-shop-api/public
$scriptDir = rtrim($scriptDir, "/");

$path = $uriPath;
if ($scriptDir !== "" && strpos($uriPath, $scriptDir) === 0) {
    $path = substr($uriPath, strlen($scriptDir));
}

// 2) Normalize: bỏ "/index.php" nếu nó xuất hiện ở đầu path
// (vì bạn đang gọi dạng /public/index.php/api/...)
$path = preg_replace('#^/index\.php#', '', $path);

// 3) Normalize: đảm bảo luôn bắt đầu bằng "/"
if ($path === "" || $path === false) $path = "/";
if ($path[0] !== "/") $path = "/" . $path;

function ok($data)
{
    echo json_encode(["success" => true, "data" => $data], JSON_UNESCAPED_UNICODE);
    exit;
}
function fail($message, $code = 400)
{
    http_response_code($code);
    echo json_encode(["success" => false, "message" => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    // GET /
    if ($method === "GET" && $path === "/") {
        ok([
            "ok" => true,
            "message" => "API root working",
            "try" => [
                "/flower-shop-api/public/index.php/api/debug",
                "/flower-shop-api/public/index.php/api/health",
                "/flower-shop-api/public/index.php/api/categories",
                "/flower-shop-api/public/index.php/api/products"
            ]
        ]);
    }

    // GET /api/categories
    if ($method === "GET" && $path === "/api/categories") {
        $stmt = db()->query("SELECT id, name, slug FROM categories ORDER BY id DESC");
        ok($stmt->fetchAll());
    }

    // GET /api/products?search=&category_id=
    if ($method === "GET" && $path === "/api/products") {
        $search = trim($_GET["search"] ?? "");
        $categoryId = intval($_GET["category_id"] ?? 0);

        $sql = "SELECT id, name, slug, price, stock, image_url, description, category_id
            FROM products
            WHERE status = 1";
        $params = [];

        if ($categoryId > 0) {
            $sql .= " AND category_id = :category_id";
            $params[":category_id"] = $categoryId;
        }
        if ($search !== "") {
            $sql .= " AND name LIKE :search";
            $params[":search"] = "%" . $search . "%";
        }

        $sql .= " ORDER BY id DESC LIMIT 50";
        $stmt = db()->prepare($sql);
        $stmt->execute($params);
        ok($stmt->fetchAll());
    }
    // GET /api/products/{id}
    if ($method === "GET" && preg_match("#^/api/products/(\\d+)$#", $path, $m)) {
        $id = intval($m[1]);
        $stmt = db()->prepare("SELECT id, name, slug, price, stock, image_url, description, category_id
                         FROM products WHERE id = :id AND status = 1 LIMIT 1");
        $stmt->execute([":id" => $id]);
        $row = $stmt->fetch();
        if (!$row) fail("Product not found", 404);
        ok($row);
    }

    fail("Not found: " . $path, 404);
} catch (Throwable $e) {
    fail("Server error: " . $e->getMessage(), 500);
}
