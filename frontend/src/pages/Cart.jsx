import { useEffect, useState } from "react";
import { Button, Card, Form, Input, InputNumber, Popconfirm, Table, Typography, message } from "antd";
import { Link, useLocation, useNavigate } from "react-router-dom";
import CheckoutQrModal from "./CheckoutQrModal";
import { useCart } from "../store/CartContext";
import { useAuth } from "../store/AuthContext";
import { orderApi } from "../api/orderApi";
import "./Cart.css";

const { Title, Text } = Typography;
const { TextArea } = Input;

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
    const [form] = Form.useForm();
    const nav = useNavigate();
    const location = useLocation();
    const { user, isLoggedIn } = useAuth();
    const { items, totalPrice, updateQty, removeItem, clearCart } = useCart();
    const [submitting, setSubmitting] = useState(false);
    const [qrOpen, setQrOpen] = useState(false);
    const [qrUrl, setQrUrl] = useState("");
    const [qrInfo, setQrInfo] = useState("");
    const [qrAmount, setQrAmount] = useState(0);

    useEffect(() => {
        form.setFieldsValue({
            receiver_name: user?.full_name || "",
            receiver_phone: user?.phone || "",
            receiver_address: "",
            note: "",
        });
    }, [form, user]);

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

    async function onCheckout(values) {
        if (!isLoggedIn) {
            message.info("Vui lòng đăng nhập để đặt hàng");
            nav("/login", { state: { from: location } });
            return;
        }

        if (items.length === 0) {
            message.warning("Giỏ hàng đang trống");
            return;
        }

        const invalidItem = items.find((item) => !item.seller_id);
        if (invalidItem) {
            message.error("Có sản phẩm thiếu thông tin người bán. Hãy thêm lại sản phẩm vào giỏ.");
            return;
        }

        setSubmitting(true);
        try {
            const res = await orderApi.create({
                receiver_name: values.receiver_name,
                receiver_phone: values.receiver_phone,
                receiver_address: values.receiver_address,
                note: values.note || "",
                items: items.map((item) => ({
                    product_id: item.id,
                    seller_id: item.seller_id,
                    quantity: item.qty,
                })),
            });

            const order = res.data.data;
            const addInfo = `ORDER-${order.order_id}`;
            const url = buildVietQrImageUrl({
                bankId: BANK_ID,
                accountNo: ACCOUNT_NO,
                amount: order.total_amount,
                addInfo,
                accountName: ACCOUNT_NAME,
            });

            setQrInfo(addInfo);
            setQrUrl(url);
            setQrAmount(order.total_amount);
            setQrOpen(true);
            clearCart();
            message.success(`Đã tạo đơn #${order.order_id}`);
        } catch (e) {
            message.error(e?.response?.data?.message || "Tạo đơn hàng thất bại");
        } finally {
            setSubmitting(false);
        }
    }

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
                    </div>
                </div>
            </Card>

            <Card className="cart__checkout" title="Thông tin nhận hàng">
                <Form form={form} layout="vertical" onFinish={onCheckout}>
                    <div className="cart__formGrid">
                        <Form.Item
                            label="Người nhận"
                            name="receiver_name"
                            rules={[{ required: true, message: "Nhập tên người nhận" }]}
                        >
                            <Input placeholder="Nguyễn Văn A" />
                        </Form.Item>

                        <Form.Item
                            label="Số điện thoại"
                            name="receiver_phone"
                            rules={[{ required: true, message: "Nhập số điện thoại" }]}
                        >
                            <Input placeholder="09xxxxxxxx" />
                        </Form.Item>
                    </div>

                    <Form.Item
                        label="Địa chỉ nhận hàng"
                        name="receiver_address"
                        rules={[{ required: true, message: "Nhập địa chỉ nhận hàng" }]}
                    >
                        <TextArea rows={3} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" />
                    </Form.Item>

                    <Form.Item label="Ghi chú" name="note">
                        <TextArea rows={3} placeholder="Ví dụ: giao giờ hành chính" />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" loading={submitting} disabled={items.length === 0}>
                        Tạo đơn và thanh toán
                    </Button>
                </Form>
            </Card>

            <CheckoutQrModal
                open={qrOpen}
                onClose={() => setQrOpen(false)}
                qrUrl={qrUrl}
                amount={qrAmount}
                addInfo={qrInfo}
            />
        </div>
    );
}
