import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Button, Card, Typography, message, Space } from "antd";
import { axiosClient } from "../api/axiosClient";
import "./ProductDetail.css";

const { Title, Text, Paragraph } = Typography;

export default function ProductDetail() {
    const { id } = useParams();
    const [p, setP] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        axiosClient
            .get(`/api/products/${id}`)
            .then((res) => setP(res.data.data))
            .catch(() => message.error("Không tải được sản phẩm"))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <Card loading />;

    if (!p) {
        return (
            <Card>
                <Title level={4}>Không tìm thấy sản phẩm</Title>
                <Link to="/">Quay lại trang chủ</Link>
            </Card>
        );
    }

    return (
        <div className="pd">
            <Card>
                <Link to="/" className="pd__back">
                    ← Quay lại
                </Link>

                <div className="pd__content">
                    <div className="pd__imgWrap">
                        <img
                            className="pd__img"
                            alt={p.name}
                            src={p.image_url || "https://placehold.co/800x600?text=Flower"}
                            onError={(e) => {
                                e.currentTarget.src = "https://placehold.co/800x600?text=Flower";
                            }}
                        />
                    </div>

                    <div className="pd__info">
                        <Title level={3} className="pd__title">
                            {p.name}
                        </Title>

                        <Text strong className="pd__price">
                            {Number(p.price).toLocaleString("vi-VN")} đ
                        </Text>

                        <Paragraph className="pd__desc">{p.description}</Paragraph>

                        <Space wrap>
                            <Button
                                type="primary"
                                onClick={() => message.success("Đã thêm vào giỏ (bước sau sẽ làm giỏ thật)")}
                            >
                                Thêm vào giỏ
                            </Button>

                            <Button onClick={() => message.info("Bước sau sẽ làm mua ngay/checkout")}>Mua ngay</Button>
                        </Space>
                    </div>
                </div>
            </Card>
        </div>
    );
}