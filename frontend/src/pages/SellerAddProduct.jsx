import { useEffect, useMemo, useState } from "react";
import {
    Button,
    Card,
    Col,
    Empty,
    Form,
    Input,
    InputNumber,
    Popconfirm,
    Row,
    Select,
    Space,
    Statistic,
    Table,
    Tag,
    Typography,
    message,
} from "antd";
import { Column, Pie } from "@ant-design/charts";
import { catalogApi } from "../api/catalogApi";
import { axiosClient } from "../api/axiosClient";
import "./SellerAddProduct.css";

const { Paragraph, Text, Title } = Typography;

function slugify(str) {
    return (str || "")
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

function formatVnd(n) {
    return Number(n || 0).toLocaleString("vi-VN") + " đ";
}

function formatChartDate(date) {
    return new Date(date).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
    });
}

function getStatusLabel(status) {
    const map = {
        pending: "Chờ xác nhận",
        confirmed: "Đã xác nhận",
        shipping: "Đang giao",
        completed: "Hoàn thành",
        cancelled: "Đã hủy",
    };
    return map[status] || status;
}

const initialValues = {
    category_id: undefined,
    name: "",
    price: 1,
    stock: 0,
    image_url: "",
    description: "",
};

export default function SellerAddProduct() {
    const [categories, setCategories] = useState([]);
    const [products, setProducts] = useState([]);
    const [stats, setStats] = useState({
        summary: {
            total_revenue: 0,
            total_orders: 0,
            total_items: 0,
            completed_orders: 0,
        },
        daily_sales: [],
        status_breakdown: [],
        top_products: [],
        range_days: 7,
    });
    const [selectedDays, setSelectedDays] = useState(7);
    const [loadingProducts, setLoadingProducts] = useState(false);
    const [loadingStats, setLoadingStats] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [form] = Form.useForm();

    const categoryOptions = useMemo(
        () => categories.map((c) => ({ value: c.id, label: c.name })),
        [categories]
    );

    const categoryMap = useMemo(() => {
        return categories.reduce((acc, category) => {
            acc[category.id] = category.name;
            return acc;
        }, {});
    }, [categories]);

    const dailySalesChartData = useMemo(() => {
        return (stats.daily_sales || []).map((item) => ({
            ...item,
            label: formatChartDate(item.date),
        }));
    }, [stats.daily_sales]);

    const pieChartData = useMemo(() => {
        return (stats.status_breakdown || []).map((item) => ({
            type: getStatusLabel(item.status),
            value: Number(item.orders_count) || 0,
        }));
    }, [stats.status_breakdown]);

    const topProductColumns = [
        {
            title: "Sản phẩm",
            dataIndex: "name",
            key: "name",
        },
        {
            title: "Đã bán",
            dataIndex: "items_sold",
            key: "items_sold",
            width: 120,
        },
        {
            title: "Doanh thu",
            dataIndex: "revenue",
            key: "revenue",
            width: 180,
            render: (value) => formatVnd(value),
        },
    ];

    async function loadCategories() {
        const res = await catalogApi.getCategories();
        setCategories(res.data.data || []);
    }

    async function loadProducts() {
        setLoadingProducts(true);
        try {
            const res = await axiosClient.get("/api/seller/products");
            setProducts(res.data.data || []);
        } catch (e) {
            message.error(e?.response?.data?.message || "Không tải được sản phẩm của bạn");
        } finally {
            setLoadingProducts(false);
        }
    }

    async function loadStats(days = selectedDays) {
        setLoadingStats(true);
        try {
            const res = await axiosClient.get("/api/seller/stats", {
                params: { days },
            });
            setStats(res.data.data);
        } catch (e) {
            message.error(e?.response?.data?.message || "Không tải được thống kê");
        } finally {
            setLoadingStats(false);
        }
    }

    useEffect(() => {
        loadCategories().catch(() => {
            message.error("Không tải được danh mục");
        });
        loadProducts();
    }, []);

    useEffect(() => {
        loadStats(selectedDays);
    }, [selectedDays]);

    function resetForm() {
        setEditingProduct(null);
        form.resetFields();
        form.setFieldsValue(initialValues);
    }

    function startEdit(product) {
        setEditingProduct(product);
        form.setFieldsValue({
            category_id: product.category_id,
            name: product.name,
            price: Number(product.price) || 1,
            stock: Number(product.stock) || 0,
            image_url: product.image_url || "",
            description: product.description || "",
        });
    }

    async function onFinish(values) {
        setSubmitting(true);
        try {
            const payload = {
                ...values,
                slug: slugify(values.name),
            };

            if (editingProduct) {
                await axiosClient.put(`/api/seller/products/${editingProduct.id}`, payload);
                message.success("Cập nhật sản phẩm thành công");
            } else {
                await axiosClient.post("/api/seller/products", payload);
                message.success("Tạo sản phẩm thành công");
            }

            resetForm();
            loadProducts();
        } catch (e) {
            message.error(e?.response?.data?.message || "Lưu sản phẩm thất bại");
        } finally {
            setSubmitting(false);
        }
    }

    async function uploadImage(file) {
        const fd = new FormData();
        fd.append("image", file);

        setUploading(true);
        try {
            const res = await axiosClient.post("/api/seller/upload", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            return res.data.data.image_url;
        } finally {
            setUploading(false);
        }
    }

    async function deleteProduct(productId) {
        try {
            await axiosClient.delete(`/api/seller/products/${productId}`);
            message.success("Xóa sản phẩm thành công");

            if (editingProduct?.id === productId) {
                resetForm();
            }

            loadProducts();
        } catch (e) {
            message.error(e?.response?.data?.message || "Xóa sản phẩm thất bại");
        }
    }

    const productColumns = [
        {
            title: "Sản phẩm",
            dataIndex: "name",
            key: "name",
            render: (_, product) => (
                <div className="seller__productCell">
                    <img
                        className="seller__thumb"
                        src={product.image_url || "https://placehold.co/160x120?text=Flower"}
                        alt={product.name}
                        onError={(e) => {
                            e.currentTarget.src = "https://placehold.co/160x120?text=Flower";
                        }}
                    />
                    <div>
                        <Text strong>{product.name}</Text>
                        <div>
                            <Text type="secondary">{categoryMap[product.category_id] || "Chưa có danh mục"}</Text>
                        </div>
                    </div>
                </div>
            ),
        },
        {
            title: "Giá",
            dataIndex: "price",
            key: "price",
            width: 140,
            render: (value) => formatVnd(value),
        },
        {
            title: "Kho",
            dataIndex: "stock",
            key: "stock",
            width: 110,
        },
        {
            title: "Trạng thái",
            dataIndex: "status",
            key: "status",
            width: 130,
            render: (value) => (
                <Tag color={Number(value) === 1 ? "green" : "default"}>
                    {Number(value) === 1 ? "Hiển thị" : "Ẩn"}
                </Tag>
            ),
        },
        {
            title: "Thao tác",
            key: "actions",
            width: 180,
            render: (_, product) => (
                <Space wrap>
                    <Button onClick={() => startEdit(product)}>Sửa</Button>
                    <Popconfirm
                        title="Xóa sản phẩm này?"
                        okText="Xóa"
                        cancelText="Hủy"
                        onConfirm={() => deleteProduct(product.id)}
                    >
                        <Button danger>Xóa</Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const revenueChartConfig = {
        data: dailySalesChartData,
        xField: "label",
        yField: "revenue",
        axis: {
            y: {
                labelFormatter: "~s",
            },
        },
        tooltip: {
            items: [
                (datum) => ({
                    name: "Doanh thu",
                    value: formatVnd(datum.revenue),
                }),
                (datum) => ({
                    name: "Đơn hàng",
                    value: `${datum.orders_count}`,
                }),
                (datum) => ({
                    name: "Sản phẩm bán",
                    value: `${datum.items_sold}`,
                }),
            ],
        },
        style: {
            radiusTopLeft: 10,
            radiusTopRight: 10,
            fill: "#d46b08",
        },
        height: 280,
    };

    const statusPieConfig = {
        data: pieChartData,
        angleField: "value",
        colorField: "type",
        innerRadius: 0.6,
        label: {
            text: "type",
            style: {
                fontWeight: 600,
            },
        },
        legend: {
            color: {
                position: "bottom",
                layout: { justifyContent: "center" },
            },
        },
        height: 280,
    };

    return (
        <div className="seller">
            <Card className="seller__card seller__hero">
                <div className="seller__header">
                    <div>
                        <Title level={3} className="seller__title">
                            Kênh người bán
                        </Title>
                        <Paragraph type="secondary" className="seller__subtitle">
                            Theo dõi doanh số từ đơn hàng của shop và quản lý danh sách sản phẩm ngay trên một màn hình.
                        </Paragraph>
                    </div>
                    <Select
                        className="seller__rangeSelect"
                        value={selectedDays}
                        onChange={setSelectedDays}
                        options={[
                            { value: 7, label: "7 ngày" },
                            { value: 30, label: "30 ngày" },
                            { value: 90, label: "90 ngày" },
                        ]}
                    />
                </div>

                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} lg={6}>
                        <Card className="seller__statCard" loading={loadingStats}>
                            <Statistic title="Tổng doanh thu" value={stats.summary.total_revenue} formatter={(v) => formatVnd(v)} />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card className="seller__statCard" loading={loadingStats}>
                            <Statistic title="Tổng đơn có doanh thu" value={stats.summary.total_orders} />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card className="seller__statCard" loading={loadingStats}>
                            <Statistic title="Sản phẩm đã bán" value={stats.summary.total_items} />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={6}>
                        <Card className="seller__statCard" loading={loadingStats}>
                            <Statistic title="Đơn hoàn thành" value={stats.summary.completed_orders} />
                        </Card>
                    </Col>
                </Row>
            </Card>

            <Row gutter={[16, 16]} className="seller__chartsRow">
                <Col xs={24} xl={16}>
                    <Card
                        className="seller__card"
                        title={`Doanh thu ${selectedDays} ngày gần đây`}
                        loading={loadingStats}
                    >
                        {dailySalesChartData.length > 0 ? (
                            <Column {...revenueChartConfig} />
                        ) : (
                            <Empty description="Chưa có dữ liệu doanh thu trong khoảng thời gian này" />
                        )}
                    </Card>
                </Col>

                <Col xs={24} xl={8}>
                    <Card className="seller__card" title="Tỷ lệ trạng thái đơn" loading={loadingStats}>
                        {pieChartData.length > 0 ? (
                            <Pie {...statusPieConfig} />
                        ) : (
                            <Empty description="Chưa có dữ liệu trạng thái đơn" />
                        )}
                    </Card>
                </Col>
            </Row>

            <Card className="seller__card">
                <Title level={4} className="seller__sectionTitle">
                    Top sản phẩm bán chạy
                </Title>
                <Table
                    rowKey="product_id"
                    loading={loadingStats}
                    columns={topProductColumns}
                    dataSource={stats.top_products}
                    pagination={false}
                    locale={{ emptyText: "Chưa có sản phẩm nào phát sinh doanh thu" }}
                    scroll={{ x: 520 }}
                />
            </Card>

            <Card className="seller__card">
                <div className="seller__header">
                    <div>
                        <Title level={4} className="seller__sectionTitle">
                            Quản lý sản phẩm
                        </Title>
                        <Paragraph type="secondary" className="seller__subtitle">
                            Tạo mới, chỉnh sửa và cập nhật tồn kho cho sản phẩm của shop.
                        </Paragraph>
                    </div>
                    <Button onClick={resetForm} disabled={submitting || uploading}>
                        Tạo form mới
                    </Button>
                </div>

                <Form form={form} layout="vertical" initialValues={initialValues} onFinish={onFinish}>
                    <Form.Item
                        label="Danh mục"
                        name="category_id"
                        rules={[{ required: true, message: "Chọn danh mục" }]}
                    >
                        <Select options={categoryOptions} placeholder="Chọn danh mục" />
                    </Form.Item>

                    <Form.Item
                        label="Tên sản phẩm"
                        name="name"
                        rules={[{ required: true, message: "Nhập tên sản phẩm" }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Giá (VND)"
                        name="price"
                        rules={[{ required: true, message: "Nhập giá" }]}
                    >
                        <InputNumber min={1} style={{ width: "100%" }} />
                    </Form.Item>

                    <Form.Item label="Số lượng" name="stock">
                        <InputNumber min={0} style={{ width: "100%" }} />
                    </Form.Item>

                    <Form.Item label="Ảnh sản phẩm">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;

                                try {
                                    const url = await uploadImage(file);
                                    form.setFieldsValue({ image_url: url });
                                    message.success("Upload ảnh thành công");
                                } catch (err) {
                                    message.error(err?.response?.data?.message || "Upload ảnh thất bại");
                                } finally {
                                    e.target.value = "";
                                }
                            }}
                        />
                    </Form.Item>

                    <Form.Item label="Image URL" name="image_url">
                        <Input placeholder="http://..." />
                    </Form.Item>

                    <Form.Item label="Mô tả" name="description">
                        <Input.TextArea rows={4} />
                    </Form.Item>

                    <Space wrap>
                        <Button type="primary" htmlType="submit" loading={submitting}>
                            {editingProduct ? "Lưu chỉnh sửa" : "Tạo sản phẩm"}
                        </Button>
                        {editingProduct ? (
                            <Button onClick={resetForm} disabled={submitting}>
                                Hủy sửa
                            </Button>
                        ) : null}
                    </Space>
                </Form>
            </Card>

            <Card className="seller__card seller__tableCard">
                <Title level={4} className="seller__sectionTitle">
                    Sản phẩm của bạn
                </Title>

                <Table
                    rowKey="id"
                    loading={loadingProducts}
                    columns={productColumns}
                    dataSource={products}
                    pagination={{ pageSize: 5 }}
                    locale={{ emptyText: "Bạn chưa có sản phẩm nào" }}
                    scroll={{ x: 760 }}
                />
            </Card>
        </div>
    );
}
