import { useEffect, useMemo, useState } from "react";
import {
    Button,
    Card,
    Col,
    Input,
    Row,
    Spin,
    Typography,
    message,
} from "antd";
import {
    ArrowRightOutlined,
    SafetyOutlined,
    ShoppingCartOutlined,
    TruckOutlined,
} from "@ant-design/icons";
import { Link, useSearchParams } from "react-router-dom";
import { catalogApi } from "../api/catalogApi";
import hoaHongImg from "../images/hoahong.png";
import "./Home.css";

const { Title, Text, Paragraph } = Typography;

const heroSlides = [
    {
        eyebrow: "Bold Floral Mood",
        title: "Fresh Flowers, Delivered Daily",
        subtitle:
            "Nơi hương sắc nở thành yêu thương. Nâng niu hạnh phúc trong từng cánh hoa.",
    },
];

const fallbackCategories = [
    "Roses",
    "Tulips",
    "Lilies",
    "Orchids",
    "Bouquets",
    "Wedding Flowers",
    "Sympathy Flowers",
];

function formatVnd(value) {
    return Number(value || 0).toLocaleString("vi-VN") + " đ";
}

export default function Home() {
    const [searchParams] = useSearchParams();
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [categoryId, setCategoryId] = useState(0);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);

    const displayCategories = useMemo(() => {
        if (categories.length > 0) {
            return categories.map((category) => category.name);
        }

        return fallbackCategories;
    }, [categories]);

    async function loadCategories() {
        try {
            const res = await catalogApi.getCategories();
            setCategories(res.data.data || []);
        } catch {
            message.error("Không tải được loại hoa");
        }
    }

    async function loadProducts(next = {}) {
        const nextCategoryId = next.categoryId ?? categoryId;
        const nextSearch = next.search ?? search;

        setLoading(true);

        try {
            const res = await catalogApi.getProducts({
                category_id: nextCategoryId > 0 ? nextCategoryId : undefined,
                search:
                    nextSearch && nextSearch.trim() !== "" ? nextSearch : undefined,
            });

            setProducts(res.data.data || []);
        } catch {
            message.error("Không tải được sản phẩm");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadCategories();
    }, []);

    useEffect(() => {
        const keyword = searchParams.get("search") || "";

        setSearch(keyword);
        setCategoryId(0);
        loadProducts({
            categoryId: 0,
            search: keyword,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    return (
        <div className="home">
            <section className="home__hero">
                <div className="home__heroInner">
                    <Text className="home__eyebrow">{heroSlides[0].eyebrow}</Text>

                    <Title className="home__headline">
                        <span>Fresh Flowers,</span>
                        <em>Delivered Daily</em>
                    </Title>

                    <Paragraph className="home__lead">{heroSlides[0].subtitle}</Paragraph>

                    <div className="home__heroActions">
                        <Button
                            type="primary"
                            size="large"
                            className="home__cta home__cta--primary"
                        >
                            Shop Now <ArrowRightOutlined />
                        </Button>

                        <Button size="large" className="home__cta home__cta--secondary">
                            Wedding Flowers
                        </Button>
                    </div>
                </div>
            </section>

            <section className="home__features" aria-label="Flower shop benefits">
                <div className="home__feature">
                    <span className="home__featureIcon">
                        <TruckOutlined />
                    </span>
                    <Title level={4} className="home__featureTitle">
                        Fast Delivery
                    </Title>
                    <Text className="home__featureText">
                        Same-day delivery available for orders before 2 PM
                    </Text>
                </div>

                <div className="home__feature">
                    <span className="home__featureIcon">🌸</span>
                    <Title level={4} className="home__featureTitle">
                        Fresh & Beautiful
                    </Title>
                    <Text className="home__featureText">
                        Hand-selected flowers from trusted growers
                    </Text>
                </div>

                <div className="home__feature">
                    <span className="home__featureIcon">
                        <SafetyOutlined />
                    </span>
                    <Title level={4} className="home__featureTitle">
                        100% Satisfaction
                    </Title>
                    <Text className="home__featureText">
                        We guarantee the quality of every arrangement
                    </Text>
                </div>
            </section>

            <section className="home__categorySection">
                <Title level={2} className="home__categoryTitle">
                    Shop by Category
                </Title>

                <div className="home__categoryGrid">
                    {displayCategories.map((name) => (
                        <Card key={name} hoverable className="home__categoryCard">
                            <span className="home__categoryIcon">🌸</span>
                            <Text className="home__categoryName">{name}</Text>
                        </Card>
                    ))}
                </div>
            </section>

            <section className="home__productsSection">
                <div className="home__catalogHeader">
                    <Title level={3} className="home__title">
                        Danh sách hoa nổi bật
                    </Title>
                    <Text className="home__resultCount">{products.length} kết quả</Text>
                </div>

                {loading && (
                    <div className="home__loading">
                        <Spin />
                        <Text type="secondary">Đang tải sản phẩm...</Text>
                    </div>
                )}

                <Row gutter={[18, 18]}>
                    {products.map((product) => {
                        const hasDiscount = Number(product.discount_percent) > 0;
                        const hasStock = Number(product.stock) > 0;

                        return (
                            <Col key={product.id} xs={24} sm={12} md={8} lg={6}>
                                <Link to={`/product/${product.id}`} className="home__cardLink">
                                    <Card
                                        hoverable
                                        className="home__card"
                                        cover={
                                            <div className="home__imgWrap">
                                                {hasDiscount && (
                                                    <span className="home__discountBadge">
                                                        {product.discount_percent}% GIẢM
                                                    </span>
                                                )}

                                                <img
                                                    alt={product.name}
                                                    className="home__img"
                                                    src={product.image_url || hoaHongImg}
                                                    onError={(e) => {
                                                        e.currentTarget.src = hoaHongImg;
                                                    }}
                                                />
                                            </div>
                                        }
                                    >
                                        <Title level={5} className="home__productName">
                                            {product.name}
                                        </Title>

                                        <Paragraph className="home__desc">
                                            {product.description || "Sản phẩm chưa có mô tả."}
                                        </Paragraph>

                                        <div className="home__priceRow">
                                            <div className="home__priceBlock">
                                                <Text strong className="home__price">
                                                    {formatVnd(product.price)}
                                                </Text>

                                                {hasDiscount && (
                                                    <Text className="home__originalPrice">
                                                        {formatVnd(product.original_price)}
                                                    </Text>
                                                )}
                                            </div>

                                            <span
                                                className={`home__stockPill ${
                                                    hasStock ? "" : "home__stockPill--empty"
                                                }`}
                                            >
                                                {hasStock ? "In Stock" : "Hết hàng"}
                                            </span>
                                        </div>

                                        <div className="home__productActions">
                                            <span className="home__detailsButton">View Details</span>
                                            <span className="home__cartButton" aria-hidden="true">
                                                <ShoppingCartOutlined />
                                            </span>
                                        </div>
                                    </Card>
                                </Link>
                            </Col>
                        );
                    })}
                </Row>
            </section>

            <section className="home__newsletter">
                <Title level={2} className="home__newsletterTitle">
                    Subscribe to Our Newsletter
                </Title>

                <Text className="home__newsletterText">
                    Get exclusive offers, care tips, and early access to new collections
                </Text>

                <div className="home__newsletterForm">
                    <Input className="home__newsletterInput" placeholder="Enter your email" />
                    <Button type="primary" className="home__newsletterButton">
                        Subscribe
                    </Button>
                </div>
            </section>
        </div>
    );
}
