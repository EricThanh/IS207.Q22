import { Button, Card, Form, Input, Radio, Typography, message } from "antd";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";
import "./Register.css";

const { Title, Text } = Typography;

export default function Register() {
    const nav = useNavigate();
    const [form] = Form.useForm();

    async function onFinish(values) {
        try {
            await authApi.register(values);
            message.success("Đăng ký thành công. Mời đăng nhập!");
            nav("/login");
        } catch (e) {
            message.error(e?.response?.data?.message || "Đăng ký thất bại");
        }
    }

    const role = Form.useWatch("role", form);

    return (
        <div className="auth">
            <Card className="auth__card">
                <Title level={3} className="auth__title">
                    Đăng ký
                </Title>

                <Form
                    form={form}
                    layout="vertical"
                    initialValues={{ role: "buyer" }}
                    onFinish={onFinish}
                >
                    <Form.Item label="Bạn là" name="role">
                        <Radio.Group>
                            <Radio value="buyer">Người mua</Radio>
                            <Radio value="seller">Người bán</Radio>
                        </Radio.Group>
                    </Form.Item>

                    <Form.Item
                        label="Họ tên"
                        name="full_name"
                        rules={[{ required: true, message: "Nhập họ tên" }]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Email"
                        name="email"
                        rules={[
                            { required: true, message: "Nhập email" },
                            { type: "email", message: "Email không hợp lệ" },
                        ]}
                    >
                        <Input />
                    </Form.Item>

                    <Form.Item label="Số điện thoại" name="phone">
                        <Input />
                    </Form.Item>

                    <Form.Item
                        label="Mật khẩu"
                        name="password"
                        rules={[
                            { required: true, message: "Nhập mật khẩu" },
                            { min: 6, message: "Tối thiểu 6 ký tự" },
                        ]}
                    >
                        <Input.Password />
                    </Form.Item>

                    {/* Thông tin người bán */}
                    {role === "seller" && (
                        <>
                            <Form.Item
                                label="Tên shop"
                                name="shop_name"
                                rules={[{ required: true, message: "Người bán cần tên shop" }]}
                            >
                                <Input />
                            </Form.Item>

                            <Form.Item label="Địa chỉ shop" name="shop_address">
                                <Input />
                            </Form.Item>
                        </>
                    )}

                    <Button type="primary" htmlType="submit" block>
                        Đăng ký
                    </Button>
                </Form>

                <div className="auth__footer">
                    <Text type="secondary">
                        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
                    </Text>
                </div>
            </Card>
        </div>
    );
}