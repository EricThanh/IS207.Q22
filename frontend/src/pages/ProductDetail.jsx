import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Spin, Typography, message } from "antd";
import { HeartOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { axiosClient } from "../api/axiosClient";
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
    const { addItem } = useCart();

    useEffect(() => {
        setLoading(true);
        setQty(1);
        axiosClient
            .get(`/api/products/${id}`)
            .then((res) => setProduct(res.data.data))
            .catch(() => message.error("Khong tai duoc san pham"))
            .finally(() => setLoading(false));
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
                        <span className="pd__label">Quantity:</span>
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
                        <span className="pd__label">Status:</span>
                        <span
                            className={`pd__status ${isOutOfStock ? "pd__status--out" : "pd__status--in"
                                }`}
                        >
                            {isOutOfStock ? "Hết hàng" : "In Stock"}
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
        </div>
    );
}
