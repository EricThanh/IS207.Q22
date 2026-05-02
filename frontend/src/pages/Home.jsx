import { useEffect, useMemo, useState } from "react";
import { Card, Carousel, Col, Input, Row, Select, Space, Spin, Typography, message } from "antd";
import { Link } from "react-router-dom";
import { catalogApi } from "../api/catalogApi";
import hoaHongImg from "../images/hoahong.png";
import "./Home.css";

const { Title, Text, Paragraph } = Typography;

const heroSlides = [
    {
        eyebrow: "Bo suu tap mua nay",
        title: "Hoa dep cho sinh nhat, ky niem va nhung ngay can mot chut diu dang.",
        subtitle: "Chon nhanh nhung mau hoa duoc dat nhieu nhat, phoi mau sang va de tang trong moi dip.",
        tone: "home__slide--rose",
    },
    {
        eyebrow: "Goi y tang qua",
        title: "Tu bo hong co dien den gio hoa pastel, tat ca deu da san sang de giao.",
        subtitle: "Loc theo danh muc va tim nhanh mau hoa phu hop voi nguoi ban muon tang.",
        tone: "home__slide--sun",
    },
    {
        eyebrow: "Nhe nhang va tinh te",
        title: "Mot trang chu de xem, de chon va de yeu ngay tu cai nhin dau tien.",
        subtitle: "Tap trung vao nhung san pham noi bat voi hinh anh lon, gia ro rang va mo ta ngan gon.",
        tone: "home__slide--mint",
    },
];

function formatVnd(value) {
    return Number(value || 0).toLocaleString("vi-VN") + " d";
}

export default function Home() {
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [categoryId, setCategoryId] = useState(0);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);

    const categoryOptions = useMemo(() => {
        return [
            { value: 0, label: "Tat ca danh muc" },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
        ];
    }, [categories]);

    async function loadCategories() {
        try {
            const res = await catalogApi.getCategories();
            setCategories(res.data.data || []);
        } catch {
            message.error("Khong tai duoc danh muc");
        }
    }

    async function loadProducts(next = {}) {
        const nextCategoryId = next.categoryId ?? categoryId;
        const nextSearch = next.search ?? search;

        setLoading(true);
        try {
            const res = await catalogApi.getProducts({
                category_id: nextCategoryId > 0 ? nextCategoryId : undefined,
                search: nextSearch && nextSearch.trim() !== "" ? nextSearch : undefined,
            });
            setProducts(res.data.data || []);
        } catch {
            message.error("Khong tai duoc san pham");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadCategories();
        loadProducts({ categoryId: 0, search: "" });
    }, []);

    return (
        <div className="home">
            <section className="home__hero">
                <div className="home__heroCopy">
                    <Text className="home__eyebrow">Flower shop curated picks</Text>
                    <Title className="home__headline">
                        Chon mot bo hoa dep, sang va phu hop cho tung dip dac biet.
                    </Title>
                    <Paragraph className="home__lead">
                        Trang chu moi uu tien trai nghiem mua hoa nhanh hon: banner ro rang, bo loc gon gang
                        va danh sach san pham trinh bay dep mat hon.
                    </Paragraph>

                    <div className="home__heroStats">
                        <div className="home__stat">
                            <strong>{products.length}</strong>
                            <span>San pham dang hien thi</span>
                        </div>
                        <div className="home__stat">
                            <strong>{categories.length}</strong>
                            <span>Danh muc de lua chon</span>
                        </div>
                        <div className="home__stat">
                            <strong>Giao nhanh</strong>
                            <span>Dat hang linh hoat hon</span>
                        </div>
                    </div>
                </div>

                <div className="home__heroCarousel">
                    <Carousel autoplay className="home__carousel" dots>
                        {heroSlides.map((slide) => (
                            <div key={slide.title}>
                                <div className={`home__slide ${slide.tone}`}>
                                    <Text className="home__slideEyebrow">{slide.eyebrow}</Text>
                                    <Title level={3} className="home__slideTitle">
                                        {slide.title}
                                    </Title>
                                    <Paragraph className="home__slideText">{slide.subtitle}</Paragraph>
                                </div>
                            </div>
                        ))}
                    </Carousel>
                </div>
            </section>

            <Card className="home__filtersCard">
                <div className="home__filtersHeader">
                    <div>
                        <Title level={4} className="home__sectionTitle">
                            Tim hoa theo phong cach ban muon
                        </Title>
                        <Text type="secondary">Loc theo danh muc hoac tim nhanh theo ten san pham.</Text>
                    </div>
                    <Text className="home__resultCount">{products.length} ket qua</Text>
                </div>

                <Space wrap className="home__filters">
                    <Select
                        className="home__select"
                        options={categoryOptions}
                        value={categoryId}
                        onChange={(val) => {
                            setCategoryId(val);
                            loadProducts({ categoryId: val });
                        }}
                    />

                    <Input.Search
                        className="home__search"
                        placeholder="Tim theo ten, vd: hong, cuoi, sinh nhat"
                        allowClear
                        onSearch={(value) => {
                            setSearch(value);
                            loadProducts({ search: value });
                        }}
                    />
                </Space>
            </Card>

            <div className="home__catalogHeader">
                <div>
                    <Title level={3} className="home__title">
                        Danh sach hoa
                    </Title>
                    <Text type="secondary">Nhung mau hoa duoc trinh bay lai voi bo cuc de nhin va de so sanh hon.</Text>
                </div>
            </div>

            {loading && (
                <div className="home__loading">
                    <Spin /> <Text type="secondary">Dang tai san pham...</Text>
                </div>
            )}

            <Row gutter={[18, 18]}>
                {products.map((product) => (
                    <Col key={product.id} xs={24} sm={12} md={8} lg={6}>
                        <Link to={`/product/${product.id}`} className="home__cardLink">
                            <Card
                                hoverable
                                className="home__card"
                                cover={
                                    <div className="home__imgWrap">
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
                                <Text className="home__cardBadge">Flower pick</Text>
                                <Title level={5} className="home__productName">
                                    {product.name}
                                </Title>
                                <Text strong className="home__price">
                                    {formatVnd(product.price)}
                                </Text>

                                <div className="home__descWrap">
                                    <Text type="secondary" className="home__desc">
                                        {product.description || "San pham chua co mo ta."}
                                    </Text>
                                </div>
                            </Card>
                        </Link>
                    </Col>
                ))}
            </Row>
        </div>
    );
}
