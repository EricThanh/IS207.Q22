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

$method = $_SERVER["REQUEST_METHOD"];
$uriPath = parse_url($_SERVER["REQUEST_URI"], PHP_URL_PATH);

$scriptDir = str_replace("\\", "/", dirname($_SERVER["SCRIPT_NAME"]));
$scriptDir = rtrim($scriptDir, "/");

$path = $uriPath;
if ($scriptDir !== "" && strpos($uriPath, $scriptDir) === 0) {
    $path = substr($uriPath, strlen($scriptDir));
}

$path = preg_replace('#^/index\.php#', '', $path);
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
    [$verified, $payload] = jwt_verify($token, $JWT_SECRET);
    if (!$verified) fail("Invalid/expired token", 401);
    return $payload;
}

function require_seller($JWT_SECRET)
{
    $payload = require_auth($JWT_SECRET);
    if (($payload["role"] ?? "") !== "seller") fail("Forbidden: seller only", 403);
    return $payload;
}

function require_buyer($JWT_SECRET)
{
    $payload = require_auth($JWT_SECRET);
    if (($payload["role"] ?? "") !== "buyer") fail("Forbidden: buyer only", 403);
    return $payload;
}

try {
    if ($method === "GET" && $path === "/") {
        ok([
            "ok" => true,
            "message" => "API root working",
            "try" => [
                "/flower-shop-api/public/index.php/api/categories",
                "/flower-shop-api/public/index.php/api/products",
            ],
        ]);
    }

    if ($method === "GET" && $path === "/api/categories") {
        $stmt = db()->query("SELECT id, name, slug FROM categories ORDER BY id DESC");
        ok($stmt->fetchAll());
    }

    if ($method === "GET" && $path === "/api/products") {
        $search = trim($_GET["search"] ?? "");
        $categoryId = intval($_GET["category_id"] ?? 0);

        $sql = "SELECT
                id,
                seller_id,
                name,
                slug,
                price AS original_price,
                GREATEST(price - FLOOR(price * COALESCE(discount_percent, 0) / 100), 0) AS price,
                COALESCE(discount_percent, 0) AS discount_percent,
                stock,
                image_url,
                description,
                category_id
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

    if ($method === "GET" && preg_match("#^/api/products/(\\d+)$#", $path, $m)) {
        $id = intval($m[1]);
        $stmt = db()->prepare("SELECT
            id,
            seller_id,
            name,
            slug,
            price AS original_price,
            GREATEST(price - FLOOR(price * COALESCE(discount_percent, 0) / 100), 0) AS price,
            COALESCE(discount_percent, 0) AS discount_percent,
            stock,
            image_url,
            description,
            category_id
            FROM products
            WHERE id = :id AND status = 1
            LIMIT 1");
        $stmt->execute([":id" => $id]);
        $row = $stmt->fetch();
        if (!$row) fail("Product not found", 404);
        ok($row);
    }

    if ($method === "POST" && $path === "/api/orders") {
        $payload = require_buyer($JWT_SECRET);
        $buyerId = intval($payload["uid"]);
        $body = read_json_body();

        $receiverName = trim($body["receiver_name"] ?? "");
        $receiverPhone = trim($body["receiver_phone"] ?? "");
        $receiverAddress = trim($body["receiver_address"] ?? "");
        $note = trim($body["note"] ?? "");
        $items = $body["items"] ?? [];

        if ($receiverName === "" || $receiverPhone === "" || $receiverAddress === "") {
            fail("Thiếu thông tin người nhận");
        }
        if (!is_array($items) || count($items) === 0) {
            fail("Giỏ hàng trống");
        }

        $normalizedItems = [];
        foreach ($items as $item) {
            $productId = intval($item["product_id"] ?? 0);
            $quantity = intval($item["quantity"] ?? 0);
            $sellerId = intval($item["seller_id"] ?? 0);

            if ($productId <= 0 || $quantity <= 0 || $sellerId <= 0) {
                fail("Dữ liệu sản phẩm không hợp lệ");
            }

            if (!isset($normalizedItems[$productId])) {
                $normalizedItems[$productId] = [
                    "product_id" => $productId,
                    "seller_id" => $sellerId,
                    "quantity" => $quantity,
                ];
            } else {
                $normalizedItems[$productId]["quantity"] += $quantity;
            }
        }

        $pdo = db();
        $pdo->beginTransaction();

        try {
            $totalAmount = 0;
            $orderLineItems = [];

            $productStmt = $pdo->prepare("
                SELECT id, seller_id, name, price, COALESCE(discount_percent, 0) AS discount_percent, stock, status
                FROM products
                WHERE id = :id
                LIMIT 1
            ");
            $stockStmt = $pdo->prepare("
                UPDATE products
                SET stock = stock - :quantity
                WHERE id = :id AND stock >= :quantity
            ");

            foreach ($normalizedItems as $item) {
                $productStmt->execute([":id" => $item["product_id"]]);
                $product = $productStmt->fetch();

                if (!$product || intval($product["status"]) !== 1) {
                    throw new Exception("Sản phẩm không tồn tại hoặc đã ngừng bán");
                }
                if (intval($product["seller_id"]) !== intval($item["seller_id"])) {
                    throw new Exception("Thông tin người bán của sản phẩm không khớp");
                }
                if (intval($product["stock"]) < intval($item["quantity"])) {
                    throw new Exception("Sản phẩm \"" . $product["name"] . "\" không đủ tồn kho");
                }

                $originalPrice = intval($product["price"]);
                $discountPercent = intval($product["discount_percent"]);
                $price = max(0, $originalPrice - intval(floor($originalPrice * $discountPercent / 100)));
                $quantity = intval($item["quantity"]);
                $subtotal = $price * $quantity;
                $totalAmount += $subtotal;

                $orderLineItems[] = [
                    "product_id" => intval($product["id"]),
                    "seller_id" => intval($product["seller_id"]),
                    "quantity" => $quantity,
                    "price" => $price,
                    "subtotal" => $subtotal,
                ];
            }

            $orderStmt = $pdo->prepare("
                INSERT INTO orders (
                    buyer_id,
                    total_amount,
                    status,
                    receiver_name,
                    receiver_phone,
                    receiver_address,
                    note
                ) VALUES (
                    :buyer_id,
                    :total_amount,
                    'pending',
                    :receiver_name,
                    :receiver_phone,
                    :receiver_address,
                    :note
                )
            ");
            $orderStmt->execute([
                ":buyer_id" => $buyerId,
                ":total_amount" => $totalAmount,
                ":receiver_name" => $receiverName,
                ":receiver_phone" => $receiverPhone,
                ":receiver_address" => $receiverAddress,
                ":note" => $note !== "" ? $note : null,
            ]);

            $orderId = intval($pdo->lastInsertId());
            $orderItemStmt = $pdo->prepare("
                INSERT INTO order_items (
                    order_id,
                    product_id,
                    seller_id,
                    quantity,
                    price,
                    subtotal
                ) VALUES (
                    :order_id,
                    :product_id,
                    :seller_id,
                    :quantity,
                    :price,
                    :subtotal
                )
            ");

            foreach ($orderLineItems as $line) {
                $orderItemStmt->execute([
                    ":order_id" => $orderId,
                    ":product_id" => $line["product_id"],
                    ":seller_id" => $line["seller_id"],
                    ":quantity" => $line["quantity"],
                    ":price" => $line["price"],
                    ":subtotal" => $line["subtotal"],
                ]);

                $stockStmt->execute([
                    ":id" => $line["product_id"],
                    ":quantity" => $line["quantity"],
                ]);
                if ($stockStmt->rowCount() === 0) {
                    throw new Exception("Không thể cập nhật tồn kho, vui lòng thử lại");
                }
            }

            $pdo->commit();

            ok([
                "message" => "Tạo đơn hàng thành công",
                "order_id" => $orderId,
                "total_amount" => $totalAmount,
                "status" => "pending",
            ]);
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            fail($e->getMessage(), 400);
        }
    }

    if ($method === "GET" && $path === "/api/orders/my") {
        $payload = require_buyer($JWT_SECRET);
        $buyerId = intval($payload["uid"]);

        $stmt = db()->prepare("
            SELECT id, buyer_id, total_amount, status, receiver_name, receiver_phone, receiver_address, note, created_at
            FROM orders
            WHERE buyer_id = :buyer_id
            ORDER BY id DESC
        ");
        $stmt->execute([":buyer_id" => $buyerId]);
        $orders = $stmt->fetchAll();

        if (!$orders) {
            ok([]);
        }

        $orderIds = array_map(function ($order) {
            return intval($order["id"]);
        }, $orders);

        $placeholders = implode(",", array_fill(0, count($orderIds), "?"));
        $itemsStmt = db()->prepare("
            SELECT
                oi.order_id,
                oi.product_id,
                oi.seller_id,
                oi.quantity,
                oi.price,
                oi.subtotal,
                p.name AS product_name,
                p.image_url AS product_image_url
            FROM order_items oi
            INNER JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id IN ($placeholders)
            ORDER BY oi.id ASC
        ");
        $itemsStmt->execute($orderIds);
        $items = $itemsStmt->fetchAll();

        $itemsByOrder = [];
        foreach ($items as $item) {
            $orderId = intval($item["order_id"]);
            if (!isset($itemsByOrder[$orderId])) {
                $itemsByOrder[$orderId] = [];
            }
            $itemsByOrder[$orderId][] = [
                "product_id" => intval($item["product_id"]),
                "seller_id" => intval($item["seller_id"]),
                "product_name" => $item["product_name"],
                "product_image_url" => $item["product_image_url"],
                "quantity" => intval($item["quantity"]),
                "price" => intval($item["price"]),
                "subtotal" => intval($item["subtotal"]),
            ];
        }

        $result = array_map(function ($order) use ($itemsByOrder) {
            $orderId = intval($order["id"]);
            return [
                "id" => $orderId,
                "buyer_id" => intval($order["buyer_id"]),
                "total_amount" => intval($order["total_amount"]),
                "status" => $order["status"],
                "receiver_name" => $order["receiver_name"],
                "receiver_phone" => $order["receiver_phone"],
                "receiver_address" => $order["receiver_address"],
                "note" => $order["note"],
                "created_at" => $order["created_at"],
                "items" => $itemsByOrder[$orderId] ?? [],
            ];
        }, $orders);

        ok($result);
    }

    if ($method === "GET" && $path === "/api/seller/orders") {
        $payload = require_seller($JWT_SECRET);
        $sellerId = intval($payload["uid"]);

        $stmt = db()->prepare("
            SELECT
                o.id,
                o.buyer_id,
                o.total_amount,
                o.status,
                o.receiver_name,
                o.receiver_phone,
                o.receiver_address,
                o.note,
                o.created_at
            FROM orders o
            INNER JOIN order_items oi ON oi.order_id = o.id
            WHERE oi.seller_id = :seller_id
            GROUP BY o.id, o.buyer_id, o.total_amount, o.status, o.receiver_name, o.receiver_phone, o.receiver_address, o.note, o.created_at
            ORDER BY o.id DESC
        ");
        $stmt->execute([":seller_id" => $sellerId]);
        $orders = $stmt->fetchAll();

        if (!$orders) {
            ok([]);
        }

        $orderIds = array_map(function ($order) {
            return intval($order["id"]);
        }, $orders);

        $placeholders = implode(",", array_fill(0, count($orderIds), "?"));
        $params = array_merge([$sellerId], $orderIds);

        $itemsStmt = db()->prepare("
            SELECT
                oi.order_id,
                oi.product_id,
                oi.quantity,
                oi.price,
                oi.subtotal,
                p.name AS product_name,
                p.image_url AS product_image_url
            FROM order_items oi
            INNER JOIN products p ON p.id = oi.product_id
            WHERE oi.seller_id = ?
              AND oi.order_id IN ($placeholders)
            ORDER BY oi.id ASC
        ");
        $itemsStmt->execute($params);
        $items = $itemsStmt->fetchAll();

        $itemsByOrder = [];
        foreach ($items as $item) {
            $orderId = intval($item["order_id"]);
            if (!isset($itemsByOrder[$orderId])) {
                $itemsByOrder[$orderId] = [];
            }
            $itemsByOrder[$orderId][] = [
                "product_id" => intval($item["product_id"]),
                "product_name" => $item["product_name"],
                "product_image_url" => $item["product_image_url"],
                "quantity" => intval($item["quantity"]),
                "price" => intval($item["price"]),
                "subtotal" => intval($item["subtotal"]),
            ];
        }

        $result = array_map(function ($order) use ($itemsByOrder) {
            $orderId = intval($order["id"]);
            return [
                "id" => $orderId,
                "buyer_id" => intval($order["buyer_id"]),
                "total_amount" => intval($order["total_amount"]),
                "status" => $order["status"],
                "receiver_name" => $order["receiver_name"],
                "receiver_phone" => $order["receiver_phone"],
                "receiver_address" => $order["receiver_address"],
                "note" => $order["note"],
                "created_at" => $order["created_at"],
                "items" => $itemsByOrder[$orderId] ?? [],
            ];
        }, $orders);

        ok($result);
    }

    if ($method === "PUT" && preg_match("#^/api/seller/orders/(\\d+)/confirm$#", $path, $m)) {
        $payload = require_seller($JWT_SECRET);
        $sellerId = intval($payload["uid"]);
        $orderId = intval($m[1]);

        $checkStmt = db()->prepare("
            SELECT o.id, o.status
            FROM orders o
            INNER JOIN order_items oi ON oi.order_id = o.id
            WHERE o.id = :order_id
              AND oi.seller_id = :seller_id
            LIMIT 1
        ");
        $checkStmt->execute([
            ":order_id" => $orderId,
            ":seller_id" => $sellerId,
        ]);
        $order = $checkStmt->fetch();

        if (!$order) fail("Đơn hàng không tồn tại hoặc bạn không có quyền xác nhận", 404);
        if (($order["status"] ?? "") !== "pending") fail("Chỉ có thể xác nhận đơn đang chờ xác nhận", 400);

        $updateStmt = db()->prepare("
            UPDATE orders
            SET status = 'confirmed'
            WHERE id = :order_id AND status = 'pending'
        ");
        $updateStmt->execute([":order_id" => $orderId]);

        if ($updateStmt->rowCount() === 0) {
            fail("Không thể xác nhận đơn hàng, vui lòng thử lại", 400);
        }

        ok([
            "message" => "Xác nhận đơn hàng thành công",
            "order_id" => $orderId,
            "status" => "confirmed",
        ]);
    }

    if ($method === "GET" && $path === "/api/seller/stats") {
        $payload = require_seller($JWT_SECRET);
        $sellerId = intval($payload["uid"]);
        $days = intval($_GET["days"] ?? 7);
        if (!in_array($days, [7, 30, 90], true)) {
            $days = 7;
        }

        $endDate = new DateTimeImmutable("today");
        $startDate = $endDate->sub(new DateInterval("P" . ($days - 1) . "D"));
        $startDateTime = $startDate->format("Y-m-d 00:00:00");
        $endDateTime = $endDate->modify("+1 day")->format("Y-m-d 00:00:00");

        $summaryStmt = db()->prepare("
            SELECT
                COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN oi.subtotal ELSE 0 END), 0) AS total_revenue,
                COUNT(DISTINCT CASE WHEN o.status <> 'cancelled' THEN o.id END) AS total_orders,
                COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN oi.quantity ELSE 0 END), 0) AS total_items,
                COUNT(DISTINCT CASE WHEN o.status = 'completed' THEN o.id END) AS completed_orders
            FROM order_items oi
            INNER JOIN orders o ON o.id = oi.order_id
            WHERE oi.seller_id = :seller_id
        ");
        $summaryStmt->execute([":seller_id" => $sellerId]);
        $summary = $summaryStmt->fetch() ?: [];

        $dailyStmt = db()->prepare("
            SELECT
                DATE(o.created_at) AS sale_date,
                COALESCE(SUM(oi.subtotal), 0) AS revenue,
                COALESCE(SUM(oi.quantity), 0) AS items_sold,
                COUNT(DISTINCT o.id) AS orders_count
            FROM order_items oi
            INNER JOIN orders o ON o.id = oi.order_id
            WHERE oi.seller_id = :seller_id
              AND o.status <> 'cancelled'
              AND o.created_at >= :start_date
              AND o.created_at < :end_date
            GROUP BY DATE(o.created_at)
            ORDER BY sale_date ASC
        ");
        $dailyStmt->execute([
            ":seller_id" => $sellerId,
            ":start_date" => $startDateTime,
            ":end_date" => $endDateTime,
        ]);
        $dailyRows = $dailyStmt->fetchAll();

        $dailyMap = [];
        foreach ($dailyRows as $row) {
            $dailyMap[$row["sale_date"]] = [
                "date" => $row["sale_date"],
                "revenue" => intval($row["revenue"] ?? 0),
                "items_sold" => intval($row["items_sold"] ?? 0),
                "orders_count" => intval($row["orders_count"] ?? 0),
            ];
        }

        $dailySales = [];
        $cursor = $startDate;
        while ($cursor <= $endDate) {
            $key = $cursor->format("Y-m-d");
            $dailySales[] = $dailyMap[$key] ?? [
                "date" => $key,
                "revenue" => 0,
                "items_sold" => 0,
                "orders_count" => 0,
            ];
            $cursor = $cursor->modify("+1 day");
        }

        $statusStmt = db()->prepare("
            SELECT
                o.status,
                COUNT(DISTINCT o.id) AS orders_count,
                COALESCE(SUM(oi.subtotal), 0) AS revenue
            FROM order_items oi
            INNER JOIN orders o ON o.id = oi.order_id
            WHERE oi.seller_id = :seller_id
            GROUP BY o.status
            ORDER BY orders_count DESC, revenue DESC
        ");
        $statusStmt->execute([":seller_id" => $sellerId]);
        $statusBreakdown = array_map(function ($row) {
            return [
                "status" => $row["status"],
                "orders_count" => intval($row["orders_count"] ?? 0),
                "revenue" => intval($row["revenue"] ?? 0),
            ];
        }, $statusStmt->fetchAll());

        $topProductsStmt = db()->prepare("
            SELECT
                p.id,
                p.name,
                COALESCE(SUM(oi.quantity), 0) AS items_sold,
                COALESCE(SUM(oi.subtotal), 0) AS revenue
            FROM order_items oi
            INNER JOIN orders o ON o.id = oi.order_id
            INNER JOIN products p ON p.id = oi.product_id
            WHERE oi.seller_id = :seller_id
              AND o.status <> 'cancelled'
            GROUP BY p.id, p.name
            ORDER BY revenue DESC, items_sold DESC
            LIMIT 5
        ");
        $topProductsStmt->execute([":seller_id" => $sellerId]);
        $topProducts = array_map(function ($row) {
            return [
                "product_id" => intval($row["id"]),
                "name" => $row["name"],
                "items_sold" => intval($row["items_sold"] ?? 0),
                "revenue" => intval($row["revenue"] ?? 0),
            ];
        }, $topProductsStmt->fetchAll());

        ok([
            "range_days" => $days,
            "summary" => [
                "total_revenue" => intval($summary["total_revenue"] ?? 0),
                "total_orders" => intval($summary["total_orders"] ?? 0),
                "total_items" => intval($summary["total_items"] ?? 0),
                "completed_orders" => intval($summary["completed_orders"] ?? 0),
            ],
            "daily_sales" => $dailySales,
            "status_breakdown" => $statusBreakdown,
            "top_products" => $topProducts,
        ]);
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

        $stmt = db()->prepare("SELECT id FROM users WHERE email = :email LIMIT 1");
        $stmt->execute([":email" => $email]);
        if ($stmt->fetch()) fail("Email đã tồn tại");

        $hash = password_hash($password, PASSWORD_BCRYPT);

        $stmt = db()->prepare("INSERT INTO users (role, full_name, email, phone, password_hash, shop_name, shop_address)
            VALUES (:role, :full_name, :email, :phone, :password_hash, :shop_name, :shop_address)");
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
        $body = read_json_body();
        $email = trim($body["email"] ?? "");
        $password = $body["password"] ?? "";

        if ($email === "" || $password === "") fail("Thiếu email hoặc mật khẩu");

        $stmt = db()->prepare("SELECT id, role, full_name, email, password_hash, is_active
            FROM users
            WHERE email = :email
            LIMIT 1");
        $stmt->execute([":email" => $email]);
        $user = $stmt->fetch();

        if (!$user) fail("Sai email hoặc mật khẩu", 401);
        if (intval($user["is_active"]) !== 1) fail("Tài khoản bị khóa", 403);
        if (!password_verify($password, $user["password_hash"])) fail("Sai email hoặc mật khẩu", 401);

        $token = jwt_sign(["uid" => intval($user["id"]), "role" => $user["role"]], $JWT_SECRET, 7 * 24 * 3600);

        ok([
            "token" => $token,
            "user" => [
                "id" => intval($user["id"]),
                "role" => $user["role"],
                "full_name" => $user["full_name"],
                "email" => $user["email"],
            ],
        ]);
    }

    if ($method === "GET" && $path === "/api/auth/me") {
        $payload = require_auth($JWT_SECRET);
        $uid = intval($payload["uid"]);

        $stmt = db()->prepare("SELECT id, role, full_name, email, phone, shop_name, shop_address
            FROM users
            WHERE id = :id
            LIMIT 1");
        $stmt->execute([":id" => $uid]);
        $user = $stmt->fetch();
        if (!$user) fail("User not found", 404);

        ok($user);
    }

    if ($method === "POST" && $path === "/api/seller/products") {
        $payload = require_seller($JWT_SECRET);
        $sellerId = intval($payload["uid"]);

        $body = read_json_body();
        $categoryId = intval($body["category_id"] ?? 0);
        $name = trim($body["name"] ?? "");
        $slug = trim($body["slug"] ?? "");
        $price = intval($body["price"] ?? 0);
        $discountPercent = intval($body["discount_percent"] ?? 0);
        $stock = intval($body["stock"] ?? 0);
        if ($discountPercent < 0 || $discountPercent > 90) fail("discount_percent phai tu 0 den 90");
        $imageUrl = trim($body["image_url"] ?? "");
        $description = trim($body["description"] ?? "");

        if ($categoryId <= 0) fail("category_id không hợp lệ");
        if ($name === "" || $slug === "") fail("Thiếu name/slug");
        if ($price <= 0) fail("price phải > 0");
        if ($stock < 0) fail("stock không hợp lệ");

        $stmt = db()->prepare("SELECT id FROM products WHERE slug = :slug LIMIT 1");
        $stmt->execute([":slug" => $slug]);
        if ($stmt->fetch()) fail("Slug đã tồn tại");

        $stmt = db()->prepare("
            INSERT INTO products (seller_id, category_id, name, slug, price, discount_percent, stock, image_url, description, status)
            VALUES (:seller_id, :category_id, :name, :slug, :price, :discount_percent, :stock, :image_url, :description, 1)
        ");
        $stmt->execute([
            ":seller_id" => $sellerId,
            ":category_id" => $categoryId,
            ":name" => $name,
            ":slug" => $slug,
            ":price" => $price,
            ":discount_percent" => $discountPercent,
            ":stock" => $stock,
            ":image_url" => $imageUrl,
            ":description" => $description,
        ]);

        ok(["message" => "Tạo sản phẩm thành công", "id" => intval(db()->lastInsertId())]);
    }

    if ($method === "GET" && $path === "/api/seller/products") {
        $payload = require_seller($JWT_SECRET);
        $sellerId = intval($payload["uid"]);

        $stmt = db()->prepare("
            SELECT id, name, slug, price, COALESCE(discount_percent, 0) AS discount_percent, GREATEST(price - FLOOR(price * COALESCE(discount_percent, 0) / 100), 0) AS final_price, stock, image_url, description, category_id, status
            FROM products
            WHERE seller_id = :seller_id
            ORDER BY id DESC
        ");
        $stmt->execute([":seller_id" => $sellerId]);

        ok($stmt->fetchAll());
    }

    if ($method === "PUT" && preg_match("#^/api/seller/products/(\\d+)$#", $path, $m)) {
        $payload = require_seller($JWT_SECRET);
        $sellerId = intval($payload["uid"]);
        $productId = intval($m[1]);
        $body = read_json_body();

        $categoryId = intval($body["category_id"] ?? 0);
        $name = trim($body["name"] ?? "");
        $slug = trim($body["slug"] ?? "");
        $price = intval($body["price"] ?? 0);
        $discountPercent = intval($body["discount_percent"] ?? 0);
        $stock = intval($body["stock"] ?? 0);
        if ($discountPercent < 0 || $discountPercent > 90) fail("discount_percent phai tu 0 den 90");
        $imageUrl = trim($body["image_url"] ?? "");
        $description = trim($body["description"] ?? "");

        if ($categoryId <= 0) fail("category_id không hợp lệ");
        if ($name === "" || $slug === "") fail("Thiếu name/slug");
        if ($price <= 0) fail("price phải > 0");
        if ($stock < 0) fail("stock không hợp lệ");

        $stmt = db()->prepare("SELECT id FROM products WHERE id = :id AND seller_id = :seller_id LIMIT 1");
        $stmt->execute([
            ":id" => $productId,
            ":seller_id" => $sellerId,
        ]);
        if (!$stmt->fetch()) fail("Sản phẩm không tồn tại hoặc bạn không có quyền sửa", 404);

        $stmt = db()->prepare("SELECT id FROM products WHERE slug = :slug AND id <> :id LIMIT 1");
        $stmt->execute([
            ":slug" => $slug,
            ":id" => $productId,
        ]);
        if ($stmt->fetch()) fail("Slug đã tồn tại");

        $stmt = db()->prepare("
            UPDATE products
            SET category_id = :category_id,
                name = :name,
                slug = :slug,
                price = :price,
                discount_percent = :discount_percent,
                stock = :stock,
                image_url = :image_url,
                description = :description
            WHERE id = :id AND seller_id = :seller_id
        ");
        $stmt->execute([
            ":category_id" => $categoryId,
            ":name" => $name,
            ":slug" => $slug,
            ":price" => $price,
            ":discount_percent" => $discountPercent,
            ":stock" => $stock,
            ":image_url" => $imageUrl,
            ":description" => $description,
            ":id" => $productId,
            ":seller_id" => $sellerId,
        ]);

        ok(["message" => "Cập nhật sản phẩm thành công"]);
    }

    if ($method === "DELETE" && preg_match("#^/api/seller/products/(\\d+)$#", $path, $m)) {
        $payload = require_seller($JWT_SECRET);
        $sellerId = intval($payload["uid"]);
        $productId = intval($m[1]);

        $stmt = db()->prepare("DELETE FROM products WHERE id = :id AND seller_id = :seller_id");
        $stmt->execute([
            ":id" => $productId,
            ":seller_id" => $sellerId,
        ]);

        if ($stmt->rowCount() === 0) {
            fail("Sản phẩm không tồn tại hoặc bạn không có quyền xóa", 404);
        }

        ok(["message" => "Xóa sản phẩm thành công"]);
    }

    if ($method === "POST" && $path === "/api/seller/upload") {
        $payload = require_auth($JWT_SECRET);
        if (($payload["role"] ?? "") !== "seller") fail("Forbidden: seller only", 403);

        if (!isset($_FILES["image"])) fail("Missing file: image", 400);

        $file = $_FILES["image"];
        if ($file["error"] !== UPLOAD_ERR_OK) fail("Upload error", 400);

        $ext = strtolower(pathinfo($file["name"], PATHINFO_EXTENSION));
        $allowed = ["jpg", "jpeg", "png", "webp"];
        if (!in_array($ext, $allowed, true)) fail("Only jpg/jpeg/png/webp allowed", 400);
        if ($file["size"] > 3 * 1024 * 1024) fail("File too large (max 3MB)", 400);

        $uploadDir = __DIR__ . "/uploads";
        if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

        $newName = "p_" . time() . "_" . bin2hex(random_bytes(6)) . "." . $ext;
        $dest = $uploadDir . "/" . $newName;

        if (!move_uploaded_file($file["tmp_name"], $dest)) fail("Failed to save file", 500);

        $url = "http://localhost/flower-shop-api/public/uploads/" . $newName;
        ok(["image_url" => $url]);
    }

    fail("Not found: " . $path, 404);
} catch (Throwable $e) {
    fail("Server error: " . $e->getMessage(), 500);
}
