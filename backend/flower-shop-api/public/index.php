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
require_once __DIR__ . "/../src/utils/jwt.php";

$JWT_SECRET = "change_this_to_any_random_string";

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
function read_json_body()
{
    $raw = file_get_contents("php://input");
    if (!$raw) return [];
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function get_bearer_token()
{

    $hdr = $_SERVER["HTTP_AUTHORIZATION"]
        ?? $_SERVER["REDIRECT_HTTP_AUTHORIZATION"]
        ?? "";


    if ($hdr === "" && function_exists("getallheaders")) {
        $headers = getallheaders();
        if (isset($headers["Authorization"])) $hdr = $headers["Authorization"];
        if (isset($headers["authorization"])) $hdr = $headers["authorization"];
    }

    if (preg_match("/^Bearer\s+(.+)$/i", $hdr, $m)) return trim($m[1]);
    return null;
}

function require_auth($JWT_SECRET)
{
    $token = get_bearer_token();
    if (!$token) fail("Missing token", 401);
    [$ok, $payload] = jwt_verify($token, $JWT_SECRET);
    if (!$ok) fail("Invalid/expired token", 401);
    return $payload;
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
    if ($method === "POST" && $path === "/api/auth/register") {
        $body = read_json_body();

        $role = $body["role"] ?? "buyer";
        if (!in_array($role, ["buyer", "seller"], true)) fail("Role invalid");

        $fullName = trim($body["full_name"] ?? "");
        $email = trim($body["email"] ?? "");
        $phone = trim($body["phone"] ?? "");
        $password = $body["password"] ?? "";

        $shopName = trim($body["shop_name"] ?? "");
        $shopAddress = trim($body["shop_address"] ?? "");

        if ($fullName === "" || $email === "" || $password === "") fail("Thiếu thông tin bắt buộc");
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) fail("Email không hợp lệ");
        if (strlen($password) < 6) fail("Mật khẩu tối thiểu 6 ký tự");

        if ($role === "seller" && $shopName === "") fail("Người bán cần shop_name");

        // check email tồn tại
        $stmt = db()->prepare("SELECT id FROM users WHERE email = :email LIMIT 1");
        $stmt->execute([":email" => $email]);
        if ($stmt->fetch()) fail("Email đã tồn tại");

        $hash = password_hash($password, PASSWORD_BCRYPT);

        $stmt = db()->prepare("INSERT INTO users (role, full_name, email, phone, password_hash, shop_name, shop_address)
                         VALUES (:role,:full_name,:email,:phone,:password_hash,:shop_name,:shop_address)");
        $stmt->execute([
            ":role" => $role,
            ":full_name" => $fullName,
            ":email" => $email,
            ":phone" => $phone,
            ":password_hash" => $hash,
            ":shop_name" => $role === "seller" ? $shopName : null,
            ":shop_address" => $role === "seller" ? $shopAddress : null,
        ]);

        ok(["message" => "Đăng ký thành công"]);
    }
    if ($method === "POST" && $path === "/api/auth/login") {
        global $JWT_SECRET;

        $body = read_json_body();
        $email = trim($body["email"] ?? "");
        $password = $body["password"] ?? "";

        if ($email === "" || $password === "") fail("Thiếu email hoặc mật khẩu");

        $stmt = db()->prepare("SELECT id, role, full_name, email, password_hash, is_active
                         FROM users WHERE email = :email LIMIT 1");
        $stmt->execute([":email" => $email]);
        $u = $stmt->fetch();

        if (!$u) fail("Sai email hoặc mật khẩu", 401);
        if (intval($u["is_active"]) !== 1) fail("Tài khoản bị khóa", 403);
        if (!password_verify($password, $u["password_hash"])) fail("Sai email hoặc mật khẩu", 401);

        $token = jwt_sign(["uid" => intval($u["id"]), "role" => $u["role"]], $JWT_SECRET, 7 * 24 * 3600);

        ok([
            "token" => $token,
            "user" => [
                "id" => intval($u["id"]),
                "role" => $u["role"],
                "full_name" => $u["full_name"],
                "email" => $u["email"],
            ]
        ]);
    }
    if ($method === "GET" && $path === "/api/auth/me") {
        global $JWT_SECRET;

        $payload = require_auth($JWT_SECRET);
        $uid = intval($payload["uid"]);

        $stmt = db()->prepare("SELECT id, role, full_name, email, phone, shop_name, shop_address
                         FROM users WHERE id = :id LIMIT 1");
        $stmt->execute([":id" => $uid]);
        $u = $stmt->fetch();
        if (!$u) fail("User not found", 404);

        ok($u);
    }

    fail("Not found: " . $path, 404);
} catch (Throwable $e) {
    fail("Server error: " . $e->getMessage(), 500);
}
