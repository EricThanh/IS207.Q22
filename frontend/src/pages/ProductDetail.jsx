import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Avatar, Button, Divider, Empty, List, Rate, Spin, Typography, message } from "antd";
import { HeartOutlined, ShoppingCartOutlined, UserOutlined } from "@ant-design/icons";
import { axiosClient } from "../api/axiosClient";
import { catalogApi } from "../api/catalogApi";
import { useCart } from "../store/CartContext";
import "./ProductDetail.css";

const { Title, Text, Paragraph } = Typography;

function formatVnd(value) {
    return Number(value || 0).toLocaleString("vi-VN") + " d";
}

export default function ProductDetail() {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [qty, setQty] = useState(1);
    const [reviews, setReviews] = useState([]);
    const [avgRating, setAvgRating] = useState(null);
    const [reviewCount, setReviewCount] = useState(0);
    const { addItem } = useCart();

    useEffect(() => {
        setLoading(true);
        setQty(1);
        setReviews([]);
        setAvgRating(null);
        setReviewCount(0);
        axiosClient
            .get(`/api/products/${id}`)
            .then((res) => setProduct(res.data.data))
            .catch(() => message.error("Khong tai duoc san pham"))
            .finally(() => setLoading(false));

        catalogApi
            .getReviews(id)
            .then((res) => {
                setReviews(res.data.data || []);
                setAvgRating(res.data.avg_rating);
                setReviewCount(res.data.total || 0);
            })
            .catch(() => {});
    }, [id]);

    if (loading) {
        return (
            <div className="pd">
                <div className="pd__loading">
                    <Spin />
                </div>
            </div>
        );
    }

    if (!product) {
        return (
            <div className="pd">
                <div className="pd__empty">
                    <Title level={4}>Khong tim thay san pham</Title>
                    <Link to="/">Quay lại trang chủ</Link>
                </div>
            </div>
        );
    }

    const isOutOfStock = Number(product.stock) <= 0;
    const hasDiscount = Number(product.discount_percent) > 0;
    const maxQty = Math.max(Number(product.stock) || 1, 1);

    return (
        <div className="pd">
            <Link to="/" className="pd__back">
                ← Back to Shop
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
                    <div className="pd__topRow">
                        <Text className="pd__category">
                            {product.category_name || "FLOWERS"}
                        </Text>
                        <HeartOutlined className="pd__heart" />
                    </div>

                    <Title level={2} className="pd__title">
                        {product.name}
                    </Title>

                    <div className="pd__priceRow">
                        <Text strong className="pd__price">
                            {formatVnd(product.price)}
                        </Text>

                        {hasDiscount ? (
                            <>
                                <Text className="pd__originalPrice">
                                    {formatVnd(product.original_price)}
                                </Text>
                                <span className="pd__discountTag">
                                    -{product.discount_percent}%
                                </span>
                            </>
                        ) : null}
                    </div>

                    <Paragraph className="pd__desc">
                        {product.description || "San pham chua co mo ta."}
                    </Paragraph>

                    <div className="pd__quantityRow">
                        <span className="pd__label">Số lượng:</span>
                        <div className="pd__quantityControl">
                            <button
                                type="button"
                                className="pd__qtyButton"
                                disabled={qty <= 1 || isOutOfStock}
                                onClick={() => setQty((current) => Math.max(current - 1, 1))}
                            >
                                −
                            </button>
                            <span className="pd__qtyValue">{qty}</span>
                            <button
                                type="button"
                                className="pd__qtyButton"
                                disabled={qty >= maxQty || isOutOfStock}
                                onClick={() =>
                                    setQty((current) => Math.min(current + 1, maxQty))
                                }
                            >
                                +
                            </button>
                        </div>
                    </div>

                    <div className="pd__statusRow">
                        <span className="pd__label">Trạng thái:</span>
                        <span
                            className={`pd__status ${isOutOfStock ? "pd__status--out" : "pd__status--in"
                                }`}
                        >
                            {isOutOfStock ? "Hết hàng" : "Còn hàng"}
                        </span>
                    </div>

                    <Button
                        type="primary"
                        className="pd__cartBtn"
                        disabled={isOutOfStock}
                        icon={<ShoppingCartOutlined />}
                        onClick={() => {
                            addItem(product, qty);
                            message.success("Đã thêm vào giỏ");
                        }}
                    >
                        Thêm vào giỏ hàng
                    </Button>
                </div>
            </div>

            <Divider className="pd__reviewDivider" />

            <div className="pd__reviews">
                <Title level={4} className="pd__reviewsTitle">
                    Đánh giá sản phẩm
                    {avgRating !== null && (
                        <span className="pd__reviewsSummary">
                            <Rate disabled allowHalf value={avgRating} className="pd__summaryRate" />
                            <Text type="secondary" className="pd__summaryText">
                                {avgRating}/5 · {reviewCount} đánh giá
                            </Text>
                        </span>
                    )}
                </Title>

                {reviews.length === 0 ? (
                    <Empty description="Chưa có đánh giá nào" />
                ) : (
                    <List
                        itemLayout="horizontal"
                        dataSource={reviews}
                        renderItem={(review) => (
                            <List.Item>
                                <List.Item.Meta
                                    avatar={<Avatar icon={<UserOutlined />} />}
                                    title={
                                        <span className="pd__reviewHeader">
                                            <Text strong>{review.full_name}</Text>
                                            <Rate
                                                disabled
                                                value={Number(review.rating)}
                                                className="pd__reviewRate"
                                            />
                                        </span>
                                    }
                                    description={
                                        <>
                                            {review.comment && (
                                                <div className="pd__reviewComment">
                                                    {review.comment}
                                                </div>
                                            )}
                                            <Text type="secondary" className="pd__reviewDate">
                                                {new Date(review.created_at).toLocaleDateString("vi-VN")}
                                            </Text>
                                        </>
                                    }
                                />
                            </List.Item>
                        )}
                    />
                )}
            </div>
        </div>
    );
}
