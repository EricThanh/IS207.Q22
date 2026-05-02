import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Card, Space, Tag, Typography, message } from "antd";
import { axiosClient } from "../api/axiosClient";
import { useCart } from "../store/CartContext";
import "./ProductDetail.css";

const { Title, Text, Paragraph } = Typography;

function formatVnd(value) {
    return Number(value || 0).toLocaleString("vi-VN") + " đ";
}

export default function ProductDetail() {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const { addItem } = useCart();

    useEffect(() => {
        setLoading(true);
        axiosClient
            .get(`/api/products/${id}`)
            .then((res) => setProduct(res.data.data))
            .catch(() => message.error("Không tải được sản phẩm"))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <Card loading />;

    if (!product) {
        return (
            <Card>
                <Title level={4}>Không tìm thấy sản phẩm</Title>
                <Link to="/">Quay lại trang chủ</Link>
            </Card>
        );
    }

    const isOutOfStock = Number(product.stock) <= 0;

    return (
        <div className="pd">
            <Card className="pd__card">
                <Link to="/" className="pd__back">
                    ← Quay lại
                </Link>

                <div className="pd__content">
                    <div className="pd__imgWrap">
                        <img
                            className="pd__img"
                            alt={product.name}
                            src={product.image_url || "https://placehold.co/800x600?text=Flower"}
                            onError={(e) => {
                                e.currentTarget.src = "https://placehold.co/800x600?text=Flower";
                            }}
                        />
                    </div>

                    <div className="pd__info">
                        <Title level={3} className="pd__title">
                            {product.name}
                        </Title>

                        <div className="pd__meta">
                            <Text strong className="pd__price">
                                {formatVnd(product.price)}
                            </Text>

                            <div className="pd__stockRow">
                                <Tag color={isOutOfStock ? "red" : "green"} className="pd__stockTag">
                                    {isOutOfStock ? "Hết hàng" : "Còn hàng"}
                                </Tag>
                                <Text className="pd__stockText">
                                    Còn lại <strong>{Number(product.stock) || 0}</strong> sản phẩm
                                </Text>
                            </div>
                        </div>

                        <Paragraph className="pd__desc">
                            {product.description || "Sản phẩm chưa có mô tả."}
                        </Paragraph>

                        <Space wrap>
                            <Button
                                type="primary"
                                disabled={isOutOfStock}
                                onClick={() => {
                                    addItem(product, 1);
                                    message.success("Đã thêm vào giỏ");
                                }}
                            >
                                Thêm vào giỏ
                            </Button>

                            <Button
                                disabled={isOutOfStock}
                                onClick={() => message.info("Bước sau sẽ làm mua ngay/checkout")}
                            >
                                Mua ngay
                            </Button>
                        </Space>
                    </div>
                </div>
            </Card>
        </div>
    );
}
