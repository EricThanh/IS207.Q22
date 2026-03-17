import { Layout, Menu } from "antd";
import { Link, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import ProductDetail from "./pages/ProductDetail";
import "./App.css";

const { Header, Content } = Layout;

function Cart() {
  return <div className="app__page">Cart - Giỏ hàng</div>;
}

export default function App() {
  return (
    <Layout className="app">
      <Header className="app__header">
        <Menu className="app__menu" theme="dark" mode="horizontal" selectable={false}>
          <Menu.Item key="home">
            <Link to="/">Trang chủ</Link>
          </Menu.Item>

          <Menu.Item key="cart">
            <Link to="/cart">Giỏ hàng</Link>
          </Menu.Item>
        </Menu>
      </Header>

      <Content className="app__content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
        </Routes>
      </Content>
    </Layout>
  );
}