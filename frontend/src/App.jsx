import { Badge, Button, Layout } from "antd";
import { ShoppingCartOutlined, ShopOutlined } from "@ant-design/icons";
import { Link, Route, Routes } from "react-router-dom";
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

  return (
    <Layout className="app">
      <Header className="app__header">
        <div className="app__headerInner">
          <Link to="/" className="app__brand">
            <span className="app__brandMark">F</span>
            <div className="app__brandText">
              <strong>Flower Shop</strong>
              <span>Hoa dep cho moi dip dac biet</span>
            </div>
          </Link>

          <nav className="app__nav">
            <Link to="/" className="app__navLink">Trang chủ</Link>
            <Link to="/cart" className="app__navLink app__navLink--cart">
              <Badge count={totalQty} size="small" offset={[2, -2]}>
                <span className="app__cartIconWrap">
                  <ShoppingCartOutlined className="app__cartIcon" />
                </span>
              </Badge>
              <span>Giỏ hàng</span>
            </Link>
            {isLoggedIn && user?.role === "buyer" && (
              <Link to="/my-orders" className="app__navLink">Đơn hàng</Link>
            )}
            {isLoggedIn && user?.role === "seller" && (
              <Link to="/seller/products/new" className="app__navLink">
                <ShopOutlined />
                <span>Kenh nguoi ban</span>
              </Link>
            )}
          </nav>

          <div className="app__actions">
            {isLoggedIn ? (
              <>
                <div className="app__userPill">
                  <span className="app__userLabel">Xin chào</span>
                  <strong>{user?.full_name}</strong>
                </div>
                <Button className="app__ghostBtn" onClick={logout}>
                  Đăng xuất
                </Button>
              </>
            ) : (
              <>
                <Link to="/login">
                  <Button className="app__ghostBtn">Đăng nhập</Button>
                </Link>
                <Link to="/register">
                  <Button type="primary" className="app__primaryBtn">Đăng ký</Button>
                </Link>
              </>
            )}
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
