import { useEffect, useMemo, useState } from "react";
import { Card, Collapse, Empty, List, Space, Tag, Typography, message } from "antd";
import { Link } from "react-router-dom";
import { orderApi } from "../api/orderApi";
import "./BuyerOrders.css";

const { Title, Text, Paragraph } = Typography;

function formatVnd(value) {
    return Number(value || 0).toLocaleString("vi-VN") + " đ";
}

function formatDateTime(value) {
    if (!value) return "";
    return new Date(value).toLocaleString("vi-VN");
}

function getStatusMeta(status) {
    const map = {
        pending: { label: "Chờ xác nhận", color: "gold" },
        confirmed: { label: "Đã xác nhận", color: "blue" },
        shipping: { label: "Đang giao", color: "cyan" },
        completed: { label: "Hoàn thành", color: "green" },
        cancelled: { label: "Đã hủy", color: "red" },
    };
    return map[status] || { label: status, color: "default" };
}

export default function BuyerOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        orderApi
            .getMyOrders()
            .then((res) => setOrders(res.data.data || []))
            .catch((e) => message.error(e?.response?.data?.message || "Không tải được lịch sử đơn hàng"))
            .finally(() => setLoading(false));
    }, []);

    const summary = useMemo(() => {
        return orders.reduce(
            (acc, order) => {
                acc.totalOrders += 1;
                acc.totalSpent += Number(order.total_amount) || 0;
                if (order.status === "completed") acc.completed += 1;
                return acc;
            },
            { totalOrders: 0, totalSpent: 0, completed: 0 }
        );
    }, [orders]);

    const collapseItems = orders.map((order) => {
        const statusMeta = getStatusMeta(order.status);
        return {
            key: String(order.id),
            label: (
                <div className="buyer-orders__panelHeader">
                    <div>
                        <Text strong>Đơn #{order.id}</Text>
                        <div>
                            <Text type="secondary">{formatDateTime(order.created_at)}</Text>
                        </div>
                    </div>
                    <div className="buyer-orders__panelMeta">
                        <Tag color={statusMeta.color}>{statusMeta.label}</Tag>
                        <Text strong>{formatVnd(order.total_amount)}</Text>
                    </div>
                </div>
            ),
            children: (
                <div className="buyer-orders__panelBody">
                    <div>
                        <Paragraph className="buyer-orders__detail">
                            <Text strong>Người nhận:</Text> {order.receiver_name}
                        </Paragraph>
                        <Paragraph className="buyer-orders__detail">
                            <Text strong>Số điện thoại:</Text> {order.receiver_phone}
                        </Paragraph>
                        <Paragraph className="buyer-orders__detail">
                            <Text strong>Địa chỉ:</Text> {order.receiver_address}
                        </Paragraph>
                        {order.note ? (
                            <Paragraph className="buyer-orders__detail">
                                <Text strong>Ghi chú:</Text> {order.note}
                            </Paragraph>
                        ) : null}
                    </div>

                    <List
                        dataSource={order.items || []}
                        locale={{ emptyText: "Đơn hàng chưa có sản phẩm" }}
                        renderItem={(item) => (
                            <List.Item className="buyer-orders__item">
                                <div className="buyer-orders__product">
                                    <img
                                        className="buyer-orders__thumb"
                                        src={item.product_image_url || "https://placehold.co/120x120?text=Flower"}
                                        alt={item.product_name}
                                        onError={(e) => {
                                            e.currentTarget.src = "https://placehold.co/120x120?text=Flower";
                                        }}
                                    />
                                    <div className="buyer-orders__itemInfo">
                                        <Link to={`/product/${item.product_id}`} className="buyer-orders__productLink">
                                            {item.product_name}
                                        </Link>
                                        <Space size={16} wrap>
                                            <Text type="secondary">Đơn giá: {formatVnd(item.price)}</Text>
                                            <Text type="secondary">Số lượng: {item.quantity}</Text>
                                        </Space>
                                    </div>
                                </div>
                                <Text strong>{formatVnd(item.subtotal)}</Text>
                            </List.Item>
                        )}
                    />
                </div>
            ),
        };
    });

    return (
        <div className="buyer-orders">
            <Card className="buyer-orders__hero">
                <Title level={3} className="buyer-orders__title">
                    Đơn hàng của tôi
                </Title>
                <Paragraph type="secondary" className="buyer-orders__subtitle">
                    Theo dõi các đơn đã đặt, trạng thái xử lý và sản phẩm đã mua của bạn.
                </Paragraph>

                <div className="buyer-orders__summary">
                    <Card size="small" className="buyer-orders__summaryCard" loading={loading}>
                        <Text type="secondary">Tổng đơn hàng</Text>
                        <Title level={4}>{summary.totalOrders}</Title>
                    </Card>
                    <Card size="small" className="buyer-orders__summaryCard" loading={loading}>
                        <Text type="secondary">Tổng chi tiêu</Text>
                        <Title level={4}>{formatVnd(summary.totalSpent)}</Title>
                    </Card>
                    <Card size="small" className="buyer-orders__summaryCard" loading={loading}>
                        <Text type="secondary">Đơn hoàn thành</Text>
                        <Title level={4}>{summary.completed}</Title>
                    </Card>
                </div>
            </Card>

            <Card className="buyer-orders__listCard" loading={loading}>
                {orders.length > 0 ? (
                    <Collapse items={collapseItems} accordion className="buyer-orders__collapse" />
                ) : (
                    <Empty description="Bạn chưa có đơn hàng nào" />
                )}
            </Card>
        </div>
    );
}
