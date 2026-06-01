import { useEffect, useMemo, useState } from "react";
import { InputNumber, Select, Spin, message } from "antd";
import { FilterOutlined, ShoppingCartOutlined } from "@ant-design/icons";
import { Link, useSearchParams } from "react-router-dom";
import { catalogApi } from "../api/catalogApi";
import { useCart } from "../store/CartContext";
import hoaHongImg from "../images/hoahong.png";
import "./Shop.css";

function formatVnd(value) {
  return Number(value || 0).toLocaleString("vi-VN") + " đ";
}

export default function Shop() {
  const [searchParams] = useSearchParams();
  const { addItem } = useCart();

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [categoryId, setCategoryId] = useState(0);
  const [search, setSearch] = useState("");
  const [minPrice, setMinPrice] = useState(null);
  const [maxPrice, setMaxPrice] = useState(null);
  const [sortBy, setSortBy] = useState("featured");
  const [loading, setLoading] = useState(false);

  // Load categories from API
  async function loadCategories() {
    try {
      const res = await catalogApi.getCategories();
      setCategories(res.data.data || []);
    } catch {
      message.error("Không tải được danh mục hoa");
    }
  }

  // Load products based on current search/filters
  async function loadProducts(next = {}) {
    const nextCategoryId = next.categoryId !== undefined ? next.categoryId : categoryId;
    const nextSearch = next.search !== undefined ? next.search : search;
    const nextMinPrice = next.minPrice !== undefined ? next.minPrice : minPrice;
    const nextMaxPrice = next.maxPrice !== undefined ? next.maxPrice : maxPrice;

    setLoading(true);
    try {
      const res = await catalogApi.getProducts({
        category_id: nextCategoryId > 0 ? nextCategoryId : undefined,
        search: nextSearch && nextSearch.trim() !== "" ? nextSearch : undefined,
        min_price: nextMinPrice && nextMinPrice > 0 ? nextMinPrice : undefined,
        max_price: nextMaxPrice && nextMaxPrice > 0 ? nextMaxPrice : undefined,
      });
      setProducts(res.data.data || []);
    } catch {
      message.error("Không tải được sản phẩm");
    } finally {
      setLoading(false);
    }
  }

  // Read search term from URL query parameter
  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    const keyword = searchParams.get("search") || "";
    setSearch(keyword);
    setCategoryId(0);
    loadProducts({
      categoryId: 0,
      search: keyword,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // handle Category filter change
  function handleCategoryClick(id) {
    setCategoryId(id);
    loadProducts({ categoryId: id });
  }

  // handle Apply Price filter
  function handleApplyFilters() {
    if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
      message.warning("Giá tối thiểu không được lớn hơn giá tối đa!");
      return;
    }
    loadProducts();
  }

  // handle Clear Price filter
  function handleClearFilters() {
    setMinPrice(null);
    setMaxPrice(null);
    loadProducts({ minPrice: null, maxPrice: null });
  }

  // Handle add to cart click
  function handleAddToCart(e, product) {
    e.preventDefault();
    e.stopPropagation();

    if (Number(product.stock) <= 0) {
      message.warning("Sản phẩm đã hết hàng!");
      return;
    }

    addItem({
      id: product.id,
      seller_id: product.seller_id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
      stock: product.stock,
    }, 1);

    message.success(`Đã thêm ${product.name} vào giỏ hàng`);
  }

  // Memoized filter and sort on client side
  const filteredProducts = useMemo(() => {
    let result = [...products];

    // Double check minPrice / maxPrice locally
    const normalizedMin = Number(minPrice) || 0;
    const normalizedMax = Number(maxPrice) || 0;

    if (normalizedMin > 0) {
      result = result.filter((p) => Number(p.price) >= normalizedMin);
    }
    if (normalizedMax > 0) {
      result = result.filter((p) => Number(p.price) <= normalizedMax);
    }

    // Sort
    if (sortBy === "price_asc") {
      result.sort((a, b) => Number(a.price) - Number(b.price));
    } else if (sortBy === "price_desc") {
      result.sort((a, b) => Number(b.price) - Number(a.price));
    } else if (sortBy === "newest") {
      result.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });
    }

    return result;
  }, [products, minPrice, maxPrice, sortBy]);

  return (
    <div className="shop">
      <div className="shop__container">
        <h1 className="shop__title">Hoa của chúng tôi</h1>
        <p className="shop__subtitle">
          Khám phá bộ sưu tập hoa
        </p>

        <div className="shop__layout">
          {/* SIDEBAR LEFT */}
          <aside className="shop__sidebar">
            <div className="shop__filterHeader">
              <FilterOutlined className="shop__filterIcon" />
              <span>Filters</span>
            </div>

            {/* Category Filter */}
            <div className="shop__filterSection">
              <h3 className="shop__filterLabel">Category</h3>
              <div className="shop__categoryList">
                <button
                  type="button"
                  className={`shop__categoryBtn ${
                    categoryId === 0 ? "shop__categoryBtn--active" : ""
                  }`}
                  onClick={() => handleCategoryClick(0)}
                >
                  Tất cả
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`shop__categoryBtn ${
                      Number(categoryId) === Number(cat.id)
                        ? "shop__categoryBtn--active"
                        : ""
                    }`}
                    onClick={() => handleCategoryClick(cat.id)}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="shop__filterSection">
              <h3 className="shop__filterLabel">Khoảng giá</h3>
              <div className="shop__sliderLabels">
                <span>0 đ</span>
                <span>{formatVnd(maxPrice || 2000000)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2000000"
                step="50000"
                value={maxPrice || 2000000}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="shop__priceSlider"
              />

              <div className="shop__priceInputs">
                <InputNumber
                  className="shop__priceInput"
                  min={0}
                  max={2000000}
                  step={50000}
                  placeholder="Từ"
                  value={minPrice}
                  formatter={(value) =>
                    value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""
                  }
                  parser={(value) => Number(value?.replace(/\./g, "") || 0)}
                  onChange={(val) => setMinPrice(val)}
                />
                <span className="shop__priceSeparator">-</span>
                <InputNumber
                  className="shop__priceInput"
                  min={0}
                  max={2000000}
                  step={50000}
                  placeholder="Đến"
                  value={maxPrice}
                  formatter={(value) =>
                    value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".") : ""
                  }
                  parser={(value) => Number(value?.replace(/\./g, "") || 0)}
                  onChange={(val) => setMaxPrice(val)}
                />
              </div>

              {/* <button
                type="button"
                className="shop__applyBtn"
                onClick={handleApplyFilters}
              >
                Áp dụng
              </button>
              <button
                type="button"
                className="shop__clearBtn"
                onClick={handleClearFilters}
              >
                Xóa lọc
              </button> */}
            </div>

            {/* Sort Filter */}
            <div className="shop__filterSection">
              <h3 className="shop__filterLabel">Sắp xếp</h3>
              <Select
                className="shop__sortSelect"
                style={{ width: "100%" }}
                value={sortBy}
                onChange={(val) => setSortBy(val)}
                options={[
                  { value: "featured", label: "Nổi bật" },
                  { value: "price_asc", label: "Giá: Thấp → Cao" },
                  { value: "price_desc", label: "Giá: Cao → Thấp" },
                  { value: "newest", label: "Mới nhất" },
                ]}
              />
            </div>
          </aside>

          {/* PRODUCT GRID RIGHT */}
          <main className="shop__content">
            <div className="shop__resultCount">
              Đang hiển thị {filteredProducts.length} sản phẩm
            </div>

            {loading ? (
              <div className="shop__loading">
                <Spin size="large" />
                <p>Đang tải sản phẩm...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="shop__empty">
                <p>Không tìm thấy sản phẩm nào khớp với bộ lọc.</p>
              </div>
            ) : (
              <div className="shop__grid">
                {filteredProducts.map((product) => {
                  const hasDiscount = Number(product.discount_percent) > 0;
                  const hasStock = Number(product.stock) > 0;

                  // original price calculation
                  const calculatedOriginalPrice = hasDiscount
                    ? Math.round(product.price / (1 - product.discount_percent / 100))
                    : product.price;

                  return (
                    <Link
                      key={product.id}
                      to={`/product/${product.id}`}
                      className="shop__productCardLink"
                    >
                      <div className="shop__productCard">
                        <div className="shop__cardImgWrap">
                          {hasDiscount && (
                            <span className="shop__discountBadge">
                              –{product.discount_percent}%
                            </span>
                          )}
                          <img
                            src={product.image_url || hoaHongImg}
                            alt={product.name}
                            className="shop__cardImg"
                            onError={(e) => {
                              e.currentTarget.src = hoaHongImg;
                            }}
                          />
                        </div>

                        <div className="shop__cardBody">
                          <h4 className="shop__productName" title={product.name}>
                            {product.name}
                          </h4>
                          <p className="shop__productDesc">
                            {product.description || "Sản phẩm chưa có mô tả."}
                          </p>

                          <div className="shop__priceStockRow">
                            <div className="shop__priceBlock">
                              <span className="shop__currentPrice">
                                {formatVnd(product.price)}
                              </span>
                              {hasDiscount && (
                                <span className="shop__originalPrice">
                                  {formatVnd(calculatedOriginalPrice)}
                                </span>
                              )}
                            </div>

                            <span
                              className={`shop__stockPill ${
                                hasStock
                                  ? "shop__stockPill--in"
                                  : "shop__stockPill--out"
                              }`}
                            >
                              {hasStock ? "Còn hàng" : "Hết hàng"}
                            </span>
                          </div>

                          <div className="shop__cardActions">
                            <span className="shop__detailBtn">Xem chi tiết</span>
                            <button
                              type="button"
                              className="shop__cartBtn"
                              onClick={(e) => handleAddToCart(e, product)}
                              title="Thêm vào giỏ hàng"
                            >
                              <ShoppingCartOutlined />
                            </button>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
