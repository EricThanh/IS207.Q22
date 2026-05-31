import { useState } from "react";
import { Badge, Layout } from "antd";
import {
  SearchOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { Link, Route, Routes, useNavigate } from "react-router-dom";
import Home from "./pages/Home";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { useAuth } from "./store/AuthContext";
import { useCart } from "./store/CartContext";
import "./App.css";
import RequireRole from "./routes/RequireRole";
import SellerAddProduct from "./pages/SellerAddProduct";
import FooterBar from "./components/FooterBar";
import BuyerOrders from "./pages/BuyerOrders";

const { Header, Content } = Layout;

export default function App() {
  const { user, isLoggedIn, logout } = useAuth();
  const { totalQty } = useCart();
  const navigate = useNavigate();
  const [headerSearch, setHeaderSearch] = useState("");

  function handleHeaderSearch(event) {
    event.preventDefault();

    const keyword = headerSearch.trim();
    navigate(keyword ? `/?search=${encodeURIComponent(keyword)}` : "/");
  }

  function handleUserClick() {
    if (isLoggedIn) {
      logout();
      return;
    }

    navigate("/login");
  }

  return (
    <Layout className="app">
      <Header className="app__header">
        <div className="app__headerInner">
          <Link to="/" className="app__brand">
            <span className="app__brandMark">🌸</span>
            <strong className="app__brandName">Blossom Shop</strong>
          </Link>

          <nav className="app__nav" aria-label="Main navigation">
            <Link to="/" className="app__navLink">
              Trang chủ
            </Link>
            {isLoggedIn && user?.role === "buyer" && (
              <Link to="/my-orders" className="app__navLink">
                Đơn hàng
              </Link>
            )}
            {isLoggedIn && user?.role === "seller" && (
              <Link to="/seller/products/new" className="app__navLink">
                Kênh bán hàng
              </Link>
            )}
          </nav>

          <div className="app__actions">
            <form className="app__search" onSubmit={handleHeaderSearch}>
              <SearchOutlined className="app__searchIcon" />
              <input
                className="app__searchInput"
                type="search"
                placeholder="Search flowers..."
                value={headerSearch}
                onChange={(event) => setHeaderSearch(event.target.value)}
              />
            </form>

            <button
              type="button"
              className={`app__iconButton ${
                isLoggedIn ? "app__iconButton--user" : ""
              }`}
              onClick={handleUserClick}
              title={isLoggedIn ? "Đăng xuất" : "Đăng nhập"}
            >
              <UserOutlined />
              {isLoggedIn && (
                <span className="app__userName">{user?.full_name || "User"}</span>
              )}
            </button>

            <button
              type="button"
              className="app__iconButton app__cartButton"
              onClick={() => navigate("/cart")}
              title="Giỏ hàng"
            >
              <Badge count={totalQty} size="small" offset={[3, -4]}>
                <ShoppingCartOutlined className="app__cartIcon" />
              </Badge>
            </button>
          </div>
        </div>
      </Header>

      <Content className="app__content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route
            path="/my-orders"
            element={
              <RequireRole role="buyer">
                <BuyerOrders />
              </RequireRole>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/seller/products/new"
            element={
              <RequireRole role="seller">
                <SellerAddProduct />
              </RequireRole>
            }
          />
        </Routes>
      </Content>
      <FooterBar />
    </Layout>
  );
}
