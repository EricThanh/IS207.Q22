import { Button, Card, Form, Input, InputNumber, Select, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { catalogApi } from "../api/catalogApi";
import { axiosClient } from "../api/axiosClient";
import "./SellerAddProduct.css";


const { Title } = Typography;

function slugify(str) {
    return (str || "")
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

export default function SellerAddProduct() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const [uploading, setUploading] = useState(false);

    const categoryOptions = useMemo(
        () => categories.map((c) => ({ value: c.id, label: c.name })),
        [categories]
    );

    useEffect(() => {
        (async () => {
            const res = await catalogApi.getCategories();
            setCategories(res.data.data || []);
        })();
    }, []);

    async function onFinish(values) {
        setLoading(true);
        try {
            const payload = {
                ...values,
                slug: slugify(values.name), 
            };

            await axiosClient.post("/api/seller/products", payload);

            message.success("Tạo sản phẩm thành công");
            form.resetFields();
        } catch (e) {
            message.error(e?.response?.data?.message || "Tạo sản phẩm thất bại");
        } finally {
            setLoading(false);
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

    return (
        <div className="seller">
            <Card className="seller__card">
                <Title level={3} className="seller__title">Người bán - Thêm sản phẩm</Title>

                <Form form={form} layout="vertical" onFinish={onFinish}>
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
                        <Input
                            onChange={(e) => {
                                const name = e.target.value;
                                form.setFieldsValue({ slug: slugify(name) });
                            }}
                        />
                    </Form.Item>



                    <Form.Item
                        label="Giá (VND)"
                        name="price"
                        rules={[{ required: true, message: "Nhập giá" }]}
                    >
                        <InputNumber min={1} style={{ width: "100%" }} />
                    </Form.Item>

                    <Form.Item label="Số lượng" name="stock" initialValue={0}>
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
                                }
                            }}
                        />
                    </Form.Item>

                    <Form.Item label="Image URL (tự điền sau upload)" name="image_url" hidden>
                        <Input readOnly />
                    </Form.Item>

                    <Form.Item label="Mô tả" name="description">
                        <Input.TextArea rows={4} />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" loading={loading} block>
                        Tạo sản phẩm
                    </Button>
                </Form>
            </Card>
        </div>
    );
}