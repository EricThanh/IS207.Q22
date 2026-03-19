import { Layout, Menu } from "antd";
import { Link, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { useAuth } from "./store/AuthContext";
import "./App.css";

const { Header, Content } = Layout;

export default function App() {
  const { user, isLoggedIn, logout } = useAuth();

  return (
    <Layout className="app">
      <Header className="app__header">
        <Menu className="app__menu" theme="dark" mode="horizontal" selectable={false}>
          <Menu.Item key="home"><Link to="/">Trang chủ</Link></Menu.Item>
          <Menu.Item key="cart"><Link to="/cart">Giỏ hàng</Link></Menu.Item>

          <Menu.Item key="spacer" className="menu__spacer" disabled />

          {isLoggedIn ? (
            <>
              <Menu.Item key="hello" className="menu__hello">
                Xin chào, {user?.full_name}
              </Menu.Item>
              <Menu.Item key="logout" onClick={logout} className="menu__logout">Đăng xuất</Menu.Item>
            </>
          ) : (
            <>
              <Menu.Item key="login"><Link to="/login">Đăng nhập</Link></Menu.Item>
              <Menu.Item key="register"><Link to="/register">Đăng ký</Link></Menu.Item>
            </>
          )}
        </Menu>
      </Header>

      <Content className="app__content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </Content>
    </Layout>
  );
}