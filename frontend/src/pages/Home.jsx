import { useEffect, useMemo, useState } from "react";
import { Card, Col, Input, Row, Select, Space, Typography, message, Spin } from "antd";
import { Link } from "react-router-dom";
import { catalogApi } from "../api/catalogApi";
import "./Home.css";
import hoaHongImg from "../images/hoahong.png";
import React from 'react';
import { Carousel } from 'antd';
const { Title, Text } = Typography;

export default function Home() {
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);

    const [categoryId, setCategoryId] = useState(0);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);

    const categoryOptions = useMemo(() => {
        return [
            { value: 0, label: "Tất cả danh mục" },
            ...categories.map((c) => ({ value: c.id, label: c.name })),
        ];
    }, [categories]);

    async function loadCategories() {
        try {
            const res = await catalogApi.getCategories();
            setCategories(res.data.data || []);
        } catch {
            message.error("Không tải được danh mục");
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
            message.error("Không tải được sản phẩm");
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
            <Title level={3} className="home__title">
                Danh sách hoa
            </Title>

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
                    placeholder="Tìm theo tên (vd: hồng)"
                    allowClear
                    onSearch={(value) => {
                        setSearch(value);
                        loadProducts({ search: value });
                    }}
                />
            </Space>

            {loading && (
                <div className="home__loading">
                    <Spin /> <Text type="secondary">Đang tải sản phẩm...</Text>
                </div>
            )}
            <Carousel autoplay className="home__carousel" arrows infinite={false}>
                <div className="home__slide">
                    <h3>1</h3>
                </div>
                <div className="home__slide">
                    <h3>2</h3>
                </div>
                <div className="home__slide">
                    <h3>3</h3>
                </div>
                <div className="home__slide">
                    <h3>4</h3>
                </div>
            </Carousel>

            <Row gutter={[16, 16]}>
                {products.map((p) => (
                    <Col key={p.id} xs={24} sm={12} md={8} lg={6}>
                        <Link to={`/product/${p.id}`} className="home__cardLink">
                            <Card
                                hoverable
                                className="home__card"
                                cover={
                                    <img
                                        alt={p.name}
                                        className="home__img"
                                        src={p.image_url || hoaHongImg}
                                        onError={(e) => {
                                            e.currentTarget.src = hoaHongImg;
                                        }}
                                    />
                                }
                            >
                                <Title level={5} className="home__productName">
                                    {p.name}
                                </Title>

                                <Text strong className="home__price">
                                    {Number(p.price).toLocaleString("vi-VN")} đ
                                </Text>

                                <div className="home__descWrap">
                                    <Text type="secondary" className="home__desc">
                                        {p.description}
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