import { Button, Card, InputNumber, Popconfirm, Table, Typography, message } from "antd";
import { Link } from "react-router-dom";
import { useCart } from "../store/CartContext";
import "./Cart.css";
import { useState } from "react";
import CheckoutQrModal from "./CheckoutQrModal";

const { Title, Text } = Typography;

function formatVnd(n) {
    return Number(n || 0).toLocaleString("vi-VN") + " đ";
}

function buildVietQrImageUrl({ bankId, accountNo, amount, addInfo, accountName }) {
    const base = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png`;
    const params = new URLSearchParams();
    if (amount) params.set("amount", String(amount));
    if (addInfo) params.set("addInfo", addInfo);
    if (accountName) params.set("accountName", accountName);
    return `${base}?${params.toString()}`;
}

const BANK_ID = "ICB";
const ACCOUNT_NO = "106874813976";
const ACCOUNT_NAME = "NGUYEN MINH THANH";

export default function Cart() {
    const { items, totalPrice, updateQty, removeItem, clearCart } = useCart();

    // ✅ Hooks phải nằm trong component
    const [qrOpen, setQrOpen] = useState(false);
    const [qrUrl, setQrUrl] = useState("");
    const [qrInfo, setQrInfo] = useState("");

    const columns = [
        {
            title: "Sản phẩm",
            dataIndex: "name",
            key: "name",
            render: (_, item) => (
                <div className="cart__product">
                    <img
                        className="cart__img"
                        src={item.image_url || "/images/hoahong.png"}
                        alt={item.name}
                        onError={(e) => {
                            e.currentTarget.src = "/images/hoahong.png";
                        }}
                    />
                    <div className="cart__info">
                        <Link to={`/product/${item.id}`} className="cart__name">
                            {item.name}
                        </Link>
                        <Text type="secondary">{formatVnd(item.price)}</Text>
                    </div>
                </div>
            ),
        },
        {
            title: "Số lượng",
            dataIndex: "qty",
            key: "qty",
            width: 140,
            render: (_, item) => (
                <InputNumber
                    min={1}
                    max={item.stock ?? 999}
                    value={item.qty}
                    onChange={(val) => updateQty(item.id, val)}
                />
            ),
        },
        {
            title: "Tạm tính",
            key: "subtotal",
            width: 160,
            render: (_, item) => <Text strong>{formatVnd(item.qty * item.price)}</Text>,
        },
        {
            title: "",
            key: "actions",
            width: 120,
            render: (_, item) => (
                <Popconfirm
                    title="Xóa sản phẩm này?"
                    okText="Xóa"
                    cancelText="Hủy"
                    onConfirm={() => {
                        removeItem(item.id);
                        message.success("Đã xóa");
                    }}
                >
                    <Button danger>Xóa</Button>
                </Popconfirm>
            ),
        },
    ];

    return (
        <div className="cart">
            <Title level={3} className="cart__title">
                Giỏ hàng
            </Title>

            <Card>
                <Table
                    rowKey="id"
                    columns={columns}
                    dataSource={items}
                    pagination={false}
                    locale={{ emptyText: "Giỏ hàng trống" }}
                />

                <div className="cart__footer">
                    <div className="cart__total">
                        <Text>Tổng tiền:</Text>
                        <Text strong className="cart__totalValue">
                            {formatVnd(totalPrice)}
                        </Text>
                    </div>

                    <div className="cart__buttons">
                        <Popconfirm
                            title="Xóa toàn bộ giỏ hàng?"
                            okText="Xóa"
                            cancelText="Hủy"
                            onConfirm={() => {
                                clearCart();
                                message.success("Đã xóa toàn bộ");
                            }}
                        >
                            <Button disabled={items.length === 0}>Xóa hết</Button>
                        </Popconfirm>

                        <Button
                            type="primary"
                            disabled={items.length === 0}
                            onClick={() => {
                                const addInfo = `FLOWER-${Date.now()}`;
                                const url = buildVietQrImageUrl({
                                    bankId: BANK_ID,
                                    accountNo: ACCOUNT_NO,
                                    amount: totalPrice,
                                    addInfo,
                                    accountName: ACCOUNT_NAME,
                                });

                                setQrInfo(addInfo);
                                setQrUrl(url);
                                setQrOpen(true);
                            }}
                        >
                            Thanh toán
                        </Button>
                    </div>
                </div>
            </Card>


            <CheckoutQrModal
                open={qrOpen}
                onClose={() => setQrOpen(false)}
                qrUrl={qrUrl}
                amount={totalPrice}
                addInfo={qrInfo}
            />
        </div>
    );
}