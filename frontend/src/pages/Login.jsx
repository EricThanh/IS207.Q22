import { Button, Card, Form, Input, Typography, message } from "antd";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../api/authApi";
import { useAuth } from "../store/AuthContext";
import "./Login.css";

const { Title, Text } = Typography;

export default function Login() {
    const nav = useNavigate();
    const location = useLocation();
    const { loginSuccess } = useAuth();

    const from = location.state?.from?.pathname || "/";

    async function onFinish(values) {
        try {
            const res = await authApi.login(values);
            const { token, user } = res.data.data;
            loginSuccess(token, user);
            message.success("Đăng nhập thành công");
            nav(from, { replace: true });
        } catch (e) {
            message.error(e?.response?.data?.message || "Đăng nhập thất bại");
        }
    }

    return (
        <div className="auth">
            <Card className="auth__card">
                <Title level={3} className="auth__title">
                    Đăng nhập
                </Title>

                <Form layout="vertical" onFinish={onFinish}>
                    <Form.Item
                        label="Email"
                        name="email"
                        rules={[
                            { required: true, message: "Nhập email" },
                            { type: "email", message: "Email không hợp lệ" },
                        ]}
                    >
                        <Input placeholder="you@example.com" />
                    </Form.Item>

                    <Form.Item
                        label="Mật khẩu"
                        name="password"
                        rules={[{ required: true, message: "Nhập mật khẩu" }]}
                    >
                        <Input.Password placeholder="••••••••" />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" block>
                        Đăng nhập
                    </Button>
                </Form>

                <div className="auth__footer">
                    <Text type="secondary">
                        Chưa có tài khoản? <Link to="/register">Đăng ký</Link>
                    </Text>
                </div>
            </Card>
        </div>
    );
}