"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AppWindow, BadgePercent, BarChart3, Bell, Boxes, ChevronDown,
  CircleDollarSign, FileText, Globe, Landmark, LayoutDashboard,
  LogOut, Megaphone, Menu, Minus, Monitor, MoreHorizontal, Package, Plus,
  ReceiptText, Search, Settings, ShoppingBag, Store, Tags, TrendingUp, Users,
  WalletCards, X
} from "lucide-react";
import { categories as fallbackCategoryNames, categoryDetails, categoryToSlug, products as initialProducts, slugifyCategory } from "../data/store";
import { DEFAULT_STORE_SETTINGS } from "../data/storeSettings";
import { apparelSizes, fashionColors } from "../data/variantOptions";

const fallbackCategoryRecords = fallbackCategoryNames
  .filter((category) => category !== "All")
  .map((name, index) => {
    const slug = categoryToSlug(name);
    return {
      id: slug,
      name,
      slug,
      description: categoryDetails[slug]?.description || "",
      image: categoryDetails[slug]?.image || "/bustaniya-campaign-hero-v4.png",
      parentSlug: "",
      status: "Active",
      sortOrder: (index + 1) * 10,
    };
  });

const demoOrders = [
  { id: "#BST-1048", customer: "Ayesha Khan", city: "Lahore", total: 8490, status: "Processing", date: "Today, 11:42 AM", createdAt: "2026-07-08T11:42:00+05:00" },
  { id: "#BST-1047", customer: "Hira Ali", city: "Karachi", total: 12990, status: "Confirmed", date: "Today, 10:18 AM", createdAt: "2026-07-08T10:18:00+05:00" },
  { id: "#BST-1046", customer: "Mahnoor Shah", city: "Islamabad", total: 4490, status: "Delivered", date: "Yesterday", createdAt: "2026-07-07T15:20:00+05:00" },
  { id: "#BST-1045", customer: "Zoya Ahmed", city: "Faisalabad", total: 10980, status: "Processing", date: "Yesterday", createdAt: "2026-07-07T12:05:00+05:00" },
  { id: "#BST-1044", customer: "Sana Raza", city: "Rawalpindi", total: 6990, status: "Cancelled", date: "4 Jul 2026", createdAt: "2026-07-04T17:10:00+05:00" }
];

const navItems = [
  { name: "Dashboard", icon: LayoutDashboard, section: "OVERVIEW" },
  { name: "Orders", icon: ShoppingBag, count: 8, section: "COMMERCE" },
  { name: "Products", icon: Package, section: "COMMERCE" },
  { name: "Categories", icon: Tags, section: "COMMERCE" },
  { name: "Inventory", icon: Boxes, section: "COMMERCE" },
  { name: "Customers", icon: Users, section: "COMMERCE" },
  { name: "Gift cards", icon: Tags, section: "COMMERCE" },
  { name: "Analytics", icon: BarChart3, section: "GROWTH" },
  { name: "Marketing", icon: Megaphone, section: "GROWTH" },
  { name: "Discounts", icon: BadgePercent, section: "GROWTH" },
  { name: "Content", icon: FileText, section: "GROWTH" },
  { name: "Online Store", icon: Monitor, section: "SALES CHANNELS" },
  { name: "Markets", icon: Globe, section: "SALES CHANNELS" },
  { name: "Finances", icon: Landmark, section: "OPERATIONS" },
  { name: "Apps", icon: AppWindow, section: "OPERATIONS" },
  { name: "Settings", icon: Settings, section: "OPERATIONS" }
];

const navPermissionMap = {
  Dashboard: "dashboard",
  Orders: "orders",
  Products: "products",
  Categories: "products",
  Inventory: "inventory",
  Customers: "customers",
  "Gift cards": "products",
  Analytics: "dashboard",
  Marketing: "settings",
  Discounts: "products",
  Content: "settings",
  "Online Store": "settings",
  Markets: "settings",
  Finances: "dashboard",
  Apps: "settings",
  Settings: "settings",
};

function canUseAdminArea(user, area) {
  if (!area) return true;
  if (!user) return true;
  if (user.role === "Owner") return true;
  return Array.isArray(user.permissions) && user.permissions.includes(area);
}

export default function AdminDashboard() {
  const [active, setActive] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedSizes, setSelectedSizes] = useState(["S", "M", "L"]);
  const [selectedColors, setSelectedColors] = useState(["Pink"]);
  const [productCategory, setProductCategory] = useState("Kurtis");
  const [sizeSearch, setSizeSearch] = useState("");
  const [colorSearch, setColorSearch] = useState("");
  const [productMedia, setProductMedia] = useState([]);
  const [productImageUrl, setProductImageUrl] = useState("");
  const [mediaError, setMediaError] = useState("");
  const [costBreakdown, setCostBreakdown] = useState({ fabric: 0, stitching: 0, embellishment: 0, packaging: 0, other: 0 });
  const [productSaving, setProductSaving] = useState(false);
  const [workspace, setWorkspace] = useState(null);
  const [activity, setActivity] = useState([]);
  const [products, setProducts] = useState(() => initialProducts.map((p, index) => ({
    ...p,
    stock: [12, 7, 3, 18, 5, 9, 4, 11, 2, 14, 8, 6][index] ?? 10,
  })));
  const [adminReady, setAdminReady] = useState(false);
  const [orders, setOrders] = useState(demoOrders);
  const [ordersKey, setOrdersKey] = useState("open-admin");
  const [ordersConnected, setOrdersConnected] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [inventoryMovements, setInventoryMovements] = useState([]);
  const [catalogCategories, setCatalogCategories] = useState(fallbackCategoryRecords);
  const [categorySetupNeeded, setCategorySetupNeeded] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [currentAdminUser, setCurrentAdminUser] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    orders: 0,
    customers: 0,
    products: 0,
    lowStock: 0,
  });

  useEffect(() => {
    const saved = localStorage.getItem("bustaniya-admin-products");
    if (saved) {
      try { setProducts(JSON.parse(saved)); } catch {}
    }
    setAdminReady(true);
    fetch("/api/admin/me")
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (result?.user) setCurrentAdminUser(result.user);
      })
      .catch(() => {});
    const savedOrdersKey = sessionStorage.getItem("bustaniya-orders-key") || "open-admin";
    setOrdersKey(savedOrdersKey);
    loadOrders(savedOrdersKey);
  }, []);

  useEffect(() => {
    if (adminReady) localStorage.setItem("bustaniya-admin-products", JSON.stringify(products));
  }, [products, adminReady]);

  const filteredProducts = useMemo(() => products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  ), [products, search]);

  function openNewProductForm() {
    setEditingProduct(null);
    setProductCategory("Kurtis");
    setSelectedSizes(["S", "M", "L"]);
    setSelectedColors(["Pink"]);
    setProductMedia([]);
    setProductImageUrl("");
    setMediaError("");
    setCostBreakdown({ fabric: 0, stitching: 0, embellishment: 0, packaging: 0, other: 0 });
    setShowProductForm(true);
  }

  function openEditProductForm(product) {
    setEditingProduct(product);
    setProductCategory(product.category || "Kurtis");
    setSelectedSizes(Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ["S", "M", "L"]);
    setSelectedColors(Array.isArray(product.colors) && product.colors.length ? product.colors : ["Pink"]);
    setProductMedia((product.images || [product.image]).filter(Boolean).map((src, index) => ({
      id: `existing-${product.id}-${index}`,
      name: `Product image ${index + 1}`,
      src,
    })));
    setProductImageUrl("");
    setMediaError("");
    setCostBreakdown({ fabric: 0, stitching: 0, embellishment: 0, packaging: 0, other: 0, ...(product.costBreakdown || {}) });
    setShowProductForm(true);
  }

  async function loadOrders(key = ordersKey) {
    if (!key) return;
    setOrdersLoading(true);
    setOrdersError("");
    try {
      const response = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "x-admin-access-key": key },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load orders.");
      const formatted = (result.orders || []).map((order) => ({
        rawId: order.id,
        raw: order,
        id: `#${order.order_number}`,
        customer: order.shipping_full_name || order.guest_name || "Guest",
        city: order.shipping_city || "—",
        total: Number(order.total_pkr || 0),
        status: formatOrderStatus(order.courier_status || order.status || "pending"),
        postexStatus: formatOrderStatus(order.courier_status || order.status || "pending"),
        paymentStatus: order.payment_status || (order.payment_method === "bank_deposit" ? "Verification due" : "COD pending"),
        fulfillmentStatus: order.fulfillment_status || (order.courier_tracking_number ? "Booked with PostEx" : "Unfulfilled"),
        tracking: order.courier_tracking_number || "",
        phone: order.shipping_phone || order.guest_phone || "",
        address: [order.shipping_address, order.shipping_city, order.shipping_postal_code].filter(Boolean).join(", "),
        items: Array.isArray(order.items) ? order.items : [],
        notes: order.internal_notes || "",
        tags: Array.isArray(order.tags) ? order.tags : [],
        risk: order.risk || "Standard COD",
        createdAt: order.created_at,
        date: new Date(order.created_at).toLocaleString("en-PK", {
          day: "numeric",
          month: "short",
          hour: "numeric",
          minute: "2-digit",
        }),
      }));
      setOrders(formatted);
      setOrdersConnected(true);
      sessionStorage.setItem("bustaniya-orders-key", key);
      try {
        await loadAdminData(key);
      } catch (adminDataError) {
        setOrdersError(`Orders connected, but store dashboard data could not load: ${adminDataError.message}`);
      }
    } catch (loadError) {
      setOrdersConnected(false);
      setOrdersError(loadError.message);
    } finally {
      setOrdersLoading(false);
    }
  }

  async function loadAdminData(key = ordersKey) {
    if (!key) return;
    setCatalogLoading(true);
    try {
      const headers = { "x-admin-access-key": key };
      const [catalogResponse, dashboardResponse, categoriesResponse] = await Promise.all([
        fetch("/api/admin/catalog", { method: "POST", headers }),
        fetch("/api/admin/dashboard", { method: "POST", headers }),
        fetch("/api/admin/categories", { method: "POST", headers }),
      ]);
      const catalog = await catalogResponse.json();
      const dashboard = await dashboardResponse.json();
      const categories = await categoriesResponse.json();
      if (!catalogResponse.ok) throw new Error(catalog.error || "Unable to load catalogue.");
      if (!dashboardResponse.ok) throw new Error(dashboard.error || "Unable to load dashboard.");
      if (!categoriesResponse.ok) throw new Error(categories.error || "Unable to load categories.");
      setProducts(catalog.products || []);
      setInventoryMovements(catalog.movements || []);
      setCatalogCategories(categories.categories || fallbackCategoryRecords);
      setCategorySetupNeeded(Boolean(categories.needsSetup));
      setMetrics(dashboard.metrics || metrics);
    } finally {
      setCatalogLoading(false);
    }
  }

  async function addProduct(event) {
    event.preventDefault();
    if (productSaving) return;
    const form = new FormData(event.currentTarget);
    setProductSaving(true);
    setCatalogLoading(true);
    try {
      const mediaImages = await uploadProductMedia();
      const productPayload = {
        name: form.get("name"),
        description: form.get("description") || "",
        category: form.get("category"),
        subcategory: form.get("subcategory") || "",
        collection: form.get("collection") || "",
        price: Number(form.get("price")),
        compare_at_price: Number(form.get("comparePrice") || 0) || null,
        sku: form.get("sku"),
        sizes: selectedSizes,
        colors: selectedColors,
        variants: selectedSizes.flatMap((size) => selectedColors.map((color) => ({
          size,
          color,
          sku: `${form.get("sku") || "BST"}-${size}-${color}`.replace(/\s+/g, "-").toUpperCase(),
          stock: Math.max(0, Math.floor(Number(form.get("stock") || 0) / Math.max(1, selectedSizes.length * selectedColors.length))),
        }))),
        tags: String(form.get("tags") || "").split(",").map((tag) => tag.trim()).filter(Boolean),
        status: form.get("status") || "Active",
        images: mediaImages.length
          ? mediaImages
          : ["/bustaniya-campaign-hero-v4.png"],
        delivery_fee_mode: form.get("deliveryFeeMode") || "inherit",
        delivery_fee_pkr: form.get("deliveryFeeMode") === "paid"
          ? Number(form.get("deliveryFee") || 200)
          : null,
        cost_total_pkr: Object.values(costBreakdown).reduce((sum, value) => sum + Number(value || 0), 0),
        cost_breakdown: costBreakdown,
      };
      if (!editingProduct) {
        productPayload.is_new = true;
        productPayload.is_bestseller = false;
      }

      const response = await fetch("/api/admin/catalog", {
        method: editingProduct ? "PATCH" : "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-access-key": ordersKey,
        },
        body: JSON.stringify({
          ...(editingProduct ? { productId: editingProduct.id } : {}),
          product: productPayload,
          stock: Number(form.get("stock")),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save product.");
      await loadAdminData(ordersKey);
      setProductMedia([]);
      setMediaError("");
      setEditingProduct(null);
      setShowProductForm(false);
    } catch (saveError) {
      setOrdersError(saveError.message);
    } finally {
      setProductSaving(false);
      setCatalogLoading(false);
    }
  }

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      sessionStorage.removeItem("bustaniya-orders-key");
      window.location.href = "/admin";
    }
  }

  async function deleteProduct(product) {
    const confirmed = window.confirm(
      `Remove ${product.name}? If it has order history, it will be archived and hidden from the store.`
    );
    if (!confirmed) return;
    setCatalogLoading(true);
    setOrdersError("");
    try {
      const response = await fetch("/api/admin/catalog", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-access-key": ordersKey,
        },
        body: JSON.stringify({ productId: product.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to remove product.");
      setProducts((current) => current.filter((item) => item.id !== product.id));
      await loadAdminData(ordersKey);
      if (result.archived) {
        setOrdersError(`${product.name} was archived because it may be linked to existing records.`);
      }
    } catch (removeError) {
      setOrdersError(removeError.message);
    } finally {
      setCatalogLoading(false);
    }
  }

  function readImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
      reader.readAsDataURL(file);
    });
  }

  async function addProductFiles(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    setMediaError("");

    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    const oversized = imageFiles.find((file) => file.size > 10 * 1024 * 1024);
    if (imageFiles.length !== files.length) {
      setMediaError("Please upload image files only: PNG, JPG or WEBP.");
      return;
    }
    if (oversized) {
      setMediaError(`${oversized.name} is larger than 10MB.`);
      return;
    }
    if (productMedia.length + imageFiles.length > 8) {
      setMediaError("You can add up to 8 product photos.");
      return;
    }

    try {
      const items = await Promise.all(imageFiles.map(async (file) => ({
        id: `${file.name}-${file.lastModified}-${file.size}`,
        name: file.name,
        file,
        src: await readImageFile(file),
      })));
      setProductMedia((current) => [...current, ...items]);
    } catch (error) {
      setMediaError(error.message || "Unable to load these photos.");
    }
  }

  function addProductImageUrl() {
    const trimmedUrl = productImageUrl.trim();
    if (!trimmedUrl) {
      setMediaError("Paste a Cloudinary image link first.");
      return;
    }
    if (!/^https?:\/\//i.test(trimmedUrl) && !trimmedUrl.startsWith("/")) {
      setMediaError("Image URL must start with http://, https:// or /.");
      return;
    }
    if (!/\.(jpg|jpeg|png|webp|avif)(\?|$)/i.test(trimmedUrl) && !trimmedUrl.includes("res.cloudinary.com")) {
      setMediaError("Please use a direct image link, for example a Cloudinary image URL.");
      return;
    }
    if (productMedia.length >= 8) {
      setMediaError("You can add up to 8 product photos.");
      return;
    }
    setMediaError("");
    setProductImageUrl("");
    setProductMedia((current) => [
      ...current,
      { id: `url-${Date.now()}`, name: "Cloudinary image", src: trimmedUrl },
    ]);
  }

  function removeProductMedia(id) {
    setProductMedia((current) => current.filter((item) => item.id !== id));
  }

  async function uploadProductMedia() {
    if (!productMedia.length) return [];
    const form = new FormData();
    const uploadItems = productMedia.filter((item) => item.file);
    uploadItems.forEach((item) => form.append("files", item.file, item.name));
    if (!uploadItems.length) return productMedia.map((item) => item.src);

    const response = await fetch("/api/admin/uploads", {
      method: "POST",
      headers: { "x-admin-access-key": ordersKey },
      body: form,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Unable to upload product photos.");

    const uploadedUrls = [...(result.urls || [])];
    return productMedia.map((item) => item.file ? uploadedUrls.shift() : item.src).filter(Boolean);
  }

  function closeProductForm() {
    setShowProductForm(false);
    setEditingProduct(null);
    setProductCategory("Kurtis");
    setProductMedia([]);
    setProductImageUrl("");
    setMediaError("");
  }

  async function updateProductDelivery(product, mode) {
    if (!ordersKey) return;
    let fee = null;
    if (mode === "paid") {
      const entered = window.prompt(
        "Enter this product's COD delivery fee (PKR):",
        String(product.deliveryFee || 200)
      );
      if (entered === null) return;
      fee = Number(entered);
      if (!Number.isFinite(fee) || fee < 0) {
        setOrdersError("Please enter a valid delivery fee.");
        return;
      }
    }
    setCatalogLoading(true);
    try {
      const response = await fetch("/api/admin/catalog", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-access-key": ordersKey,
        },
        body: JSON.stringify({
          productId: product.id,
          product: {
            delivery_fee_mode: mode,
            delivery_fee_pkr: fee,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update delivery rule.");
      await loadAdminData(ordersKey);
    } catch (saveError) {
      setOrdersError(saveError.message);
    } finally {
      setCatalogLoading(false);
    }
  }

  async function adjustInventory(productId, change, reason) {
    const response = await fetch("/api/admin/catalog", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-admin-access-key": ordersKey,
      },
      body: JSON.stringify({ action: "adjust", productId, change, reason }),
    });
    const result = await response.json();
    if (!response.ok) {
      const error = new Error(result.error || "Unable to adjust inventory.");
      setOrdersError(error.message);
      throw error;
    }
    await loadAdminData(ordersKey);
  }

  async function createCustomInventory(item) {
    setCatalogLoading(true);
    try {
      const response = await fetch("/api/admin/catalog", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-access-key": ordersKey,
        },
        body: JSON.stringify({
          product: {
            name: item.name,
            description: "Custom inventory item",
            category: "Custom Inventory",
            price: 0,
            sku: item.sku,
            sizes: [],
            colors: [],
            images: ["/bustaniya-campaign-hero-v4.png"],
            is_new: false,
            is_bestseller: false,
            delivery_fee_mode: "inherit",
            delivery_fee_pkr: null,
          },
          stock: item.stock,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to add custom inventory.");
      await loadAdminData(ordersKey);
      return true;
    } catch (saveError) {
      setOrdersError(saveError.message);
      throw saveError;
    } finally {
      setCatalogLoading(false);
    }
  }

  async function saveCategory(payload) {
    setCategorySaving(true);
    setOrdersError("");
    try {
      const response = await fetch("/api/admin/categories", {
        method: payload.id ? "PATCH" : "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-admin-access-key": ordersKey,
        },
        body: JSON.stringify({
          ...(payload.id ? { categoryId: payload.id } : {}),
          category: payload,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save category.");
      if (result.needsSetup) {
        setCategorySetupNeeded(true);
        setCatalogCategories(result.categories || fallbackCategoryRecords);
        setOrdersError(`Run ${result.setupSql || "scripts/supabase-catalog-categories.sql"} in Supabase before saving live categories.`);
        return;
      }
      await loadAdminData(ordersKey);
    } catch (error) {
      setOrdersError(error.message);
    } finally {
      setCategorySaving(false);
    }
  }

  async function archiveCategory(category) {
    if (!window.confirm(`Archive ${category.name}? Products will stay in the catalogue, but this category can be hidden from storefront navigation.`)) return;
    setCategorySaving(true);
    setOrdersError("");
    try {
      const response = await fetch("/api/admin/categories", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          "x-admin-access-key": ordersKey,
        },
        body: JSON.stringify({ categoryId: category.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to archive category.");
      if (result.needsSetup) {
        setCategorySetupNeeded(true);
        setOrdersError(`Run ${result.setupSql || "scripts/supabase-catalog-categories.sql"} in Supabase before archiving categories.`);
        return;
      }
      await loadAdminData(ordersKey);
    } catch (error) {
      setOrdersError(error.message);
    } finally {
      setCategorySaving(false);
    }
  }

  const visibleNavItems = navItems.filter((item) =>
    canUseAdminArea(currentAdminUser, navPermissionMap[item.name])
  );
  const canAccessActive = canUseAdminArea(currentAdminUser, navPermissionMap[active]);
  const mainCategoryOptions = catalogCategories.filter((category) => !category.parentSlug && category.status !== "Archived");
  const activeCategoryRecord = mainCategoryOptions.find((category) => category.name === productCategory) || mainCategoryOptions[0];
  const productSubcategoryOptions = activeCategoryRecord
    ? catalogCategories.filter((category) => category.parentSlug === activeCategoryRecord.slug && category.status !== "Archived")
    : [];

  return (
    <main className="adminShell">
      <aside className={sidebarOpen ? "adminSidebar sidebarVisible" : "adminSidebar"}>
        <div className="adminLogo"><img src="/bustaniya-logo-v2.png" alt="Bustaniya" /><span>ADMIN</span></div>
        <button className="closeSidebar" onClick={() => setSidebarOpen(false)}><X /></button>
        <nav>
          {visibleNavItems.map(({ name, icon: Icon, count, section }, index) => (
            <div className="adminNavItem" key={name}>
              {(index === 0 || visibleNavItems[index - 1].section !== section) && <p>{section}</p>}
              <button className={active === name ? "active" : ""} onClick={() => { setActive(name); setSidebarOpen(false); }}>
                <Icon /> <span>{name}</span>{count && <b>{count}</b>}
              </button>
            </div>
          ))}
        </nav>
        <div className="adminStoreCard">
          <div>B</div><span><b>Bustaniya</b><small>Online store</small></span><ChevronDown />
        </div>
        <button className="adminSidebarLogout" onClick={handleLogout} disabled={loggingOut}>
          <LogOut />
          <span>{loggingOut ? "Logging out" : "Logout"}</span>
        </button>
      </aside>

      <section className="adminMain">
        <header className="adminTopbar">
          <button className="adminMenu" onClick={() => setSidebarOpen(true)}><Menu /></button>
          <div className="adminSearch"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products, orders, customers..." /></div>
          <div className="adminTopActions">
            <a href="/" target="_blank">View store</a>
            <button className="notification"><Bell /><span /></button>
            <div className="adminAvatar">{(currentAdminUser?.name || "BA").slice(0, 2).toUpperCase()}</div>
            <button
              className="adminLogoutButton"
              onClick={handleLogout}
              disabled={loggingOut}
              title="Logout"
              aria-label="Logout from admin"
            >
              <LogOut />
              <span>{loggingOut ? "Logging out" : "Logout"}</span>
            </button>
          </div>
        </header>

        <div className="adminContent">
          {ordersError && active !== "Orders" && <div className="adminErrorBanner">{ordersError}</div>}
          {!canAccessActive && <div className="adminErrorBanner">You do not have access to this admin area.</div>}
          {canAccessActive && active === "Dashboard" && <DashboardHome setActive={setActive} orders={orders} metrics={metrics} connected={ordersConnected} />}
          {canAccessActive && active === "Products" && <ProductsPanel products={filteredProducts} search={search} setSearch={setSearch} onAdd={openNewProductForm} onEdit={openEditProductForm} onDelete={deleteProduct} onDeliveryChange={updateProductDelivery} loading={catalogLoading} />}
          {canAccessActive && active === "Categories" && <CategoriesPanel categories={catalogCategories} products={products} onSave={saveCategory} onArchive={archiveCategory} saving={categorySaving} needsSetup={categorySetupNeeded} />}
          {canAccessActive && active === "Orders" && <OrdersPanel onOpen={setWorkspace} rows={orders} products={products} accessKey={ordersKey} setAccessKey={setOrdersKey} connected={ordersConnected} loading={ordersLoading} error={ordersError} onConnect={loadOrders} />}
          {canAccessActive && active === "Inventory" && <InventoryPanel products={products} movements={inventoryMovements} onAdjust={adjustInventory} onCreateCustomInventory={createCustomInventory} />}
          {canAccessActive && active === "Customers" && <CustomersPanel orders={orders} onOpen={setWorkspace} />}
          {canAccessActive && active === "Gift cards" && <ModulePanel onOpen={setWorkspace} title="Gift cards" subtitle="Issue and manage digital store credit." action="Issue gift card" icon={Tags} features={["Gift card products", "Issued cards", "Balances", "Expiry dates", "Gift card activity"]} />}
          {canAccessActive && active === "Discounts" && <ModulePanel onOpen={setWorkspace} title="Discounts" subtitle="Codes and automatic promotions." action="Create discount" icon={BadgePercent} features={["Discount codes", "Automatic discounts", "Amount off", "Buy X get Y", "Free delivery"]} />}
          {canAccessActive && active === "Analytics" && <ModulePanel onOpen={setWorkspace} title="Analytics" subtitle="Store performance and reporting." icon={BarChart3} features={["Live view", "Reports", "Sales over time", "Product performance", "Customer cohorts", "Conversion funnel"]} />}
          {canAccessActive && active === "Marketing" && <ModulePanel onOpen={setWorkspace} title="Marketing" subtitle="Campaigns, attribution and automations." action="Create campaign" icon={Megaphone} features={["Campaigns", "Marketing automations", "Email marketing", "Abandoned checkout", "Attribution reports"]} />}
          {canAccessActive && active === "Content" && <ModulePanel onOpen={setWorkspace} title="Content" subtitle="Reusable content across your storefront." action="Add content" icon={FileText} features={["Files", "Menus", "Metaobjects", "Metafields", "Blog posts"]} />}
          {canAccessActive && active === "Online Store" && <ModulePanel onOpen={setWorkspace} title="Online Store" subtitle="Design and manage your sales channel." action="Customize theme" icon={Monitor} features={["Themes", "Pages", "Navigation", "Blog posts", "Domains", "Preferences", "Theme sections"]} />}
          {canAccessActive && active === "Markets" && <ModulePanel onOpen={setWorkspace} title="Markets" subtitle="Localize selling by country or customer group." action="Add market" icon={Globe} features={["Pakistan market", "Currencies", "Languages", "Domains", "Duties and taxes", "Product availability"]} />}
          {canAccessActive && active === "Finances" && <FinancePanel orders={orders} products={products} connected={ordersConnected} />}
          {canAccessActive && active === "Apps" && <ModulePanel onOpen={setWorkspace} title="Apps and channels" subtitle="Extend your store capabilities." action="Add app" icon={AppWindow} features={["Installed apps", "Sales channels", "App permissions", "Custom integrations", "Automation workflows"]} />}
          {canAccessActive && active === "Settings" && <SettingsPanel onOpen={setWorkspace} signedInUser={currentAdminUser} />}
        </div>
      </section>

      {showProductForm && <>
        <div className="adminOverlay" onClick={closeProductForm} />
        <aside className="productFormDrawer">
          <div className="productDrawerHeader"><div><p>PRODUCT CATALOGUE</p><h2>{editingProduct ? "Edit product" : "Add product"}</h2></div><button onClick={closeProductForm}><X /></button></div>
          <form onSubmit={addProduct} key={editingProduct?.id || "new-product"}>
            <section className="productEditorCard">
              <h3>Basic information</h3>
              <label>Product title<input name="name" required defaultValue={editingProduct?.name || ""} placeholder="e.g. Gulnaar Corset Kurti" /></label>
              <label>Description<textarea name="description" rows="6" defaultValue={editingProduct?.description || ""} placeholder="Describe fabric, fit, embroidery and styling details..." /></label>
            </section>

            <section className="productEditorCard">
              <div className="editorHeading"><div><h3>Media</h3><p>Paste Cloudinary product image links</p></div><span>{productMedia.length}/8 images</span></div>
              <div className="mediaLinkRow">
                <input value={productImageUrl} onChange={(event) => setProductImageUrl(event.target.value)} placeholder="https://res.cloudinary.com/.../product-photo.jpg" />
                <button type="button" onClick={addProductImageUrl}><Plus /> Add link</button>
              </div>
              {mediaError && <p className="mediaError">{mediaError}</p>}
              {productMedia.length > 0 && <div className="mediaPreviewGrid">
                {productMedia.map((item) => <div className="mediaPreview" key={item.id}>
                  <img src={item.src} alt={item.name} />
                  <button type="button" onClick={() => removeProductMedia(item.id)} aria-label={`Remove ${item.name}`}><X /></button>
                </div>)}
              </div>}
            </section>

            <section className="productEditorCard">
              <h3>Product organization</h3>
              <div className="formRow">
                <label>Category<select name="category" value={productCategory} onChange={(event) => setProductCategory(event.target.value)}>{mainCategoryOptions.map((category) => <option value={category.name} key={category.slug}>{category.name}</option>)}</select></label>
                <label>Product type<select name="productType"><option>Women&apos;s clothing</option><option>Kurti</option><option>Trouser</option><option>Co-ord</option></select></label>
              </div>
              {!!productSubcategoryOptions.length && <label>Subcategory<select name="subcategory" defaultValue={editingProduct?.subcategory || productSubcategoryOptions[0]?.slug}>{productSubcategoryOptions.map((category) => <option value={category.slug} key={category.slug}>{category.name}</option>)}</select></label>}
              <div className="formRow"><label>Vendor<input name="vendor" defaultValue="Bustaniya" /></label><label>Collection<input name="collection" defaultValue={editingProduct?.collection || ""} placeholder="Summer Collection, New Arrivals..." /></label></div>
              <label>Tags<input name="tags" placeholder="summer, printed, cotton, new-arrival" /></label>
            </section>

            <section className="productEditorCard">
              <h3>Pricing</h3>
              <div className="formRow"><label>Price (PKR)<input name="price" required type="number" defaultValue={editingProduct?.price || ""} placeholder="4,990" /></label><label>Compare-at price<input name="comparePrice" type="number" placeholder="5,990" /></label></div>
              <p className="fieldTitle">Product cost breakdown (PKR)</p>
              <div className="formRow"><label>Fabric<input type="number" min="0" value={costBreakdown.fabric || ""} onChange={(e) => setCostBreakdown(current => ({ ...current, fabric: e.target.value }))} /></label><label>Stitching<input type="number" min="0" value={costBreakdown.stitching || ""} onChange={(e) => setCostBreakdown(current => ({ ...current, stitching: e.target.value }))} /></label></div>
              <div className="formRow"><label>Embellishment<input type="number" min="0" value={costBreakdown.embellishment || ""} onChange={(e) => setCostBreakdown(current => ({ ...current, embellishment: e.target.value }))} /></label><label>Packaging<input type="number" min="0" value={costBreakdown.packaging || ""} onChange={(e) => setCostBreakdown(current => ({ ...current, packaging: e.target.value }))} /></label></div>
              <div className="formRow"><label>Other cost<input type="number" min="0" value={costBreakdown.other || ""} onChange={(e) => setCostBreakdown(current => ({ ...current, other: e.target.value }))} /></label><label>Total product cost<input readOnly value={Object.values(costBreakdown).reduce((sum, value) => sum + Number(value || 0), 0)} /></label></div>
              <label className="checkLabel"><input type="checkbox" defaultChecked /> Charge tax on this product</label>
            </section>

            <section className="productEditorCard">
              <h3>Inventory</h3>
              <div className="formRow"><label>SKU<input name="sku" defaultValue={editingProduct?.sku || editingProduct?.articleNumber || ""} placeholder="BST-KRT-001" /></label><label>Barcode<input name="barcode" placeholder="ISBN, UPC or GTIN" /></label></div>
              <label className="checkLabel"><input type="checkbox" defaultChecked /> Track quantity</label>
              <div className="stockLocation"><div><Store /><span><b>Bustaniya warehouse</b><small>Pakistan</small></span></div><label>Available<input name="stock" required type="number" defaultValue={editingProduct?.stock ?? 10} /></label></div>
              <label className="checkLabel"><input type="checkbox" /> Continue selling when out of stock</label>
            </section>

            <section className="productEditorCard">
              <div className="editorHeading"><div><h3>Variants</h3><p>Add sizes and colours</p></div><span>{selectedSizes.length * selectedColors.length} combinations</span></div>
              <div className="variantGroup">
                <div className="variantLabel"><b>Size</b><span>{selectedSizes.length} selected</span><button type="button" onClick={() => setSelectedSizes(selectedSizes.length === apparelSizes.length ? [] : apparelSizes)}>Select all</button></div>
                <div className="variantSearch"><Search /><input value={sizeSearch} onChange={(e) => setSizeSearch(e.target.value)} placeholder="Search XXS, UK 12, EU 40, Waist 30..." /></div>
                <div className="variantChips scrollableVariants">{apparelSizes.filter(size => size.toLowerCase().includes(sizeSearch.toLowerCase())).map(size => <button type="button" className={selectedSizes.includes(size) ? "selected" : ""} key={size} onClick={() => setSelectedSizes(current => current.includes(size) ? current.filter(x => x !== size) : [...current,size])}>{size}</button>)}</div>
              </div>
              <div className="variantGroup">
                <div className="variantLabel"><b>Colour</b><span>{selectedColors.length} selected</span><button type="button" onClick={() => setSelectedColors(selectedColors.length === fashionColors.length ? [] : fashionColors.map(color => color.name))}>Select all</button></div>
                <div className="variantSearch"><Search /><input value={colorSearch} onChange={(e) => setColorSearch(e.target.value)} placeholder="Search colour name..." /></div>
                <div className="variantChips colorChips scrollableVariants">{fashionColors.filter(color => color.name.toLowerCase().includes(colorSearch.toLowerCase())).map(color => <button type="button" className={selectedColors.includes(color.name) ? "selected" : ""} key={color.name} onClick={() => setSelectedColors(current => current.includes(color.name) ? current.filter(x => x !== color.name) : [...current,color.name])}><i className="swatch" style={{background:color.hex}} />{color.name}</button>)}</div>
              </div>
              <div className="variantPreview"><span>Variant combinations will be created automatically</span><b>{selectedSizes.length * selectedColors.length} variants</b></div>
            </section>

            <section className="productEditorCard">
              <h3>Shipping</h3>
              <label className="checkLabel"><input type="checkbox" defaultChecked /> This is a physical product</label>
              <div className="formRow">
                <label>Delivery rule
                  <select name="deliveryFeeMode" defaultValue={editingProduct?.deliveryFeeMode || "inherit"}>
                    <option value="inherit">Use store rules</option>
                    <option value="free">Always free delivery</option>
                    <option value="paid">Custom paid delivery</option>
                  </select>
                </label>
                <label>Custom COD fee (PKR)<input name="deliveryFee" type="number" min="0" defaultValue={editingProduct?.deliveryFee || 200} /></label>
              </div>
              <p className="shippingRuleHint">Store rules: COD is Rs. 200 and orders of Rs. 5,000 or more receive free delivery.</p>
              <div className="formRow"><label>Weight<input name="weight" type="number" step="0.1" placeholder="0.5" /></label><label>Unit<select><option>kg</option><option>g</option></select></label></div>
              <div className="formRow"><label>Country of origin<select><option>Pakistan</option></select></label><label>HS tariff code<input placeholder="Optional" /></label></div>
            </section>

            <section className="productEditorCard">
              <h3>Search engine listing</h3>
              <div className="seoPreview"><b>Bustaniya · Product title</b><span>https://bustaniya.pk/products/product-title</span><p>Your product description will appear here in search results.</p></div>
              <label>Page title<input maxLength="70" placeholder="Product title — Bustaniya" /></label>
              <label>Meta description<textarea rows="3" maxLength="160" placeholder="Describe this product for Google search..." /></label>
              <label>URL handle<input placeholder="gulnaar-corset-kurti" /></label>
            </section>

            <section className="productEditorCard">
              <h3>Publishing</h3>
              <div className="formRow"><label>Status<select name="status"><option>Active</option><option>Draft</option><option>Archived</option></select></label><label>Publishing date<input type="date" /></label></div>
              <p className="fieldTitle">Sales channels</p>
              <label className="checkLabel"><input type="checkbox" defaultChecked /> Online Store</label>
              <label className="checkLabel"><input type="checkbox" /> Instagram / Facebook</label>
              <label className="checkLabel"><input type="checkbox" /> Point of Sale</label>
            </section>

            <div className="drawerActions">
              <button type="button" onClick={closeProductForm} disabled={productSaving}>Discard</button>
              <button className={productSaving ? "saveProduct saving" : "saveProduct"} disabled={productSaving}>
                {productSaving ? <><span className="buttonSpinner" /> Saving product...</> : editingProduct ? "Update product" : "Save product"}
              </button>
            </div>
          </form>
        </aside>
      </>}
      {workspace && <WorkspaceDrawer workspace={workspace} onClose={() => setWorkspace(null)} activity={activity} onSave={(entry) => { setActivity(current => [entry, ...current]); setWorkspace(null); }} />}
    </main>
  );
}

function DashboardHome({ setActive, orders, metrics, connected }) {
  const dashboardSales = connected
    ? orders.filter(isDeliveredOrder).reduce((sum, order) => sum + Number(order.total || 0), 0)
    : Number(metrics.totalSales || 0);
  const statusCounts = orders.reduce((counts, order) => {
    const key = orderStatus(order);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
  return <>
    <div className="adminTitle"><div><p>{new Date().toLocaleDateString("en-PK", { weekday:"long", day:"numeric", month:"long" })}</p><h1>Good afternoon, Bustaniya</h1><span>{connected ? "Live data from your Supabase store." : "Connect Supabase orders to load live store data."}</span></div><button onClick={() => setActive("Products")}><Plus /> Add product</button></div>
    <div className="metricGrid">
      <Metric icon={CircleDollarSign} label="Total sales" value={`Rs. ${dashboardSales.toLocaleString()}`} change="Live" note="delivered orders" />
      <Metric icon={ShoppingBag} label="Orders" value={metrics.orders || 0} change="Live" note="all orders" />
      <Metric icon={Users} label="Customers" value={metrics.customers || 0} change="Live" note="unique customers" />
      <Metric icon={TrendingUp} label="Low stock" value={metrics.lowStock || 0} change={metrics.products || 0} note="catalogue products" />
    </div>
    <div className="dashboardGrid">
      <section className="salesChart adminCard">
        <div className="cardHeading"><div><h2>Sales overview</h2><p>Revenue performance for this week</p></div><button>Last 7 days <ChevronDown /></button></div>
        <div className="chartTotal"><b>Rs. {dashboardSales.toLocaleString()}</b><span>Delivered orders only</span></div>
        <div className="fakeChart">
          {[35, 48, 43, 66, 58, 82, 72].map((height, i) => <div key={i}><span style={{ height: `${height}%` }} /><small>{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i]}</small></div>)}
        </div>
      </section>
      <section className="adminCard orderStatus">
        <div className="cardHeading"><div><h2>Order status</h2><p>Current fulfilment</p></div></div>
        <div className="donut"><div><b>{metrics.orders || 0}</b><span>Orders</span></div></div>
        <ul><li><i className="processing" />Booked <b>{statusCounts.booked || 0}</b></li><li><i className="confirmed" />Unbooked <b>{statusCounts.unbooked || statusCounts.pending || 0}</b></li><li><i className="delivered" />Delivered <b>{statusCounts.delivered || statusCounts.completed || 0}</b></li><li><i className="cancelled" />Cancelled <b>{statusCounts.cancelled || statusCounts.failed || 0}</b></li></ul>
      </section>
    </div>
    <section className="adminCard recentOrders">
      <div className="cardHeading"><div><h2>Recent orders</h2><p>Latest customer purchases</p></div><button onClick={() => setActive("Orders")}>View all orders</button></div>
      <OrderTable rows={orders.slice(0, 4)} />
    </section>
  </>;
}

function Metric({ icon: Icon, label, value, change, note }) {
  return <article className="metricCard"><div><Icon /></div><p>{label}</p><h2>{value}</h2><span><b>{change}</b> {note}</span></article>;
}

function productCollection(product) {
  return product.collection || product.rawCollection || product.subcategory || "Online Store";
}

function productStatus(product) {
  if (String(product.status || "").toLowerCase().includes("archived")) return "Archived";
  if (String(product.status || "").toLowerCase().includes("draft")) return "Draft";
  if (Number(product.stock || 0) <= 0) return "Out of stock";
  return product.unlisted ? "Unlisted" : "Active";
}

function CategoriesPanel({ categories, products, onSave, onArchive, saving, needsSetup }) {
  const [editing, setEditing] = useState(null);
  const mainCategories = categories.filter((category) => !category.parentSlug);
  const [selectedSlug, setSelectedSlug] = useState(mainCategories[0]?.slug || "");
  const activeCategories = categories.filter((category) => category.status !== "Archived");
  const selectedCategory = mainCategories.find((category) => category.slug === selectedSlug) || mainCategories[0];
  const childCategories = selectedCategory
    ? categories.filter((category) => category.parentSlug === selectedCategory.slug)
    : [];

  function productCount(category) {
    if (category.parentSlug) {
      return products.filter((product) => product.subcategory === category.slug).length;
    }
    return products.filter((product) => product.category === category.name).length;
  }

  function openNewMainCategory() {
    setEditing({ parentSlug: "" });
  }

  function openNewSubcategory(parent) {
    setSelectedSlug(parent.slug);
    setEditing({ parentSlug: parent.slug, status: "Active", sortOrder: (childCategories.length + 1) * 10 });
  }

  function saveCategory(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") || "").trim();
    onSave({
      id: editing?.id,
      name,
      slug: String(form.get("slug") || slugifyCategory(name)).trim(),
      parentSlug: form.get("parentSlug") || "",
      description: form.get("description") || "",
      image: form.get("image") || "",
      status: form.get("status") || "Active",
      sortOrder: Number(form.get("sortOrder") || 100),
    });
    if (!editing) event.currentTarget.reset();
    setEditing(null);
  }

  return <><div className="adminTitle"><div><p>CATALOGUE</p><h1>Categories</h1><span>Main categories pehle dikhti hain. Kisi category ko select karke uske andar subcategories manage karein.</span></div><button onClick={openNewMainCategory}><Plus /> Add main category</button></div>
    {needsSetup && <div className="adminErrorBanner">Supabase category table setup is pending. Run <b>scripts/supabase-catalog-categories.sql</b>, then reconnect admin data.</div>}
    <div className="miniMetricGrid productMetrics">
      <article><Tags /><span><b>{mainCategories.length}</b>Main categories</span></article>
      <article><Package /><span><b>{categories.length - mainCategories.length}</b>Subcategories</span></article>
      <article><Store /><span><b>{activeCategories.length}</b>Visible on store</span></article>
      <article><Boxes /><span><b>{products.length}</b>Products mapped</span></article>
    </div>

    <section className="categoryManagerGrid">
      <div className="adminCard managementCard">
        <div className="inventoryListHead"><div><h2>Main categories</h2><span>{mainCategories.length} storefront sections</span></div><button onClick={openNewMainCategory} disabled={saving}><Plus /> New main</button></div>
        <div className="categoryTreeList">
          {mainCategories.map((category) => {
            const children = categories.filter((item) => item.parentSlug === category.slug);
            return <button type="button" className={selectedCategory?.slug === category.slug ? "active" : ""} key={category.id} onClick={() => setSelectedSlug(category.slug)}>
              <span style={{ backgroundImage: `url(${category.image || "/bustaniya-campaign-hero-v4.png"})` }} />
              <b>{category.name}</b>
              <small>{children.length} subcategories · {productCount(category)} products</small>
            </button>;
          })}
          {!mainCategories.length && <div className="inventoryEmpty">No main categories yet.</div>}
        </div>
      </div>

      <div className="adminCard managementCard">
        <div className="inventoryListHead"><div><h2>{selectedCategory?.name || "Select category"}</h2><span>{childCategories.length} subcategories inside</span></div>{selectedCategory && <button onClick={() => openNewSubcategory(selectedCategory)} disabled={saving}><Plus /> Add inside</button>}</div>
        {selectedCategory && <div className="categoryParentSummary">
          <div className="tableProduct"><span style={{ backgroundImage: `url(${selectedCategory.image || "/bustaniya-campaign-hero-v4.png"})` }} /><div><b>{selectedCategory.name}</b><small><a href={`/category/${selectedCategory.slug}`} target="_blank">/category/{selectedCategory.slug}</a></small></div></div>
          <div className="productRowActions"><button className="editProductButton" onClick={() => setEditing(selectedCategory)} disabled={saving}>Edit main</button><button className="removeProductButton" onClick={() => onArchive(selectedCategory)} disabled={saving}><X /><span>Archive</span></button></div>
        </div>}
        <div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Subcategory</th><th>URL</th><th>Products</th><th>Status</th><th /></tr></thead><tbody>
          {childCategories.map((category) => (
            <tr key={category.id}><td><div className="tableProduct"><span style={{ backgroundImage: `url(${category.image || "/bustaniya-campaign-hero-v4.png"})` }} /><div><b>{category.name}</b><small>{category.description || "No description"}</small></div></div></td><td><a href={`/category/${category.parentSlug}/${category.slug}`} target="_blank">/category/{category.parentSlug}/{category.slug}</a></td><td>{productCount(category)}</td><td><span className={`statusBadge ${category.status === "Active" ? "activeStatus" : "processing"}`}>{category.status}</span></td><td><div className="productRowActions"><button className="editProductButton" onClick={() => setEditing(category)} disabled={saving}>Edit</button><button className="removeProductButton" onClick={() => onArchive(category)} disabled={saving}><X /><span>Archive</span></button></div></td></tr>
          ))}
          {!childCategories.length && <tr><td colSpan="5"><div className="inventoryEmpty">No subcategories inside {selectedCategory?.name || "this category"} yet.</div></td></tr>}
        </tbody></table></div>
      </div>
    </section>

    {editing && <><div className="adminOverlay" onClick={() => setEditing(null)} /><form className="inventoryDialog categoryDialog" onSubmit={saveCategory}>
      <DialogHead title={editing.id ? "Edit category" : "Add category"} onClose={() => setEditing(null)} />
      <label>Name<input name="name" required defaultValue={editing.name || ""} placeholder="Summer Collection" /></label>
      <div className="formRow"><label>Slug<input name="slug" defaultValue={editing.slug || ""} placeholder="summer-collection" /></label><label>Sort order<input name="sortOrder" type="number" defaultValue={editing.sortOrder || 100} /></label></div>
      <label>Parent<select name="parentSlug" defaultValue={editing.parentSlug || ""}><option value="">Main category</option>{mainCategories.filter((category) => category.id !== editing.id).map((category) => <option value={category.slug} key={category.slug}>{category.name}</option>)}</select></label>
      <label>Description<textarea name="description" rows="3" defaultValue={editing.description || ""} placeholder="Short SEO-friendly category description" /></label>
      <label>Cover image URL<input name="image" defaultValue={editing.image || ""} placeholder="https://... or /bustaniya-campaign-hero-v4.png" /></label>
      <label>Status<select name="status" defaultValue={editing.status || "Active"}><option>Active</option><option>Draft</option><option>Archived</option></select></label>
      <button disabled={saving}>{saving ? "Saving..." : "Save category"}</button>
    </form></>}
  </>;
}

function productVariants(product) {
  const sizes = Array.isArray(product.sizes) && product.sizes.length ? product.sizes : ["S", "M", "L"];
  const colors = Array.isArray(product.colors) && product.colors.length ? product.colors : ["Default"];
  const totalStock = Number(product.stock || 0);
  const count = Math.max(1, sizes.length * colors.length);
  return sizes.flatMap((size, sizeIndex) => colors.map((color, colorIndex) => ({
    id: `${product.id}-${size}-${color}`,
    size,
    color,
    sku: `${product.sku || product.articleNumber || `BST-${product.id}`}-${size}-${color}`.replace(/\s+/g, "-").toUpperCase(),
    stock: Math.max(0, Math.floor(totalStock / count) + (sizeIndex === 0 && colorIndex === 0 ? totalStock % count : 0)),
    low: Number(product.lowStockThreshold || 5),
  })));
}

function ProductsPanel({ products, search, setSearch, onAdd, onEdit, onDelete, onDeliveryChange, loading }) {
  const [tab, setTab] = useState("All");
  const [variantProduct, setVariantProduct] = useState(null);
  const visibleProducts = products.filter((product) => {
    const status = productStatus(product);
    return tab === "All" || status === tab || (tab === "Low stock" && Number(product.stock || 0) <= Number(product.lowStockThreshold || 5));
  });
  const collections = [...new Set(products.map(productCollection))].filter(Boolean);
  const lowStockCount = products.filter((product) => Number(product.stock || 0) <= Number(product.lowStockThreshold || 5)).length;

  function exportProducts() {
    const csv = [
      ["Title","Description","Images","Price","Compare at price","Category","Collection","Status","Sizes","Colors","Stock","Low stock threshold"],
      ...products.map((product) => [
        product.name,
        product.description || "",
        (product.images || [product.image]).filter(Boolean).join(" | "),
        product.price,
        product.compareAtPrice || product.compare_at_price || "",
        product.category,
        productCollection(product),
        productStatus(product),
        (product.sizes || []).join(" | "),
        (product.colors || []).join(" | "),
        product.stock || 0,
        product.lowStockThreshold || 5,
      ]),
    ].map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"','""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `bustaniya-products-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function importProducts(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    window.alert(`${file.name} selected. CSV import mapping is ready in the admin UI; connect it to Supabase bulk upload when you want live imports.`);
  }

  return <><div className="adminTitle"><div><p>CATALOGUE</p><h1>Products</h1><span>Add/edit products, variants, collections, inventory and private-drop status.</span></div><button onClick={onAdd}><Plus /> Add product</button></div>
    <div className="miniMetricGrid productMetrics">
      <article><Package /><span><b>{products.length}</b>Total products</span></article>
      <article><Tags /><span><b>{collections.length}</b>Collections</span></article>
      <article className={lowStockCount ? "alertMetric" : ""}><Boxes /><span><b>{lowStockCount}</b>Low stock</span></article>
      <article><Store /><span><b>{products.filter((p) => productStatus(p) === "Active").length}</b>Active</span></article>
    </div>
    <section className="adminCard managementCard">
      <div className="catalogToolbar">
        <div className="orderTabs">{["All","Active","Draft","Archived","Unlisted","Low stock"].map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
        <div className="catalogActions">
          <div className="inlineSearch"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." /></div>
          <label className="csvButton">Import CSV<input type="file" accept=".csv,text/csv" onChange={importProducts} /></label>
          <button type="button" onClick={exportProducts}>Export CSV</button>
        </div>
      </div>
      <div className="collectionStrip">{collections.map((collection) => <span key={collection}>{collection}</span>)}</div>
      <div className="adminTableWrap"><table className="adminTable productAdminTable"><thead><tr><th>Product</th><th>Collection</th><th>Price</th><th>Variants</th><th>Inventory</th><th>Delivery</th><th>Status</th><th /></tr></thead><tbody>
        {visibleProducts.map((product) => {
          const variants = productVariants(product);
          const status = productStatus(product);
          return <tr key={product.id}><td><div className="tableProduct"><span style={{ backgroundImage: `url(${product.image})` }} /><div><b>{product.name}</b><small>{product.sku || product.articleNumber || `BST-${String(product.id).padStart(4,"0")}`}</small></div></div></td><td>{productCollection(product)}</td><td><b>Rs. {Number(product.price || 0).toLocaleString()}</b>{(product.compareAtPrice || product.compare_at_price) && <small className="trackingNumber">Was Rs. {Number(product.compareAtPrice || product.compare_at_price).toLocaleString()}</small>}</td><td><button className="adjustStockButton" onClick={() => setVariantProduct(product)}>{variants.length} variants</button></td><td><span className={Number(product.stock || 0) <= Number(product.lowStockThreshold || 5) ? "stockLow" : ""}>{Number(product.stock || 0)} in stock</span><small className="trackingNumber">Alert at {Number(product.lowStockThreshold || 5)}</small></td><td><select className="tableSelect" value={product.deliveryFeeMode || "inherit"} onChange={(event) => onDeliveryChange(product, event.target.value)} disabled={loading}><option value="inherit">Store rules</option><option value="free">Free</option><option value="paid">Paid{product.deliveryFee ? ` - Rs. ${product.deliveryFee}` : ""}</option></select></td><td><span className={`statusBadge ${status === "Active" ? "activeStatus" : status === "Out of stock" ? "cancelled" : "processing"}`}>{status}</span></td><td><div className="productRowActions"><button className="editProductButton" onClick={() => onEdit(product)} disabled={loading}>Edit</button><button className="removeProductButton" onClick={() => onDelete(product)} disabled={loading} aria-label={`Remove ${product.name}`}><X /><span>Remove</span></button></div></td></tr>;
        })}
        {!visibleProducts.length && <tr><td colSpan="8"><div className="inventoryEmpty">No products match this view.</div></td></tr>}
      </tbody></table></div>
    </section>
    {variantProduct && <VariantInventoryDrawer product={variantProduct} onClose={() => setVariantProduct(null)} />}
  </>;
}

function orderStatus(order) {
  return String(order.postexStatus || order.status || "").toLowerCase();
}

function formatOrderStatus(value = "") {
  return String(value || "pending")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isRevenueOrder(order) {
  return !["cancelled", "failed"].includes(orderStatus(order));
}

function isDeliveredOrder(order) {
  return ["delivered", "completed"].includes(orderStatus(order));
}

const orderCategoryLabels = [
  "Total Orders",
  "Unbooked",
  "Booked",
  "PostEx Warehouse",
  "Out For Delivery",
  "Delivered",
  "Attempted",
  "Out For Return",
  "Returned",
  "Delivery Under Review",
  "Transferred",
  "Un-Assigned By Me",
];

const customOrderStatusOptions = [
  "Un-Assigned By Me",
  "Unbooked",
  "Booked",
  "PostEx Warehouse",
  "Out For Delivery",
  "Delivered",
  "Attempted",
  "Out For Return",
  "Returned",
  "Delivery Under Review",
  "Transferred",
  "Rider Assigned",
  "Ready For Pickup",
  "Customer Pickup",
  "Manual Delivery",
  "On Hold",
  "Cancelled",
];

function normalizePostexCategory(value = "") {
  const normalized = String(value || "Unbooked")
    .toLowerCase()
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) return "Unbooked";
  if (["all", "total", "total orders"].includes(normalized)) return "Total Orders";
  if (normalized.includes("unbook") || normalized.includes("pending") || normalized.includes("draft")) return "Unbooked";
  if (normalized.includes("warehouse")) return "PostEx Warehouse";
  if (normalized.includes("out for delivery")) return "Out For Delivery";
  if (normalized.includes("out for return")) return "Out For Return";
  if (normalized.includes("under review") || normalized.includes("review")) return "Delivery Under Review";
  if (normalized.includes("un assigned") || normalized.includes("unassigned")) return "Un-Assigned By Me";
  if (normalized.includes("attempt")) return "Attempted";
  if (normalized.includes("return")) return "Returned";
  if (normalized.includes("deliver") || normalized.includes("complete")) return "Delivered";
  if (normalized.includes("transfer")) return "Transferred";
  if (normalized.includes("book")) return "Booked";
  return "Unbooked";
}

function isPendingCodOrder(order) {
  return [
    "Booked",
    "Transferred",
    "Out For Delivery",
    "Attempted",
    "Delivery Under Review",
  ].includes(normalizePostexCategory(order.postexStatus || order.status));
}

function toOrderDate(order) {
  const date = new Date(order.createdAt || order.rawCreatedAt || order.date);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date) {
  const day = date.getDay() || 7;
  const start = startOfDay(date);
  start.setDate(start.getDate() - day + 1);
  return start;
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sameRange(date, start, end) {
  return date >= start && date < end;
}

function buildOrderPeriodSummary(rows) {
  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const weekStart = startOfWeek(now);
  const nextWeekStart = new Date(weekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  const monthStart = startOfMonth(now);
  const nextMonthStart = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1);

  function summarize(start, end) {
    const periodOrders = rows.filter((order) => {
      const date = toOrderDate(order);
      return date && sameRange(date, start, end);
    });
    const revenueOrders = periodOrders.filter(isDeliveredOrder);
    const sales = revenueOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    return {
      orders: periodOrders.length,
      sales,
      average: revenueOrders.length ? Math.round(sales / revenueOrders.length) : 0,
    };
  }

  return [
    { label: "Day wise", range: "Today", ...summarize(todayStart, tomorrowStart) },
    { label: "Week wise", range: "This week", ...summarize(weekStart, nextWeekStart) },
    { label: "Month wise", range: "This month", ...summarize(monthStart, nextMonthStart) },
  ];
}

function formatFinanceDate(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return new Date().toLocaleDateString("en-PK", { day: "numeric", month: "short" });
  return date.toLocaleDateString("en-PK", { day: "numeric", month: "short" });
}

function normalizeOrderItems(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  if (items.length) {
    return items.map((item, index) => ({
      id: item.id || item.product_id || index,
      productId: item.product_id || item.productId || "",
      name: item.product_name || item.name || item.title || `Item ${index + 1}`,
      sku: item.article_number || item.sku || item.articleNumber || "",
      quantity: Number(item.quantity || item.qty || 1),
      price: Number(item.unit_price_pkr || item.price || item.total_pkr || 0),
      size: item.size || "",
      color: item.color || "",
    }));
  }
  return [{ id: "fallback", name: "Order items", sku: order.id, quantity: 1, price: Number(order.total || 0), size: "", color: "" }];
}

function legacyArticleNumber(id) {
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return "";
  return `BST-${String(numericId).padStart(4, "0")}`;
}

function createDraftOrderFromForm(form, products = []) {
  const customer = String(form.get("customer") || "").trim() || "Instagram customer";
  const productId = String(form.get("productId") || "");
  const selectedProduct = products.find((product) => String(product.id) === productId);
  const quantity = Number(form.get("quantity") || 1);
  const unitPrice = Number(form.get("unitPrice") || selectedProduct?.price || 0);
  const total = Number(form.get("total") || unitPrice * quantity || 0);
  const itemName = selectedProduct?.name || String(form.get("item") || "").trim() || "Manual DM order";
  const itemSize = String(form.get("size") || "").trim();
  const itemColor = String(form.get("color") || "").trim();
  const deliveryMethod = String(form.get("deliveryMethod") || "Rider / same city").trim();
  const status = String(form.get("status") || "Un-Assigned By Me").trim();
  const source = String(form.get("source") || "Manual").trim();
  const now = new Date();
  return {
    rawId: `draft-${Date.now()}`,
    id: `#BST-${String(Date.now()).slice(-6)}`,
    customer,
    city: String(form.get("city") || "").trim() || "DM",
    total,
    status,
    postexStatus: status,
    paymentStatus: form.get("paymentStatus") || "COD pending",
    fulfillmentStatus: form.get("fulfillmentStatus") || "Manual delivery",
    deliveryMethod,
    source,
    postexBooked: false,
    tracking: "",
    phone: String(form.get("phone") || "").trim(),
    address: String(form.get("address") || "").trim(),
    items: [{
      id: selectedProduct?.id || "manual",
      name: itemName,
      sku: selectedProduct?.articleNumber || selectedProduct?.article_number || selectedProduct?.sku || legacyArticleNumber(selectedProduct?.id) || "CUSTOM-ORDER",
      articleNumber: selectedProduct?.articleNumber || selectedProduct?.article_number || legacyArticleNumber(selectedProduct?.id) || "",
      productId: selectedProduct?.id || "",
      quantity,
      price: unitPrice,
      size: itemSize,
      color: itemColor,
    }],
    notes: String(form.get("notes") || "").trim(),
    tags: ["Custom order", source, deliveryMethod].filter(Boolean),
    risk: "Standard COD",
    createdAt: now.toISOString(),
    date: now.toLocaleString("en-PK", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
  };
}

function formatSavedCustomOrder(order, fallback = {}) {
  if (!order?.order_number) return fallback;
  return {
    ...fallback,
    rawId: order.id || fallback.rawId,
    raw: order,
    id: `#${order.order_number}`,
    customer: order.shipping_full_name || order.guest_name || fallback.customer,
    city: order.shipping_city || fallback.city,
    total: Number(order.total_pkr ?? order.total ?? fallback.total ?? 0),
    status: formatOrderStatus(order.courier_status || order.status || fallback.status || "Un-Assigned By Me"),
    postexStatus: formatOrderStatus(order.courier_status || order.status || fallback.postexStatus || "Un-Assigned By Me"),
    paymentStatus: order.payment_status || fallback.paymentStatus || "COD pending",
    fulfillmentStatus: order.fulfillment_status || fallback.fulfillmentStatus || "Manual delivery",
    tracking: order.courier_tracking_number || order.tracking_number || fallback.tracking || "",
    phone: order.shipping_phone || order.guest_phone || fallback.phone || "",
    address: [order.shipping_address, order.shipping_city, order.shipping_postal_code].filter(Boolean).join(", ") || fallback.address || "",
    items: Array.isArray(order.items) ? order.items : fallback.items || [],
    notes: order.internal_notes || fallback.notes || "",
    tags: Array.isArray(order.tags) ? order.tags : fallback.tags || ["Custom order"],
    risk: fallback.risk || "Standard COD",
    createdAt: order.created_at || fallback.createdAt || new Date().toISOString(),
    date: order.created_at ? new Date(order.created_at).toLocaleString("en-PK", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    }) : fallback.date,
  };
}

function OrdersPanel({ onOpen, rows, products, accessKey, setAccessKey, connected, loading, error, onConnect }) {
  const [localOrders, setLocalOrders] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [activeTab, setActiveTab] = useState("Total Orders");
  const [orderSearch, setOrderSearch] = useState("");
  const [showDraft, setShowDraft] = useState(false);
  const [orderEdits, setOrderEdits] = useState({});
  const allRows = useMemo(() => {
    const localIds = new Set(localOrders.map((order) => order.id));
    return [
      ...localOrders,
      ...rows
        .filter((order) => !localIds.has(order.id))
        .map((order) => ({ ...order, ...(orderEdits[order.id] || {}) })),
    ];
  }, [localOrders, orderEdits, rows]);
  const periodSummary = buildOrderPeriodSummary(allRows);

  useEffect(() => {
    localStorage.removeItem("bustaniya-custom-orders");
    if (connected) setLocalOrders([]);
  }, [connected, rows]);

  const orderStatusCounts = useMemo(() => orderCategoryLabels.map((label) => ({
    label,
    count: label === "Total Orders"
      ? allRows.length
      : allRows.filter((order) => normalizePostexCategory(order.postexStatus || order.status) === label).length,
  })), [allRows]);
  useEffect(() => {
    if (!orderCategoryLabels.includes(activeTab)) setActiveTab("Total Orders");
  }, [activeTab]);
  const selectedOrder = allRows.find((order) => order.id === selectedId);
  const visibleRows = allRows.filter((order) => {
    const statusLabel = normalizePostexCategory(order.postexStatus || order.status);
    const query = orderSearch.toLowerCase();
    const matchesTab = activeTab === "Total Orders" || statusLabel === activeTab;
    const matchesSearch = [order.id, order.customer, order.city, order.tracking, order.phone, order.postexStatus, order.deliveryMethod, order.source]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(query);
    return matchesTab && matchesSearch;
  });

  function updateLocalOrder(orderId, changes) {
    setLocalOrders((current) => current.map((order) => order.id === orderId ? { ...order, ...changes } : order));
    setOrderEdits((current) => ({ ...current, [orderId]: { ...(current[orderId] || {}), ...changes } }));
  }

  async function saveCustomOrderToSupabase(order) {
    if (!accessKey) {
      window.alert("Custom order Supabase mein save karne ke liye pehle Orders admin access key connect karein.");
      return null;
    }

    try {
      const shouldBookPostex = String(order.deliveryMethod || "").trim().toLowerCase() === "postex";
      const response = await fetch("/api/admin/postex-custom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-access-key": accessKey,
        },
        body: JSON.stringify({
          orderRef: order.id,
          total: order.total,
          paymentStatus: order.paymentStatus,
          status: order.status,
          deliveryMethod: order.deliveryMethod,
          bookPostex: shouldBookPostex,
          source: order.source,
          notes: order.notes,
          customer: {
            name: order.customer,
            phone: order.phone,
            address: order.address,
            city: order.city,
          },
          items: order.items,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save custom order.");
      const savedOrder = formatSavedCustomOrder(result.supabaseOrder, order);
      return {
        ...savedOrder,
        ...order,
        ...savedOrder,
        rawId: result.supabaseOrder?.id || order.rawId,
        id: result.orderRef ? `#${result.orderRef}` : order.id,
        tracking: result.trackingNumber,
        status: result.courierStatus || order.status,
        postexStatus: result.courierStatus || order.status,
        fulfillmentStatus: result.courierBooked ? "Booked with PostEx" : order.fulfillmentStatus,
        deliveryMethod: result.courierBooked ? "PostEx" : order.deliveryMethod,
        postexBooked: Boolean(result.courierBooked),
        notes: [order.notes, `${result.courierBooked ? "PostEx" : "Supabase"} tracking: ${result.trackingNumber}`].filter(Boolean).join("\n"),
      };
    } catch (error) {
      window.alert(error.message || "Unable to save custom order to Supabase.");
      return null;
    }
  }

  async function createDraft(event) {
    event.preventDefault();
    const draftOrder = createDraftOrderFromForm(new FormData(event.currentTarget), products);
    const finalOrder = await saveCustomOrderToSupabase(draftOrder);
    if (!finalOrder) return;
    setShowDraft(false);
    if (accessKey) await onConnect(accessKey);
    setSelectedId(finalOrder.id);
  }

  function exportOrders() {
    const csv = [
      ["Order","Customer","City","Date","Total","Status","Payment","Fulfillment","Delivery Method","Tracking","Tags","Notes"],
      ...allRows.map((order) => [order.id,order.customer,order.city,order.date,order.total,order.postexStatus || order.status,order.paymentStatus || "",order.fulfillmentStatus || "",order.deliveryMethod || "",order.tracking || "",(order.tags || []).join(" | "),order.notes || ""]),
    ].map((row) => row.map((cell) => `"${String(cell).replaceAll('"','""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type:"text/csv" }));
    link.download = `bustaniya-orders-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
  return <><div className="adminTitle"><div><p>FULFILMENT</p><h1>Orders</h1><span>PostEx status, custom admin orders, fulfillment, returns and team notes.</span></div><button onClick={exportOrders} disabled={!allRows.length}>Export orders</button></div>
    {!connected && <form className="ordersConnect" onSubmit={(event)=>{event.preventDefault();onConnect(accessKey)}}>
      <div><b>Connect live Supabase orders</b><span>Enter the existing Orders admin access key. It stays in this browser session only.</span></div>
      <input type="password" value={accessKey} onChange={(event)=>setAccessKey(event.target.value)} placeholder="Admin orders access key" required />
      <button disabled={loading}>{loading?"Connecting...":"Connect orders"}</button>
      {error && <p>{error}</p>}
    </form>}
    {connected && error && <div className="adminErrorBanner">{error}</div>}
    <div className="moduleQuickLinks"><button className="customOrderCta" onClick={() => setShowDraft(true)}><Plus /> Create custom order</button>{["Returns / exchanges","Refund queue","Risk review"].map(item=><button key={item} onClick={()=>onOpen({module:"Orders",feature:item})}>{item}</button>)}</div>
    <section className="orderPeriodGrid">
      {periodSummary.map((period) => <article className="adminCard orderPeriodCard" key={period.label}>
        <p>{period.label}</p>
        <div><b>{period.orders}</b><span>Orders</span></div>
        <ul>
          <li><span>Sales</span><b>Rs. {period.sales.toLocaleString()}</b></li>
          <li><span>Average</span><b>Rs. {period.average.toLocaleString()}</b></li>
          <li><span>Range</span><b>{period.range}</b></li>
        </ul>
      </article>)}
    </section>
    <section className="postexCategoryGrid">
      {orderStatusCounts.map((category) => <button key={category.label} className={activeTab === category.label ? "active" : ""} onClick={() => setActiveTab(category.label)}>
        <span>{category.label.toUpperCase()}</span>
        <b>{category.count}</b>
      </button>)}
    </section>
    <section className="adminCard managementCard">
      <div className="ordersToolbar">
        <div className="orderTabs">{orderCategoryLabels.map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div>
        <div className="inlineSearch"><Search /><input value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} placeholder="Search order, customer, tracking..." /></div>
      </div>
      <OrderTable rows={visibleRows} onSelect={(order) => setSelectedId(order.id)} />
    </section>
    {showDraft && <DraftOrderDialog products={products} onClose={() => setShowDraft(false)} onCreate={createDraft} />}
    {selectedOrder && <OrderDetailDrawer order={selectedOrder} accessKey={accessKey} onClose={() => setSelectedId("")} onUpdate={updateLocalOrder} />}
  </>;
}

function FinancePanel({ orders, products, connected }) {
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const [taxKind, setTaxKind] = useState("GST");
  const [taxRate, setTaxRate] = useState(4);
  const [packagingExpense, setPackagingExpense] = useState(0);
  const [deliveryExpense, setDeliveryExpense] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [financeReady, setFinanceReady] = useState(false);

  useEffect(() => {
    const savedFinance = localStorage.getItem("bustaniya-admin-finance");
    if (!savedFinance) {
      setFinanceReady(true);
      return;
    }
    try {
      const parsed = JSON.parse(savedFinance);
      setTaxKind(parsed.taxKind || "GST");
      setTaxRate(parsed.taxRate ?? 4);
      setPackagingExpense(parsed.packagingExpense ?? 0);
      setDeliveryExpense(parsed.deliveryExpense ?? 0);
      setExpenses(Array.isArray(parsed.expenses) ? parsed.expenses : []);
    } catch {}
    setFinanceReady(true);
  }, []);

  useEffect(() => {
    if (!financeReady) return;
    localStorage.setItem("bustaniya-admin-finance", JSON.stringify({
      taxKind,
      taxRate,
      packagingExpense,
      deliveryExpense,
      expenses,
    }));
  }, [taxKind, taxRate, packagingExpense, deliveryExpense, expenses, financeReady]);

  const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;
  const activeOrders = connected ? safeOrders.filter(isRevenueOrder) : [];
  const deliveredOrders = activeOrders.filter(isDeliveredOrder);
  const pendingOrders = activeOrders.filter(isPendingCodOrder);
  const grossRevenue = deliveredOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const receivedCash = deliveredOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const receivables = pendingOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const productCosts = new Map(safeProducts.map((product) => [String(product.id), Number(product.costTotalPkr || 0)]));
  const deliveredCogs = deliveredOrders.reduce((sum, order) => sum + normalizeOrderItems(order.raw || order)
    .reduce((itemTotal, item) => itemTotal + Number(item.quantity || 0) * Number(productCosts.get(String(item.productId)) || 0), 0), 0);
  const manualExpenseTotal = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const packagingTotal = Number(packagingExpense || 0);
  const deliveryTotal = Number(deliveryExpense || 0);
  const expenseTotal = manualExpenseTotal + packagingTotal + deliveryTotal;
  const taxEstimate = Math.round(grossRevenue * (Number(taxRate || 0) / 100));
  const netProfit = grossRevenue - deliveredCogs - expenseTotal - taxEstimate;
  const inventoryRetailValue = safeProducts.reduce((sum, product) => sum + Number(product.price || 0) * Number(product.stock || 0), 0);
  const inventoryCostValue = safeProducts.reduce((sum, product) => sum + Number(product.costTotalPkr || 0) * Number(product.stock || 0), 0);
  const lowStockValue = safeProducts
    .filter((product) => Number(product.stock || 0) <= Number(product.lowStockThreshold || 5))
    .reduce((sum, product) => sum + Number(product.price || 0) * Number(product.stock || 0), 0);
  const profitMargin = grossRevenue ? Math.round((netProfit / grossRevenue) * 100) : 0;

  const ledgerRows = [
    ...deliveredOrders.slice(0, 8).map((order) => ({
      id: order.id,
      date: order.date,
      type: "Income received",
      account: order.customer,
      amount: Number(order.total || 0),
      status: order.status,
    })),
    ...expenses.slice(0, 5).map((expense) => ({
      id: `EXP-${expense.id}`,
      date: formatFinanceDate(expense.date),
      type: "Expense",
      account: expense.title,
      amount: -Number(expense.amount || 0),
      status: expense.category,
    })),
  ];

  function addExpense(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setExpenses((current) => [{
      id: Date.now(),
      title: data.get("title"),
      category: data.get("category"),
      amount: Number(data.get("amount") || 0),
      date: data.get("date") || new Date().toISOString().slice(0, 10),
    }, ...current]);
    event.currentTarget.reset();
  }

  function exportFinance() {
    const csv = [
      ["Metric","Value"],
      ["Gross revenue", grossRevenue],
      ["Received cash", receivedCash],
      ["Pending COD / receivables", receivables],
      ["Actual product cost (COGS)", deliveredCogs],
      ["Manual expenses", manualExpenseTotal],
      ["Packaging expense", packagingTotal],
      ["Delivery expense", deliveryTotal],
      [`${taxKind} estimate`, taxEstimate],
      ["Net profit", netProfit],
      ["Inventory retail value", inventoryRetailValue],
      ["Inventory cost value", inventoryCostValue],
    ].map((row) => row.map((cell) => `"${String(cell).replaceAll('"','""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type:"text/csv" }));
    link.download = `bustaniya-finance-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return <div className="financeSystem">
    <div className="adminTitle">
      <div><p>FINANCE MANAGER</p><h1>Finances</h1><span>{connected ? "Live order totals with actual product costs." : "No finance data yet. Connect live orders or add expenses to start tracking."}</span></div>
      <button onClick={exportFinance}><ReceiptText /> Export report</button>
    </div>

    <div className="miniMetricGrid financeMetrics">
      <article><CircleDollarSign /><span><b>{money(grossRevenue)}</b>Gross revenue</span></article>
      <article><WalletCards /><span><b>{money(receivedCash)}</b>Cash received</span></article>
      <article><Landmark /><span><b>{money(receivables)}</b>Pending COD</span></article>
      <article className={netProfit < 0 ? "alertMetric" : ""}><TrendingUp /><span><b>{money(netProfit)}</b>Net profit</span></article>
    </div>

    <section className="financeGrid">
      <div className="adminCard financeSummaryCard">
        <div className="cardHeading"><div><h2>Profit summary</h2><p>Based on delivered orders, saved product cost and expenses</p></div><b>{profitMargin}% margin</b></div>
        <div className="financeStatement">
          <div><span>Sales revenue</span><b>{money(grossRevenue)}</b></div>
          <div><span>Actual product cost</span><b>- {money(deliveredCogs)}</b></div>
          <div><span>Manual expenses</span><b>- {money(manualExpenseTotal)}</b></div>
          <div><span>Packaging expense</span><b>- {money(packagingTotal)}</b></div>
          <div><span>Delivery expense</span><b>- {money(deliveryTotal)}</b></div>
          <div><span>{taxKind} provision</span><b>- {money(taxEstimate)}</b></div>
          <div className="statementTotal"><span>Net profit</span><b>{money(netProfit)}</b></div>
        </div>
        <div className="financeControls">
          <label>Tax type<select value={taxKind} onChange={(event) => setTaxKind(event.target.value)}><option>GST</option><option>Tax</option><option>Sales tax</option><option>Withholding</option></select></label>
          <label>{taxKind} %<input type="number" min="0" max="100" value={taxRate} onChange={(event) => setTaxRate(event.target.value)} /></label>
          <label>Packaging expense<input type="number" min="0" value={packagingExpense} onChange={(event) => setPackagingExpense(event.target.value)} /></label>
          <label>Delivery expense<input type="number" min="0" value={deliveryExpense} onChange={(event) => setDeliveryExpense(event.target.value)} /></label>
        </div>
      </div>

      <div className="adminCard financeSummaryCard">
        <div className="cardHeading"><div><h2>Inventory finance</h2><p>Retail and saved purchase value</p></div></div>
        <div className="inventoryFinanceList">
          <div><span>Retail value on hand</span><b>{money(inventoryRetailValue)}</b></div>
          <div><span>Purchase value on hand</span><b>{money(inventoryCostValue)}</b></div>
          <div><span>Low-stock retail exposure</span><b>{money(lowStockValue)}</b></div>
          <div><span>Products tracked</span><b>{safeProducts.length}</b></div>
        </div>
      </div>
    </section>

    <section className="financeGrid financeGridWide">
      <div className="adminCard managementCard">
        <div className="inventoryListHead"><div><h2>Finance ledger</h2><span>Orders and expenses in one view</span></div></div>
        <div className="adminTableWrap"><table className="adminTable financeTable"><thead><tr><th>Ref</th><th>Date</th><th>Type</th><th>Account</th><th>Status</th><th>Amount</th></tr></thead><tbody>
          {ledgerRows.map((row) => <tr key={`${row.id}-${row.type}`}><td><b>{row.id}</b></td><td>{row.date}</td><td>{row.type}</td><td>{row.account}</td><td><span className={`statusBadge ${String(row.status).toLowerCase()}`}>{row.status}</span></td><td className={row.amount < 0 ? "expenseAmount" : "incomeAmount"}>{row.amount < 0 ? "-" : "+"} {money(Math.abs(row.amount))}</td></tr>)}
          {!ledgerRows.length && <tr><td colSpan="6" className="emptyFinanceCell">No finance entries yet.</td></tr>}
        </tbody></table></div>
      </div>

      <form className="adminCard financeExpenseForm" onSubmit={addExpense}>
        <h2>Add expense</h2>
        <label>Expense title<input name="title" required placeholder="e.g. Fabric purchase" /></label>
        <div className="formRow"><label>Category<select name="category"><option>Inventory</option><option>Marketing</option><option>Operations</option><option>Bills</option><option>Delivery</option><option>Other</option></select></label><label>Amount<input name="amount" type="number" min="0" required placeholder="0" /></label></div>
        <label>Date<input name="date" type="date" defaultValue={new Date().toISOString().slice(0,10)} /></label>
        <button>Add expense</button>
      </form>
    </section>
  </div>;
}

function InventoryPanel({ products, movements, onAdjust, onCreateCustomInventory }) {
  const [tab, setTab] = useState("Stock");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogProductId, setDialogProductId] = useState("");
  const [inventoryView, setInventoryView] = useState("All");
  const [inventorySearch, setInventorySearch] = useState("");
  const [localHistory, setLocalHistory] = useState([]);
  const [sourceSearch, setSourceSearch] = useState("");
  const [sourcesReady, setSourcesReady] = useState(false);
  const [inventorySources, setInventorySources] = useState([
    { id: "stitching-main", name: "Main stitching unit", type: "Stitching unit", contact: "", location: "Pakistan", notes: "Primary production source", status: "Active" },
    { id: "materials-general", name: "General trims supplier", type: "Material supplier", contact: "", location: "Pakistan", notes: "Buttons, laces and finishing items", status: "Active" },
  ]);
  const [materials, setMaterials] = useState([
    { id: "buttons", item: "Buttons", category: "Buttons", sourceId: "materials-general", quantity: 0, unit: "pcs", unitCost: 0, reorderAt: 50, notes: "", status: "Tracked" },
    { id: "laces", item: "Laces", category: "Laces", sourceId: "materials-general", quantity: 0, unit: "meters", unitCost: 0, reorderAt: 20, notes: "", status: "Tracked" },
  ]);

  useEffect(() => {
    const saved = localStorage.getItem("bustaniya-inventory-sources");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.sources)) setInventorySources(parsed.sources);
        if (Array.isArray(parsed.materials)) setMaterials(parsed.materials);
      } catch {}
    }
    setSourcesReady(true);
  }, []);

  useEffect(() => {
    if (!sourcesReady) return;
    localStorage.setItem("bustaniya-inventory-sources", JSON.stringify({
      sources: inventorySources,
      materials,
    }));
  }, [inventorySources, materials, sourcesReady]);

  const history = useMemo(() => {
    const remoteHistory = (movements || []).map((entry) => {
      const product = products.find((item) => String(item.id) === String(entry.product_id));
      return {
        id: entry.id,
        product: product?.name || entry.product_id,
        change: Number(entry.quantity_change || 0),
        reason: entry.reason || "Stock count correction",
        date: entry.created_at ? new Date(entry.created_at).toLocaleString("en-PK") : "",
        user: "Admin",
      };
    });
    return [...localHistory, ...remoteHistory];
  }, [localHistory, movements, products]);

  const total = products.reduce((sum, product) => sum + Number(product.stock || 0), 0);
  const out = products.filter((product) => Number(product.stock || 0) === 0).length;
  const low = products.filter((product) => {
    const stock = Number(product.stock || 0);
    return stock > 0 && stock <= Number(product.lowStockThreshold || 5);
  }).length;
  const value = products.reduce((sum, product) => sum + Number(product.price || 0) * Number(product.stock || 0), 0);
  const materialValue = materials.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitCost || 0), 0);
  const lowMaterialCount = materials.filter((item) => Number(item.quantity || 0) <= Number(item.reorderAt || 0)).length;

  const visibleInventoryRows = products.filter((product) => {
    const stock = Number(product.stock || 0);
    const threshold = Number(product.lowStockThreshold || 5);
    const query = inventorySearch.toLowerCase();
    const matchesSearch =
      product.name.toLowerCase().includes(query) ||
      String(product.sku || product.articleNumber || "").toLowerCase().includes(query);
    const matchesView =
      inventoryView === "All" ||
      (inventoryView === "Low stock" && stock > 0 && stock <= threshold) ||
      (inventoryView === "Out of stock" && stock === 0);
    return matchesSearch && matchesView;
  });

  const filteredSources = inventorySources.filter((source) => {
    const query = sourceSearch.toLowerCase();
    return [source.name, source.type, source.contact, source.location, source.notes]
      .some((value) => String(value || "").toLowerCase().includes(query));
  });

  const filteredMaterials = materials.filter((item) => {
    const source = inventorySources.find((entry) => entry.id === item.sourceId);
    const query = sourceSearch.toLowerCase();
    return [item.item, item.category, item.unit, item.notes, source?.name]
      .some((value) => String(value || "").toLowerCase().includes(query));
  });

  function inventoryStatus(product) {
    const stock = Number(product.stock || 0);
    if (stock === 0) return { label: "Out of stock", className: "cancelled" };
    if (stock <= Number(product.lowStockThreshold || 5)) return { label: "Low stock", className: "processing" };
    return { label: "In stock", className: "delivered" };
  }

  function openAdjust(productId = "") {
    setDialogProductId(productId || products[0]?.id || "__custom__");
    setDialogOpen(true);
  }

  async function adjustStock(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const id = data.get("product");
    const amount = Number(data.get("amount"));
    const reason = data.get("reason");

    if (!Number.isFinite(amount) || amount === 0) {
      window.alert("Please enter a non-zero quantity, for example +10 or -2.");
      return;
    }

    if (id === "__custom__") {
      const name = String(data.get("customName") || "").trim();
      const sku = String(data.get("customSku") || "").trim() || `CUSTOM-${Date.now().toString().slice(-5)}`;
      if (!name) {
        window.alert("Please enter a product name.");
        return;
      }
      if (amount < 0) {
        window.alert("Opening stock cannot be negative.");
        return;
      }
      try {
        await onCreateCustomInventory({ name, sku, stock: amount });
        setLocalHistory((current) => [{
          id: `local-${Date.now()}`,
          product: name,
          change: amount,
          reason: "New product",
          date: new Date().toLocaleString("en-PK"),
          user: "Admin",
        }, ...current]);
        setDialogOpen(false);
        setTab("Stock");
      } catch (error) {
        window.alert(error.message || "Unable to add product.");
      }
      return;
    }

    const product = products.find((item) => String(item.id) === String(id));
    if (!product) {
      window.alert("Please select a valid product.");
      return;
    }

    try {
      await onAdjust(id, amount, reason);
      setLocalHistory((current) => [{
        id: `local-${Date.now()}`,
        product: product.name,
        change: amount,
        reason,
        date: new Date().toLocaleString("en-PK"),
        user: "Admin",
      }, ...current]);
      setDialogOpen(false);
      setTab("Stock");
    } catch (error) {
      window.alert(error.message || "Unable to adjust inventory.");
    }
  }

  function addInventorySource(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") || "").trim();
    if (!name) return;
    setInventorySources((current) => [{
      id: `source-${Date.now()}`,
      name,
      type: data.get("type") || "Material supplier",
      contact: data.get("contact") || "",
      location: data.get("location") || "",
      notes: data.get("notes") || "",
      status: data.get("status") || "Active",
    }, ...current]);
    event.currentTarget.reset();
  }

  function addMaterial(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const item = String(data.get("item") || "").trim();
    if (!item) return;
    setMaterials((current) => [{
      id: `material-${Date.now()}`,
      item,
      category: data.get("category") || "Other material",
      sourceId: data.get("sourceId") || inventorySources[0]?.id || "",
      quantity: Number(data.get("quantity") || 0),
      unit: data.get("unit") || "pcs",
      unitCost: Number(data.get("unitCost") || 0),
      reorderAt: Number(data.get("reorderAt") || 0),
      notes: data.get("notes") || "",
      status: "Tracked",
    }, ...current]);
    event.currentTarget.reset();
  }

  function updateMaterialQuantity(materialId, change) {
    setMaterials((current) => current.map((item) =>
      item.id === materialId
        ? { ...item, quantity: Math.max(0, Number(item.quantity || 0) + change) }
        : item
    ));
  }

  return <div className="inventorySystem">
    <div className="adminTitle"><div><p>OPERATIONS</p><h1>Inventory</h1><span>Track finished products, stitching units, suppliers and materials like buttons, laces and trims.</span></div><button onClick={() => tab === "Sources" ? setTab("Sources") : openAdjust()}><Plus /> {tab === "Sources" ? "Add source below" : "Adjust stock"}</button></div>
    <div className="miniMetricGrid">
      <article><Boxes /><span><b>{total}</b>Available units</span></article>
      <article className={low ? "alertMetric" : ""}><TrendingUp /><span><b>{low}</b>Low stock</span></article>
      <article><Store /><span><b>{inventorySources.length}</b>Sources</span></article>
      <article className={lowMaterialCount ? "alertMetric" : ""}><Tags /><span><b>Rs. {(value + materialValue).toLocaleString()}</b>Stock + material value</span></article>
    </div>

    {low + out > 0 && <div className="inventoryAlert"><Bell /><div><b>{low + out} products need attention</b><span>Out-of-stock products cannot be ordered, and low stock is highlighted here.</span></div><button onClick={() => setInventoryView(low ? "Low stock" : "Out of stock")}>Review items</button></div>}
    {lowMaterialCount > 0 && <div className="inventoryAlert materialAlert"><Bell /><div><b>{lowMaterialCount} material items need reorder review</b><span>Buttons, laces, trims and other raw materials are tracked separately from finished product stock.</span></div><button onClick={() => setTab("Sources")}>Review materials</button></div>}

    <div className="inventoryTabs">
      {["Stock","Sources","History"].map(item => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item === "Sources" ? "Sources & Materials" : item}</button>)}
    </div>

    {tab === "Stock" && <section className="adminCard managementCard inventoryLedger">
      <div className="inventoryViewBar">
        {["All","Low stock","Out of stock"].map(item => <button type="button" key={item} className={inventoryView === item ? "active" : ""} onClick={() => setInventoryView(item)}>{item}</button>)}
      </div>
      <div className="inventoryControlBar simpleInventoryControls">
        <div className="inlineSearch"><Search /><input value={inventorySearch} onChange={(event) => setInventorySearch(event.target.value)} placeholder="Search products or SKU..." /></div>
        <button type="button" onClick={() => openAdjust("__custom__")}><Plus /> Add product with stock</button>
      </div>
      <div className="adminTableWrap"><table className="adminTable inventoryTable simpleInventoryTable"><thead><tr><th>Product</th><th>SKU</th><th>Available</th><th>Threshold</th><th>Retail value</th><th>Status</th><th /></tr></thead><tbody>{visibleInventoryRows.map(product => { const status = inventoryStatus(product); return <tr key={product.id}><td><div className="tableProduct"><span style={{backgroundImage:`url(${product.image})`}}/><b>{product.name}</b></div></td><td>{product.sku || product.articleNumber || `BST-${String(product.id).padStart(4,"0")}`}</td><td><b className={Number(product.stock || 0) <= Number(product.lowStockThreshold || 5) ? "stockLow" : ""}>{Number(product.stock || 0)}</b></td><td>{Number(product.lowStockThreshold || 5)}</td><td>Rs. {(Number(product.price || 0) * Number(product.stock || 0)).toLocaleString()}</td><td><span className={`statusBadge ${status.className}`}>{status.label}</span></td><td><button className="adjustStockButton" onClick={() => openAdjust(product.id)}>Adjust</button></td></tr>})}</tbody></table>{!visibleInventoryRows.length&&<div className="inventoryEmpty">No products match this view.</div>}</div>
    </section>}

    {tab === "Sources" && <InventorySourcesPanel
      sources={filteredSources}
      allSources={inventorySources}
      materials={filteredMaterials}
      sourceSearch={sourceSearch}
      setSourceSearch={setSourceSearch}
      onAddSource={addInventorySource}
      onAddMaterial={addMaterial}
      onUpdateMaterialQuantity={updateMaterialQuantity}
    />}

    {tab === "History" && <InventoryList title="Stock adjustment history" headers={["Product","Change","Reason","Date","User"]} rows={history.map(x => [x.product, x.change > 0 ? `+${x.change}` : x.change, x.reason, x.date, x.user])} empty="No stock adjustments yet." />}

    {dialogOpen && <InventoryDialog products={products} productChoice={dialogProductId} setProductChoice={setDialogProductId} onClose={() => setDialogOpen(false)} onAdjust={adjustStock} />}
  </div>;
}

function InventorySourcesPanel({
  sources,
  allSources,
  materials,
  sourceSearch,
  setSourceSearch,
  onAddSource,
  onAddMaterial,
  onUpdateMaterialQuantity,
}) {
  const sourceName = (sourceId) => allSources.find((source) => source.id === sourceId)?.name || "Unassigned";
  const materialValue = materials.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitCost || 0), 0);

  return <div className="inventorySourcesGrid">
    <section className="adminCard managementCard inventorySourcesMain">
      <div className="inventoryListHead"><div><h2>Sources and units</h2><span>Stitching units, vendors and material suppliers</span></div></div>
      <div className="inventoryControlBar simpleInventoryControls sourceSearchBar">
        <div className="inlineSearch"><Search /><input value={sourceSearch} onChange={(event) => setSourceSearch(event.target.value)} placeholder="Search sources, material, supplier, contact..." /></div>
      </div>
      <div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Source</th><th>Type</th><th>Contact</th><th>Location</th><th>Status</th></tr></thead><tbody>
        {sources.map((source) => <tr key={source.id}><td><b>{source.name}</b><small className="trackingNumber">{source.notes || "No notes"}</small></td><td>{source.type}</td><td>{source.contact || "-"}</td><td>{source.location || "-"}</td><td><span className={`statusBadge ${source.status === "Active" ? "activeStatus" : "processing"}`}>{source.status}</span></td></tr>)}
        {!sources.length && <tr><td colSpan="5"><div className="inventoryEmpty">No sources match this search.</div></td></tr>}
      </tbody></table></div>
    </section>

    <form className="adminCard sourceFormCard" onSubmit={onAddSource}>
      <h2>Add source</h2>
      <label>Name<input name="name" required placeholder="e.g. Lahore stitching unit" /></label>
      <div className="formRow"><label>Type<select name="type"><option>Stitching unit</option><option>Fabric supplier</option><option>Material supplier</option><option>Embroidery unit</option><option>Packaging supplier</option><option>Other source</option></select></label><label>Status<select name="status"><option>Active</option><option>Paused</option></select></label></div>
      <div className="formRow"><label>Contact<input name="contact" placeholder="Phone / WhatsApp" /></label><label>Location<input name="location" placeholder="City or area" /></label></div>
      <label>Notes<textarea name="notes" rows="3" placeholder="Capacity, rates, lead time..." /></label>
      <button>Add source</button>
    </form>

    <section className="adminCard managementCard inventoryMaterialsMain">
      <div className="inventoryListHead"><div><h2>Materials</h2><span>Buttons, laces, fabric, trims and packaging. Value: Rs. {materialValue.toLocaleString()}</span></div></div>
      <div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Material</th><th>Category</th><th>Source</th><th>Qty</th><th>Reorder</th><th>Value</th><th /></tr></thead><tbody>
        {materials.map((item) => {
          const low = Number(item.quantity || 0) <= Number(item.reorderAt || 0);
          return <tr key={item.id}><td><b>{item.item}</b><small className="trackingNumber">{item.notes || item.unit}</small></td><td>{item.category}</td><td>{sourceName(item.sourceId)}</td><td><b className={low ? "stockLow" : ""}>{Number(item.quantity || 0).toLocaleString()} {item.unit}</b></td><td>{Number(item.reorderAt || 0).toLocaleString()} {item.unit}</td><td>Rs. {(Number(item.quantity || 0) * Number(item.unitCost || 0)).toLocaleString()}</td><td><div className="materialQtyActions"><button type="button" onClick={() => onUpdateMaterialQuantity(item.id, -1)}><Minus /></button><button type="button" onClick={() => onUpdateMaterialQuantity(item.id, 1)}><Plus /></button></div></td></tr>;
        })}
        {!materials.length && <tr><td colSpan="7"><div className="inventoryEmpty">No materials match this search.</div></td></tr>}
      </tbody></table></div>
    </section>

    <form className="adminCard sourceFormCard" onSubmit={onAddMaterial}>
      <h2>Add material</h2>
      <label>Material item<input name="item" required placeholder="e.g. Pearl buttons, cotton lace" /></label>
      <div className="formRow"><label>Category<select name="category"><option>Buttons</option><option>Laces</option><option>Fabric</option><option>Thread</option><option>Embroidery</option><option>Labels</option><option>Packaging</option><option>Other material</option></select></label><label>Source<select name="sourceId">{allSources.map((source) => <option value={source.id} key={source.id}>{source.name}</option>)}</select></label></div>
      <div className="formRow"><label>Quantity<input name="quantity" type="number" min="0" step="0.01" defaultValue="0" /></label><label>Unit<select name="unit"><option>pcs</option><option>meters</option><option>yards</option><option>rolls</option><option>kg</option><option>packs</option></select></label></div>
      <div className="formRow"><label>Unit cost<input name="unitCost" type="number" min="0" step="0.01" defaultValue="0" /></label><label>Reorder at<input name="reorderAt" type="number" min="0" step="0.01" defaultValue="0" /></label></div>
      <label>Notes<textarea name="notes" rows="3" placeholder="Color, size, use in product, supplier rate..." /></label>
      <button>Add material</button>
    </form>
  </div>;
}

function InventoryList({ title, action, onAction, headers, rows, empty }) {
  return <section className="adminCard managementCard"><div className="inventoryListHead"><div><h2>{title}</h2><span>{rows.length} records</span></div>{action&&<button onClick={onAction}><Plus />{action}</button>}</div><div className="adminTableWrap"><table className="adminTable"><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((cell,j)=><td key={j}>{j===0?<b>{cell}</b>:cell}</td>)}</tr>)}</tbody></table>{!rows.length&&<div className="inventoryEmpty">{empty||"No records found."}</div>}</div></section>;
}

function VariantInventoryDrawer({ product, onClose }) {
  const variants = productVariants(product);
  const total = variants.reduce((sum, variant) => sum + Number(variant.stock || 0), 0);
  const low = variants.filter((variant) => Number(variant.stock || 0) <= Number(variant.low || 5)).length;
  return <><div className="adminOverlay" onClick={onClose} /><aside className="orderDetailDrawer">
    <header><div><p>VARIANT INVENTORY</p><h2>{product.name}</h2><span>{variants.length} size/color combinations - {total} units</span></div><button onClick={onClose}><X /></button></header>
    <div className="orderDetailBody">
      <div className="miniMetricGrid productMetrics"><article><Boxes /><span><b>{total}</b>Total units</span></article><article className={low ? "alertMetric" : ""}><TrendingUp /><span><b>{low}</b>Low variants</span></article><article><Tags /><span><b>{new Set(variants.map((variant) => variant.size)).size}</b>Sizes</span></article><article><Store /><span><b>{new Set(variants.map((variant) => variant.color)).size}</b>Colors</span></article></div>
      <section className="adminCard orderItemsCard"><div className="inventoryListHead"><div><h2>Variant stock</h2><span>Manage size and colour-level availability</span></div></div><div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Size</th><th>Color</th><th>SKU</th><th>Available</th><th>Alert</th><th>Status</th></tr></thead><tbody>{variants.map((variant) => <tr key={variant.id}><td><b>{variant.size}</b></td><td>{variant.color}</td><td>{variant.sku}</td><td><input className="variantStockInput" type="number" min="0" defaultValue={variant.stock} /></td><td><input className="variantStockInput" type="number" min="0" defaultValue={variant.low} /></td><td><span className={`statusBadge ${variant.stock <= variant.low ? "processing" : "activeStatus"}`}>{variant.stock <= variant.low ? "Low stock" : "In stock"}</span></td></tr>)}</tbody></table></div></section>
      <section className="adminCard orderOpsCard"><h3>Private drops</h3><div className="formRow"><label>Status<select defaultValue={productStatus(product)}><option>Active</option><option>Draft</option><option>Archived</option><option>Unlisted</option></select></label><label>Collection<input defaultValue={productCollection(product)} /></label></div><button>Save variant plan</button></section>
    </div>
  </aside></>;
}

function InventoryDialog({ products, productChoice, setProductChoice, onClose, onAdjust }) {
  return <><div className="adminOverlay" onClick={onClose}/><form className="inventoryDialog" onSubmit={onAdjust}><DialogHead title="Adjust inventory" onClose={onClose}/>
    <label>Product<select name="product" value={productChoice} onChange={(event)=>setProductChoice(event.target.value)}><option value="__custom__">Add new product</option>{products.map(p=><option value={p.id} key={p.id}>{p.name} - {p.stock} available</option>)}</select></label>
    {productChoice==="__custom__"&&<div className="formRow"><label>Product name<input name="customName" required placeholder="e.g. Embroidered Dupatta"/></label><label>SKU<input name="customSku" placeholder="Optional"/></label></div>}
    <label>{productChoice==="__custom__"?"Opening stock":"Stock change"}<input name="amount" required type="number" placeholder={productChoice==="__custom__"?"10":"+10 or -2"}/></label>
    <label>Reason<select name="reason"><option>Stock count correction</option><option>Received stock</option><option>Damaged</option><option>Returned</option><option>Promotion</option></select></label>
    <button className="dialogSave">Save stock</button>
  </form></>;
}

function DialogHead({title,onClose}) { return <div className="dialogHead"><h2>{title}</h2><button type="button" onClick={onClose}><X/></button></div>; }

function DraftOrderDialog({ products = [], onClose, onCreate }) {
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id ? String(products[0].id) : "__custom__");
  const [quantity, setQuantity] = useState(1);
  const [postexCities, setPostexCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState("");
  const selectedProduct = products.find((product) => String(product.id) === selectedProductId);
  const productSizes = Array.isArray(selectedProduct?.sizes) && selectedProduct.sizes.length ? selectedProduct.sizes : ["S", "M", "L"];
  const productColors = Array.isArray(selectedProduct?.colors) && selectedProduct.colors.length ? selectedProduct.colors : ["Default"];
  const unitPrice = Number(selectedProduct?.price || 0);
  const calculatedTotal = unitPrice * Number(quantity || 1);

  useEffect(() => {
    let active = true;
    setCitiesLoading(true);
    fetch("/api/postex/cities")
      .then((response) => response.json().then((result) => ({ ok: response.ok, result })))
      .then(({ ok, result }) => {
        if (!active) return;
        if (!ok) throw new Error(result.error || "Unable to load PostEx cities.");
        setPostexCities(result.cities || []);
        setCitiesError("");
      })
      .catch((error) => {
        if (!active) return;
        setCitiesError(error.message);
      })
      .finally(() => {
        if (active) setCitiesLoading(false);
      });
    return () => { active = false; };
  }, []);

  return <><div className="adminOverlay" onClick={onClose} /><form className="orderDialog" onSubmit={onCreate}>
    <DialogHead title="Custom order" onClose={onClose} />
    <div className="formRow"><label>Customer<input name="customer" required placeholder="Instagram customer name" /></label><label>Phone<input name="phone" required placeholder="03xx xxxxxxx" /></label></div>
    <div className="formRow"><label>PostEx city{postexCities.length ? <select name="city" required defaultValue=""><option value="">{citiesLoading ? "Loading cities..." : "Select delivery city"}</option>{postexCities.map((city) => <option key={city}>{city}</option>)}</select> : <input name="city" required placeholder={citiesLoading ? "Loading PostEx cities..." : "Enter delivery city"} />}{citiesError && <small className="trackingNumber">{citiesError}</small>}</label><label>Source<select name="source"><option>Manual</option><option>Instagram DM</option><option>WhatsApp</option><option>Phone call</option><option>Walk-in</option></select></label></div>
    <div className="formRow"><label>Payment<select name="paymentStatus"><option>COD pending</option><option>Advance pending</option><option>Paid</option></select></label><label>Delivery method<select name="deliveryMethod"><option>Rider / same city</option><option>PostEx</option><option>Customer pickup</option><option>Staff delivery</option><option>Manual courier</option><option>PostEx later</option></select></label></div>
    <div className="formRow"><label>Order status<select name="status">{customOrderStatusOptions.map((status) => <option key={status}>{status}</option>)}</select></label><label>Fulfillment<select name="fulfillmentStatus"><option>Manual delivery</option><option>Rider assigned</option><option>Ready for pickup</option><option>Booked with PostEx</option><option>Delivered</option><option>On hold</option></select></label></div>
    <label>Shipping address<textarea name="address" rows="3" required placeholder="Full delivery address from DM" /></label>
    <label>Item<select name="productId" value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)}>
      {products.map((product) => <option key={product.id} value={product.id}>{product.name} - Rs. {Number(product.price || 0).toLocaleString()}</option>)}
      <option value="__custom__">Custom item</option>
    </select></label>
    {selectedProduct ? <div className="formRow"><label>Size<select name="size">{productSizes.map((size) => <option key={size}>{size}</option>)}</select></label><label>Color<select name="color">{productColors.map((color) => <option key={color}>{color}</option>)}</select></label></div> : <label>Custom item<input name="item" required placeholder="Product, size, color" /></label>}
    <div className="formRow"><label>Quantity<input name="quantity" type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label><label>Unit price<input key={selectedProductId} name="unitPrice" type="number" min="0" defaultValue={unitPrice} readOnly={!!selectedProduct} /></label></div>
    <label><span>Total amount</span>{selectedProduct ? <input name="total" type="number" min="0" required value={calculatedTotal} readOnly /> : <input name="total" type="number" min="0" required placeholder="0" />}</label>
    <label>Internal note<textarea name="notes" rows="3" placeholder="Rider name, pickup timing, DM link, customer request" /></label>
    <button className="dialogSave">Create custom order</button>
  </form></>;
}

function OrderDetailDrawer({ order, accessKey, onClose, onUpdate }) {
  const [tracking, setTracking] = useState(order.tracking || "");
  const [orderStage, setOrderStage] = useState(order.postexStatus || order.status || "Un-Assigned By Me");
  const [paymentStatus, setPaymentStatus] = useState(order.paymentStatus || "COD pending");
  const [fulfillmentStatus, setFulfillmentStatus] = useState(order.fulfillmentStatus || "Unfulfilled");
  const [deliveryMethod, setDeliveryMethod] = useState(order.deliveryMethod || (order.tracking ? "PostEx" : "Rider / same city"));
  const [risk, setRisk] = useState(order.risk || "Standard COD");
  const [tags, setTags] = useState((order.tags || []).join(", "));
  const [notes, setNotes] = useState(order.notes || "");
  const [returnStatus, setReturnStatus] = useState(order.returnStatus || "No return");
  const items = normalizeOrderItems(order);

  function saveChanges() {
    onUpdate(order.id, {
      tracking,
      status: orderStage,
      postexStatus: orderStage,
      paymentStatus,
      fulfillmentStatus,
      deliveryMethod,
      risk,
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      notes,
      returnStatus,
    });
  }

  async function bookWithPostex() {
    if (!accessKey) {
      window.alert("PostEx booking ke liye pehle Orders admin access key connect karein.");
      return;
    }
    try {
      const response = await fetch("/api/admin/postex-custom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-access-key": accessKey,
        },
        body: JSON.stringify({
          orderRef: order.id,
          total: order.total,
          paymentStatus,
          bookPostex: true,
          deliveryMethod: "PostEx",
          source: order.source,
          notes,
          customer: {
            name: order.customer,
            phone: order.phone,
            address: order.address,
            city: order.city,
          },
          items,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to book PostEx order.");
      setTracking(result.trackingNumber);
      setOrderStage(result.courierStatus || "Booked");
      setFulfillmentStatus("Booked with PostEx");
      setDeliveryMethod("PostEx");
      onUpdate(order.id, {
        tracking: result.trackingNumber,
        rawId: result.supabaseOrder?.id || order.rawId,
        id: result.orderRef ? `#${result.orderRef}` : order.id,
        status: result.courierStatus || "Booked",
        postexStatus: result.courierStatus || "Booked",
        paymentStatus,
        fulfillmentStatus: "Booked with PostEx",
        deliveryMethod: "PostEx",
        postexBooked: true,
        risk,
        tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
        notes: [notes, `PostEx tracking: ${result.trackingNumber}`].filter(Boolean).join("\n"),
        returnStatus,
      });
    } catch (error) {
      window.alert(error.message || "Unable to create PostEx booking.");
    }
  }

  function printPackingSlip() {
    const lines = [
      "Bustaniya Packing Slip",
      `Order: ${order.id}`,
      `Customer: ${order.customer}`,
      `Phone: ${order.phone || ""}`,
      `Address: ${order.address || order.city || ""}`,
      "",
      ...items.map((item) => `${item.quantity} x ${item.name}${item.size ? ` / ${item.size}` : ""}${item.color ? ` / ${item.color}` : ""}`),
      "",
      `Amount: Rs. ${Number(order.total || 0).toLocaleString()}`,
      `Status: ${orderStage}`,
      `Delivery method: ${deliveryMethod}`,
      `Tracking: ${tracking || "Pending"}`,
      `Notes: ${notes || ""}`,
    ].join("\n");
    const slip = window.open("", "_blank", "width=720,height=820");
    if (!slip) return;
    slip.document.write(`<pre style="font-family:Arial,sans-serif;white-space:pre-wrap;padding:28px;line-height:1.6">${lines.replace(/[&<>]/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;" }[char]))}</pre>`);
    slip.document.close();
    slip.print();
  }

  return <><div className="adminOverlay" onClick={onClose} /><aside className="orderDetailDrawer">
    <header><div><p>{order.postexStatus || order.status}</p><h2>{order.id}</h2><span>{order.customer} - Rs. {Number(order.total || 0).toLocaleString()}</span></div><button onClick={onClose}><X /></button></header>
    <div className="orderDetailBody">
      <section className="orderDetailGrid">
        <article className="adminCard orderDetailCard"><h3>Customer</h3><b>{order.customer}</b><span>{order.phone || "No phone saved"}</span><p>{order.address || order.city || "No address saved"}</p></article>
        <article className="adminCard orderDetailCard"><h3>Status</h3><select value={orderStage} onChange={(event) => setOrderStage(event.target.value)}>{customOrderStatusOptions.map((status) => <option key={status}>{status}</option>)}</select></article>
        <article className="adminCard orderDetailCard"><h3>Payment</h3><select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}><option>COD pending</option><option>Advance pending</option><option>Verification due</option><option>Paid</option><option>Refunded</option></select></article>
        <article className="adminCard orderDetailCard"><h3>Fulfillment</h3><select value={fulfillmentStatus} onChange={(event) => setFulfillmentStatus(event.target.value)}><option>Unfulfilled</option><option>Packing</option><option>Booked with PostEx</option><option>Shipped</option><option>Delivered</option><option>On hold</option></select></article>
        <article className="adminCard orderDetailCard"><h3>Delivery</h3><select value={deliveryMethod} onChange={(event) => setDeliveryMethod(event.target.value)}><option>PostEx</option><option>Rider / same city</option><option>Customer pickup</option><option>Staff delivery</option><option>Manual courier</option><option>PostEx later</option></select></article>
        <article className="adminCard orderDetailCard"><h3>Risk</h3><select value={risk} onChange={(event) => setRisk(event.target.value)}><option>Standard COD</option><option>High risk COD</option><option>Repeat customer</option></select></article>
      </section>

      <section className="adminCard orderItemsCard"><div className="inventoryListHead"><div><h2>Items</h2><span>{items.length} line items</span></div></div><div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Item</th><th>SKU</th><th>Variant</th><th>Qty</th><th>Amount</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><b>{item.name}</b></td><td>{item.sku || "-"}</td><td>{[item.size,item.color].filter(Boolean).join(" / ") || "-"}</td><td>{item.quantity}</td><td>Rs. {Number(item.price || 0).toLocaleString()}</td></tr>)}</tbody></table></div></section>

      <section className="adminCard orderOpsCard">
        <h3>Fulfill order</h3>
        <div className="formRow"><label>Tracking number<input value={tracking} onChange={(event) => setTracking(event.target.value)} placeholder="PostEx tracking number" /></label></div>
        <div className="orderActionRow"><button onClick={printPackingSlip}>Print packing slip</button>{!order.postexBooked && !order.tracking && <button onClick={bookWithPostex}>Book with PostEx</button>}<button onClick={() => {
          setFulfillmentStatus("Booked with PostEx");
          onUpdate(order.id, {
            tracking,
            status: orderStage,
            postexStatus: orderStage,
            paymentStatus,
            fulfillmentStatus: "Booked with PostEx",
            deliveryMethod,
            risk,
            tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
            notes,
            returnStatus,
          });
        }}>Save tracking</button></div>
      </section>

      <section className="adminCard orderOpsCard">
        <h3>Returns, exchanges, refunds</h3>
        <div className="formRow"><label>Status<select value={returnStatus} onChange={(event) => setReturnStatus(event.target.value)}><option>No return</option><option>Return requested</option><option>Exchange requested</option><option>Refund requested</option><option>Refund processed</option></select></label><label>Tags<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="Urgent, DM, Exchange" /></label></div>
      </section>

      <section className="adminCard orderOpsCard">
        <h3>Internal notes</h3>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows="5" placeholder="Team notes, DM context, phone verification result" />
        <button onClick={saveChanges}>Save order notes</button>
      </section>
    </div>
  </aside></>;
}

function OrderTable({ rows, onSelect }) {
  return <div className="adminTableWrap"><table className="adminTable orderTable"><thead><tr><th>Order</th><th>Customer</th><th>Amount</th><th>PostEx status</th><th>Date</th><th>Risk</th><th /></tr></thead><tbody>
    {rows.map((order) => <tr key={order.id}><td><b>{order.id}</b>{order.tracking&&<small className="trackingNumber">{order.tracking}</small>}{order.deliveryMethod&&<small className="trackingNumber">{order.deliveryMethod}</small>}</td><td>{order.customer}<small className="trackingNumber">{order.city}</small></td><td><b>Rs. {Number(order.total || 0).toLocaleString()}</b></td><td><span className={`statusBadge ${orderStatus(order).replaceAll(" ","")}`}>{order.postexStatus || order.status}</span></td><td>{order.date}</td><td>{order.risk || "Standard COD"}</td><td><button className="editProductButton" onClick={() => onSelect(order)}>Open</button></td></tr>)}
    {!rows.length && <tr><td colSpan="7"><div className="inventoryEmpty">No orders match this view.</div></td></tr>}
  </tbody></table></div>;
}

function buildCustomerProfiles(orders) {
  const profiles = new Map();
  orders.forEach((order) => {
    const key = (order.phone || order.customer || order.id).toLowerCase();
    const existing = profiles.get(key) || {
      id: key,
      name: order.customer || "Guest",
      phone: order.phone || "",
      email: order.raw?.guest_email || order.raw?.shipping_email || "",
      city: order.city || "",
      address: order.address || "",
      orders: [],
      totalSpent: 0,
      tags: [],
      notes: "",
    };
    existing.orders.push(order);
    if (isRevenueOrder(order)) existing.totalSpent += Number(order.total || 0);
    existing.lastOrder = order.date;
    profiles.set(key, existing);
  });
  if (!profiles.size) {
    [
      { name: "Ayesha Khan", phone: "0300 1112223", city: "Lahore", totalSpent: 21480, tags: ["VIP", "Repeat buyer"] },
      { name: "Hira Ali", phone: "0312 9876543", city: "Karachi", totalSpent: 12990, tags: ["Instagram DM"] },
      { name: "Mahnoor Shah", phone: "0333 4567890", city: "Islamabad", totalSpent: 4490, tags: ["New customer"] },
    ].forEach((customer, index) => profiles.set(customer.phone, { ...customer, id: customer.phone, email: "", address: customer.city, orders: demoOrders.slice(index, index + 2), notes: "", lastOrder: demoOrders[index]?.date || "No orders" }));
  }
  return [...profiles.values()].map((customer) => {
    const tags = new Set(customer.tags || []);
    if (customer.totalSpent >= 20000) tags.add("VIP");
    if ((customer.orders || []).length > 1) tags.add("Repeat buyer");
    if (!tags.size) tags.add("New customer");
    return { ...customer, tags: [...tags] };
  });
}

function CustomersPanel({ orders, onOpen }) {
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState("All");
  const [selectedId, setSelectedId] = useState("");
  const [edits, setEdits] = useState({});
  const customers = useMemo(() => buildCustomerProfiles(orders).map((customer) => ({ ...customer, ...(edits[customer.id] || {}) })), [edits, orders]);
  const segments = ["All","VIP","Repeat buyer","New customer","Instagram DM"];
  const visibleCustomers = customers.filter((customer) => {
    const matchesSegment = segment === "All" || (customer.tags || []).includes(segment);
    const query = search.toLowerCase();
    const matchesSearch = [customer.name, customer.phone, customer.email, customer.city, ...(customer.tags || [])].join(" ").toLowerCase().includes(query);
    return matchesSegment && matchesSearch;
  });
  const selectedCustomer = customers.find((customer) => customer.id === selectedId);

  function updateCustomer(customerId, changes) {
    setEdits((current) => ({ ...current, [customerId]: { ...(current[customerId] || {}), ...changes } }));
  }

  function exportCustomers() {
    const csv = [
      ["Name","Phone","Email","City","Orders","Total spent","Tags","Notes"],
      ...customers.map((customer) => [customer.name, customer.phone, customer.email, customer.city, customer.orders.length, customer.totalSpent, customer.tags.join(" | "), customer.notes || ""]),
    ].map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"','""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `bustaniya-customers-${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return <><div className="adminTitle"><div><p>CUSTOMERS</p><h1>Customers</h1><span>Profiles, order history, total spent, segments, tags and notes.</span></div><button onClick={() => onOpen({ module: "Customers", feature: "Add customer", create: true })}><Plus /> Add customer</button></div>
    <div className="miniMetricGrid productMetrics"><article><Users /><span><b>{customers.length}</b>Customers</span></article><article><Tags /><span><b>{customers.filter((c) => c.tags.includes("VIP")).length}</b>VIP</span></article><article><ShoppingBag /><span><b>{customers.reduce((sum, customer) => sum + customer.orders.length, 0)}</b>Orders</span></article><article><CircleDollarSign /><span><b>Rs. {customers.reduce((sum, customer) => sum + Number(customer.totalSpent || 0), 0).toLocaleString()}</b>Total spent</span></article></div>
    <section className="adminCard managementCard">
      <div className="catalogToolbar">
        <div className="orderTabs">{segments.map((item) => <button key={item} className={segment === item ? "active" : ""} onClick={() => setSegment(item)}>{item}</button>)}</div>
        <div className="catalogActions"><div className="inlineSearch"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customers..." /></div><button onClick={exportCustomers}>Export CSV</button></div>
      </div>
      <div className="adminTableWrap"><table className="adminTable customerTable"><thead><tr><th>Customer</th><th>Contact</th><th>Orders</th><th>Total spent</th><th>Last order</th><th>Tags</th><th /></tr></thead><tbody>
        {visibleCustomers.map((customer) => <tr key={customer.id}><td><b>{customer.name}</b><small className="trackingNumber">{customer.city || "No city"}</small></td><td>{customer.phone || "-"}<small className="trackingNumber">{customer.email || "No email"}</small></td><td>{customer.orders.length}</td><td><b>Rs. {Number(customer.totalSpent || 0).toLocaleString()}</b></td><td>{customer.lastOrder || "-"}</td><td><div className="tagList">{customer.tags.map((tag) => <span key={tag}>{tag}</span>)}</div></td><td><button className="editProductButton" onClick={() => setSelectedId(customer.id)}>Open</button></td></tr>)}
        {!visibleCustomers.length && <tr><td colSpan="7"><div className="inventoryEmpty">No customers match this segment.</div></td></tr>}
      </tbody></table></div>
    </section>
    {selectedCustomer && <CustomerProfileDrawer customer={selectedCustomer} onClose={() => setSelectedId("")} onUpdate={updateCustomer} />}
  </>;
}

function CustomerProfileDrawer({ customer, onClose, onUpdate }) {
  const [tags, setTags] = useState((customer.tags || []).join(", "));
  const [notes, setNotes] = useState(customer.notes || "");
  const [email, setEmail] = useState(customer.email || "");

  function saveCustomer() {
    onUpdate(customer.id, {
      email,
      tags: tags.split(",").map((tag) => tag.trim()).filter(Boolean),
      notes,
    });
  }

  return <><div className="adminOverlay" onClick={onClose} /><aside className="orderDetailDrawer">
    <header><div><p>CUSTOMER PROFILE</p><h2>{customer.name}</h2><span>Rs. {Number(customer.totalSpent || 0).toLocaleString()} spent - {customer.orders.length} orders</span></div><button onClick={onClose}><X /></button></header>
    <div className="orderDetailBody">
      <section className="orderDetailGrid customerProfileGrid">
        <article className="adminCard orderDetailCard"><h3>Contact</h3><b>{customer.phone || "No phone"}</b><label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="customer@email.com" /></label><p>{customer.address || customer.city || "No address saved"}</p></article>
        <article className="adminCard orderDetailCard"><h3>Segment</h3><b>{customer.tags?.[0] || "New customer"}</b><span>{customer.orders.length > 1 ? "Repeat buyer" : "First purchase"}</span></article>
        <article className="adminCard orderDetailCard"><h3>Total spent</h3><b>Rs. {Number(customer.totalSpent || 0).toLocaleString()}</b><span>{customer.orders.length} orders</span></article>
      </section>
      <section className="adminCard orderOpsCard"><h3>Tags and notes</h3><label>Customer tags<input value={tags} onChange={(event) => setTags(event.target.value)} placeholder="VIP, Repeat buyer, Instagram DM" /></label><label>Customer notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows="5" placeholder="Preferences, sizing, complaints, delivery instructions" /></label><button onClick={saveCustomer}>Save customer</button></section>
      <section className="adminCard orderItemsCard"><div className="inventoryListHead"><div><h2>Order history</h2><span>{customer.orders.length} orders</span></div></div><div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Order</th><th>Date</th><th>Status</th><th>Total</th><th>Tracking</th></tr></thead><tbody>{customer.orders.map((order) => <tr key={order.id}><td><b>{order.id}</b></td><td>{order.date}</td><td>{order.postexStatus || order.status}</td><td>Rs. {Number(order.total || 0).toLocaleString()}</td><td>{order.tracking || "-"}</td></tr>)}</tbody></table></div></section>
    </div>
  </aside></>;
}

function SettingsPanel({ onOpen, signedInUser }) {
  const [activeTab, setActiveTab] = useState("Store");
  const [savedAt, setSavedAt] = useState("");
  const [storeSettings, setStoreSettings] = useState(DEFAULT_STORE_SETTINGS);
  const [storeSettingsLoading, setStoreSettingsLoading] = useState(false);
  const [storeSettingsError, setStoreSettingsError] = useState("");
  const [storeSettingsSetup, setStoreSettingsSetup] = useState("");
  const [heroUploading, setHeroUploading] = useState("");
  const [staff, setStaff] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [currentAdminUser, setCurrentAdminUser] = useState(null);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState("");
  const [staffSaved, setStaffSaved] = useState("");
  const [shippingZones, setShippingZones] = useState([
    { zone: "Pakistan - Standard", cities: "All PostEx service cities", rate: "Rs. 200 COD", freeAbove: "Rs. 5,000" },
    { zone: "Lahore same-day", cities: "Lahore", rate: "Rs. 250", freeAbove: "Rs. 8,000" },
  ]);
  const canManageUsers = canUseAdminArea(signedInUser, "users");
  const tabs = ["Store","Payments","Shipping", ...(canManageUsers ? ["Users"] : []), "Notifications","Domains","Checkout"];

  useEffect(() => {
    if (activeTab === "Store") {
      loadStoreSettings();
    }
    if (activeTab === "Users") loadAdminUsers();
  }, [activeTab]);

  async function uploadHeroImage(file, field) {
    if (!file) return;
    setStoreSettingsError("");
    setHeroUploading(field);
    try {
      const form = new FormData();
      form.append("file", file, file.name);
      const response = await fetch("/api/admin/hero-upload", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to upload hero image.");
      setStoreSettings((current) => ({ ...current, [field]: result.url }));
    } catch (error) {
      setStoreSettingsError(error.message);
    } finally {
      setHeroUploading("");
    }
  }

  async function loadStoreSettings() {
    setStoreSettingsLoading(true);
    setStoreSettingsError("");
    try {
      const response = await fetch("/api/admin/settings", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load store settings.");
      setStoreSettings(result.settings || DEFAULT_STORE_SETTINGS);
      setStoreSettingsSetup(result.needsSetup ? `Run ${result.setupSql || "scripts/supabase-store-settings.sql"} in Supabase before saving live settings.` : "");
    } catch (error) {
      setStoreSettingsError(error.message);
    } finally {
      setStoreSettingsLoading(false);
    }
  }

  async function loadAdminUsers() {
    setStaffLoading(true);
    setStaffError("");
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load admin users.");
      setStaff(result.users || []);
      setAvailablePermissions(result.permissions || []);
      setCurrentAdminUser(result.currentUser || null);
    } catch (error) {
      setStaffError(error.message);
    } finally {
      setStaffLoading(false);
    }
  }

  function saveSettings(event) {
    event?.preventDefault();
    setSavedAt(new Date().toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" }));
  }

  async function saveStoreSettings(event) {
    event.preventDefault();
    setStoreSettingsLoading(true);
    setStoreSettingsError("");
    setStoreSettingsSetup("");
    setSavedAt("");
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: storeSettings }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save store settings.");
      setStoreSettings(result.settings || storeSettings);
      if (result.needsSetup) {
        setStoreSettingsSetup(`Run ${result.setupSql || "scripts/supabase-store-settings.sql"} in Supabase before saving live settings.`);
        return;
      }
      setSavedAt(new Date().toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" }));
    } catch (error) {
      setStoreSettingsError(error.message);
    } finally {
      setStoreSettingsLoading(false);
    }
  }

  function updateAnnouncement(index, changes) {
    setStoreSettings((current) => ({
      ...current,
      announcements: (current.announcements || []).map((announcement, itemIndex) =>
        itemIndex === index ? { ...announcement, ...changes } : announcement
      ),
    }));
  }

  function addAnnouncement() {
    setStoreSettings((current) => ({
      ...current,
      announcements: [
        ...(current.announcements || []),
        {
          id: `announcement-${Date.now()}`,
          text: "",
          linkLabel: "",
          linkHref: "",
          enabled: true,
        },
      ],
    }));
  }

  function removeAnnouncement(index) {
    setStoreSettings((current) => {
      const nextAnnouncements = (current.announcements || []).filter((_, itemIndex) => itemIndex !== index);
      return {
        ...current,
        announcements: nextAnnouncements.length ? nextAnnouncements : [{
          id: `announcement-${Date.now()}`,
          text: "",
          linkLabel: "",
          linkHref: "",
          enabled: true,
        }],
      };
    });
  }

  function addStaff(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const permissions = availablePermissions.filter((permission) => form.get(`permission-${permission}`));
    setStaffError("");
    setStaffSaved("");
    setStaffLoading(true);
    fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        email: form.get("email"),
        password: form.get("password"),
        role: form.get("role"),
        permissions,
      }),
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to create admin user.");
        formElement.reset();
        setStaffSaved("Admin user added.");
        await loadAdminUsers();
      })
      .catch((error) => setStaffError(error.message))
      .finally(() => setStaffLoading(false));
  }

  async function updateStaffUser(userId, changes) {
    setStaffError("");
    setStaffSaved("");
    setStaffLoading(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...changes }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to update admin user.");
      setStaffSaved("Admin access updated.");
      await loadAdminUsers();
    } catch (error) {
      setStaffError(error.message);
    } finally {
      setStaffLoading(false);
    }
  }

  async function deleteStaffUser(userId) {
    if (!window.confirm("Remove this admin user?")) return;
    setStaffError("");
    setStaffSaved("");
    setStaffLoading(true);
    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to remove admin user.");
      setStaffSaved("Admin user removed.");
      await loadAdminUsers();
    } catch (error) {
      setStaffError(error.message);
    } finally {
      setStaffLoading(false);
    }
  }

  function addShippingZone(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setShippingZones((current) => [...current, {
      zone: form.get("zone") || "New zone",
      cities: form.get("cities") || "Selected cities",
      rate: `Rs. ${form.get("rate") || 0}`,
      freeAbove: `Rs. ${form.get("freeAbove") || 0}`,
    }]);
    event.currentTarget.reset();
  }

  return <><div className="adminTitle"><div><p>CONFIGURATION</p><h1>Settings</h1><span>Local setup previews for store, payments, shipping, staff, notifications, domains and checkout.</span></div><button onClick={saveSettings}>Save preview</button></div>
    {savedAt && <div className="adminErrorBanner settingsSaved">Settings preview saved locally at {savedAt}.</div>}
    <section className="settingsLayout">
      <aside className="settingsNav">{tabs.map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}<span>{settingsTabHint(tab)}</span></button>)}</aside>
      <div className="settingsPanel">
        {activeTab === "Store" && <form className="adminCard settingsForm settingsWideForm" onSubmit={saveStoreSettings}>
          <h2>Store details</h2>
          {storeSettingsError && <div className="adminErrorBanner">{storeSettingsError}</div>}
          {storeSettingsSetup && <div className="adminErrorBanner">{storeSettingsSetup}</div>}
          <section className="heroSettingsEditor">
            <div className="heroSettingsHeading"><div><p>HOMEPAGE</p><h2>Hero Banner Settings</h2><span>Manage the desktop and mobile campaign compositions independently.</span></div><label className="switchLabel"><input type="checkbox" checked={storeSettings.heroEnabled !== false} onChange={(event) => setStoreSettings((current) => ({ ...current, heroEnabled: event.target.checked }))} /> Enabled</label></div>
            <div className="heroImageSettingsGrid">
              {[{ field: "heroDesktopImage", label: "Desktop Hero Image", hint: "Wide campaign artwork · recommended 16:8" }, { field: "heroMobileImage", label: "Mobile Hero Image", hint: "Dedicated portrait artwork · recommended 4:5" }].map((item) => <label className="heroImageSetting" key={item.field}>
                <span><b>{item.label}</b><small>{item.hint}</small></span>
                <div className="heroAdminImagePreview"><img src={storeSettings[item.field]} alt="" /></div>
                <input value={storeSettings[item.field] || ""} onChange={(event) => setStoreSettings((current) => ({ ...current, [item.field]: event.target.value }))} placeholder="/hero-image.jpg or https://..." />
                <span className="heroUploadButton">{heroUploading === item.field ? "Uploading..." : "Upload image"}<input type="file" accept="image/png,image/jpeg,image/webp" disabled={Boolean(heroUploading)} onChange={(event) => uploadHeroImage(event.target.files?.[0], item.field)} /></span>
              </label>)}
            </div>
            <div className="formRow"><label>Hero Eyebrow Text<input value={storeSettings.heroEyebrow || ""} onChange={(event) => setStoreSettings((current) => ({ ...current, heroEyebrow: event.target.value }))} placeholder="NEW SEASON" /></label><label>Main Heading<input value={storeSettings.heroHeading || ""} onChange={(event) => setStoreSettings((current) => ({ ...current, heroHeading: event.target.value }))} placeholder="Elevated Eastern Wear" /></label></div>
            <label>Short Supporting Text<textarea rows="2" value={storeSettings.heroSupportingText || ""} onChange={(event) => setStoreSettings((current) => ({ ...current, heroSupportingText: event.target.value }))} placeholder="Thoughtfully designed kurtis for everyday elegance." /></label>
            <div className="formRow"><label>Primary Button Text<input value={storeSettings.heroPrimaryButtonText || ""} onChange={(event) => setStoreSettings((current) => ({ ...current, heroPrimaryButtonText: event.target.value }))} /></label><label>Primary Button Link<input value={storeSettings.heroPrimaryButtonLink || ""} onChange={(event) => setStoreSettings((current) => ({ ...current, heroPrimaryButtonLink: event.target.value }))} /></label></div>
            <div className="formRow"><label>Secondary Button Text (optional)<input value={storeSettings.heroSecondaryButtonText || ""} onChange={(event) => setStoreSettings((current) => ({ ...current, heroSecondaryButtonText: event.target.value }))} /></label><label>Secondary Button Link (optional)<input value={storeSettings.heroSecondaryButtonLink || ""} onChange={(event) => setStoreSettings((current) => ({ ...current, heroSecondaryButtonLink: event.target.value }))} /></label></div>
            <div className="formRow"><label>Text Alignment<select value={storeSettings.heroTextAlignment || "left"} onChange={(event) => setStoreSettings((current) => ({ ...current, heroTextAlignment: event.target.value }))}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label><label>Text Position<select value={storeSettings.heroTextPosition || "left"} onChange={(event) => setStoreSettings((current) => ({ ...current, heroTextPosition: event.target.value }))}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label></div>
            <label>Overlay Intensity — {Number(storeSettings.heroOverlayIntensity || 0)}%<input type="range" min="0" max="80" step="1" value={Number(storeSettings.heroOverlayIntensity || 0)} onChange={(event) => setStoreSettings((current) => ({ ...current, heroOverlayIntensity: Number(event.target.value) }))} /></label>
          </section>
          <div className="settingsOption"><div><b>Announcement bar</b><span>Shown above the main header. Multiple active announcements rotate automatically.</span></div><label className="switchLabel"><input type="checkbox" checked={storeSettings.announcementEnabled} onChange={(event) => setStoreSettings((current) => ({ ...current, announcementEnabled: event.target.checked }))} /> Enabled</label></div>
          <section className="announcementEditor">
            <div className="inventoryListHead"><div><h2>Announcements</h2><span>{(storeSettings.announcements || []).length} messages</span></div><button type="button" onClick={addAnnouncement}><Plus /> Add announcement</button></div>
            {(storeSettings.announcements || []).map((announcement, index) => (
              <article className="announcementEditorItem" key={announcement.id || index}>
                <div className="announcementEditorHead">
                  <b>Announcement {index + 1}</b>
                  <label className="switchLabel"><input type="checkbox" checked={announcement.enabled !== false} onChange={(event) => updateAnnouncement(index, { enabled: event.target.checked })} /> Active</label>
                  <button type="button" onClick={() => removeAnnouncement(index)} aria-label={`Remove announcement ${index + 1}`}><X /></button>
                </div>
                <label>Message<textarea rows="2" value={announcement.text || ""} onChange={(event) => updateAnnouncement(index, { text: event.target.value })} placeholder="Free delivery, sale, advance payment, new arrivals..." /></label>
                <div className="formRow"><label>Link label<input value={announcement.linkLabel || ""} onChange={(event) => updateAnnouncement(index, { linkLabel: event.target.value })} placeholder="Shop now" /></label><label>Link URL<input value={announcement.linkHref || ""} onChange={(event) => updateAnnouncement(index, { linkHref: event.target.value })} placeholder="#products or /category/kurtis" /></label></div>
              </article>
            ))}
          </section>
          <div className="formRow"><label>Store name<input defaultValue="Bustaniya" /></label><label>Legal business name<input defaultValue="Bustaniya" /></label></div>
          <div className="formRow"><label>Support email<input defaultValue="hello@bustaniya.pk" /></label><label>Customer phone<input placeholder="+92 3xx xxxxxxx" /></label></div>
          <label>Business address<textarea rows="3" placeholder="Warehouse / office address" /></label>
          <div className="formRow"><label>Currency<select defaultValue="PKR"><option>PKR</option></select></label><label>Timezone<select defaultValue="Asia/Karachi"><option>Asia/Karachi</option></select></label></div>
          <button disabled={storeSettingsLoading}>{storeSettingsLoading ? "Saving..." : "Save store settings"}</button>
        </form>}

        {activeTab === "Payments" && <form className="adminCard settingsForm settingsWideForm" onSubmit={saveSettings}>
          <h2>Payment methods</h2>
          <div className="settingsOption"><div><b>Cash on Delivery</b><span>Default for Pakistan orders with phone verification.</span></div><label className="switchLabel"><input type="checkbox" defaultChecked /> Enabled</label></div>
          <div className="settingsOption"><div><b>Bank deposit / advance</b><span>Use for paid orders, free delivery after payment verification.</span></div><label className="switchLabel"><input type="checkbox" defaultChecked /> Enabled</label></div>
          <div className="formRow"><label>Bank title<input placeholder="Account title" /></label><label>IBAN / account<input placeholder="PK..." /></label></div>
          <div className="formRow"><label>JazzCash / Easypaisa<input placeholder="03xx xxxxxxx" /></label><label>COD verification rule<select><option>Require phone verification</option><option>Auto approve repeat customers</option><option>Manual review all COD</option></select></label></div>
          <button>Save payment preview</button>
        </form>}

        {activeTab === "Shipping" && <div className="settingsStack">
          <section className="adminCard settingsForm settingsWideForm"><h2>Shipping zones and rates</h2><div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Zone</th><th>Cities</th><th>Rate</th><th>Free above</th></tr></thead><tbody>{shippingZones.map((zone) => <tr key={zone.zone}><td><b>{zone.zone}</b></td><td>{zone.cities}</td><td>{zone.rate}</td><td>{zone.freeAbove}</td></tr>)}</tbody></table></div></section>
          <form className="adminCard settingsForm settingsWideForm" onSubmit={addShippingZone}><h2>Add shipping zone</h2><div className="formRow"><label>Zone name<input name="zone" required placeholder="Karachi express" /></label><label>Cities<input name="cities" required placeholder="Karachi, Hyderabad" /></label></div><div className="formRow"><label>Rate<input name="rate" type="number" min="0" defaultValue="200" /></label><label>Free delivery above<input name="freeAbove" type="number" min="0" defaultValue="5000" /></label></div><button>Add zone</button></form>
        </div>}

        {activeTab === "Users" && <div className="settingsStack">
          {staffError && <div className="adminErrorBanner">{staffError}</div>}
          {staffSaved && <div className="adminErrorBanner settingsSaved">{staffSaved}</div>}
          <section className="adminCard settingsForm settingsWideForm">
            <div className="inventoryListHead"><div><h2>Users and permissions</h2><span>{currentAdminUser ? `Signed in as ${currentAdminUser.name}` : "Manage admin access"}</span></div>{staffLoading && <span>Loading...</span>}</div>
            <div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Access</th><th>Status</th><th /></tr></thead><tbody>{staff.map((user) => <tr key={user.id}><td><b>{user.name}</b><small className="trackingNumber">{user.lastLoginAt ? `Last login ${new Date(user.lastLoginAt).toLocaleString("en-PK")}` : "No login yet"}</small></td><td>{user.email}</td><td>{user.role}</td><td><div className="tagList">{(user.permissions || []).map((permission) => <span key={permission}>{permission}</span>)}</div></td><td><span className={`statusBadge ${user.status === "Active" ? "activeStatus" : "processing"}`}>{user.status}</span></td><td><div className="orderActionRow"><button type="button" onClick={() => updateStaffUser(user.id, { status: user.status === "Active" ? "Disabled" : "Active" })}>{user.status === "Active" ? "Disable" : "Enable"}</button>{user.role !== "Owner" && <button type="button" onClick={() => deleteStaffUser(user.id)}>Remove</button>}</div></td></tr>)}</tbody></table>{!staff.length && <div className="inventoryEmpty">No admin users found.</div>}</div>
          </section>
          <form className="adminCard settingsForm settingsWideForm" onSubmit={addStaff}>
            <h2>Add admin user</h2>
            <div className="formRow"><label>Name<input name="name" required placeholder="Team member" /></label><label>Email<input name="email" type="email" required placeholder="team@bustaniya.pk" /></label></div>
            <div className="formRow"><label>Password<input name="password" type="password" minLength="10" required placeholder="Minimum 10 characters" /></label><label>Role<select name="role" defaultValue="Staff"><option>Staff</option><option>Owner</option></select></label></div>
            <div className="settingsPermissionGrid">
              {availablePermissions.map((permission) => <label className="switchLabel" key={permission}><input name={`permission-${permission}`} type="checkbox" defaultChecked={["dashboard", "orders"].includes(permission)} /> {permission}</label>)}
            </div>
            <button disabled={staffLoading}>Add admin user</button>
          </form>
        </div>}

        {activeTab === "Notifications" && <form className="adminCard settingsForm settingsWideForm" onSubmit={saveSettings}>
          <h2>Notification templates</h2>
          <div className="settingsOption"><div><b>Order confirmation</b><span>Sent after checkout or manual DM order confirmation.</span></div><label className="switchLabel"><input type="checkbox" defaultChecked /> Enabled</label></div>
          <label>Order confirmation subject<input defaultValue="Your Bustaniya order is confirmed" /></label>
          <label>Email template<textarea rows="6" defaultValue={"Hi {{customer_name}},\n\nYour order {{order_number}} has been confirmed. Tracking: {{tracking_number}}.\n\nThank you,\nBustaniya"} /></label>
          <div className="settingsOption"><div><b>Fulfillment update</b><span>Sent when tracking number or PostEx status changes.</span></div><label className="switchLabel"><input type="checkbox" defaultChecked /> Enabled</label></div>
          <div className="settingsOption"><div><b>COD phone verification reminder</b><span>Internal reminder for risky COD orders.</span></div><label className="switchLabel"><input type="checkbox" defaultChecked /> Enabled</label></div>
          <button>Save template preview</button>
        </form>}

        {activeTab === "Domains" && <form className="adminCard settingsForm settingsWideForm" onSubmit={saveSettings}>
          <h2>Domains</h2>
          <label>Primary domain<input defaultValue="bustaniya.pk" /></label>
          <div className="settingsOption"><div><b>www redirect</b><span>Redirect www.bustaniya.pk to primary domain.</span></div><label className="switchLabel"><input type="checkbox" defaultChecked /> Enabled</label></div>
          <div className="formRow"><label>SEO title<input defaultValue="Bustaniya - Pakistani fashion store" /></label><label>Meta pixel / analytics<input placeholder="Measurement ID" /></label></div>
          <button>Save domain preview</button>
        </form>}

        {activeTab === "Checkout" && <form className="adminCard settingsForm settingsWideForm" onSubmit={saveSettings}>
          <h2>Checkout settings</h2>
          <div className="settingsOption"><div><b>Guest checkout</b><span>Let Instagram and walk-in customers order without accounts.</span></div><label className="switchLabel"><input type="checkbox" defaultChecked /> Enabled</label></div>
          <div className="settingsOption"><div><b>Phone required</b><span>Required for PostEx booking and COD verification.</span></div><label className="switchLabel"><input type="checkbox" defaultChecked /> Enabled</label></div>
          <div className="formRow"><label>Default payment<select><option>Cash on Delivery</option><option>Bank deposit</option></select></label><label>Address fields<select><option>Full address required</option><option>Simple city/address only</option></select></label></div>
          <label>Checkout note<textarea rows="3" defaultValue="COD orders may receive a confirmation call before dispatch." /></label>
          <button>Save checkout preview</button>
        </form>}
      </div>
    </section>
  </>;
}

function settingsTabHint(tab) {
  return {
    Store: "Details",
    Payments: "COD, bank",
    Shipping: "Zones, rates",
    Users: "Staff access",
    Notifications: "Email templates",
    Domains: "Store URL",
    Checkout: "Customer flow",
  }[tab];
}

function ModulePanel({ title, subtitle, action, icon: Icon, features, onOpen }) {
  return <><div className="adminTitle"><div><p>MANAGEMENT</p><h1>{title}</h1><span>{subtitle}</span></div>{action && <button onClick={()=>onOpen({module:title,feature:action,create:true})}><Plus /> {action}</button>}</div>
    <section className="moduleGrid">{features.map((feature, index)=><article className="adminCard moduleCard" key={feature}><div><Icon /></div><span>{String(index+1).padStart(2,"0")}</span><h2>{feature}</h2><p>Manage {feature.toLowerCase()} for your Bustaniya store.</p><button onClick={()=>onOpen({module:title,feature})}>Open module →</button></article>)}</section></>;
}

function WorkspaceDrawer({ workspace, onClose, onSave, activity }) {
  const [createMode, setCreateMode] = useState(Boolean(workspace.create));
  const records = activity.filter(item => item.module === workspace.module && item.feature === workspace.feature);

  function saveRecord(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    onSave({
      id: Date.now(),
      module: workspace.module,
      feature: workspace.feature,
      title: form.get("title") || `${workspace.feature} record`,
      status: form.get("status") || "Active",
      value: form.get("value") || "—",
      created: "Just now"
    });
  }

  return <><div className="adminOverlay" onClick={onClose} />
    <aside className="workspaceDrawer">
      <header><div><p>{workspace.module}</p><h2>{workspace.feature}</h2></div><button onClick={onClose}><X /></button></header>
      <div className="workspaceBody">
        <div className="workspaceToolbar">
          <div className="inlineSearch"><Search /><input placeholder={`Search ${workspace.feature.toLowerCase()}...`} /></div>
          <button onClick={() => setCreateMode(!createMode)}><Plus /> New record</button>
        </div>

        {createMode && <form className="workspaceForm" onSubmit={saveRecord}>
          <h3>Create {workspace.feature.toLowerCase()}</h3>
          <label>Title or name<input name="title" required placeholder={`Enter ${workspace.feature.toLowerCase()} name`} /></label>
          {(workspace.module === "Discounts" || workspace.module === "Gift cards" || workspace.module === "Finances") &&
            <div className="formRow"><label>Amount / value<input name="value" type="number" placeholder="0" /></label><label>Value type<select><option>PKR</option><option>Percentage</option></select></label></div>}
          {workspace.module === "Marketing" && <div className="formRow"><label>Channel<select><option>Email</option><option>Instagram</option><option>Facebook</option><option>SMS</option></select></label><label>Audience<select><option>All customers</option><option>Subscribers</option><option>Returning customers</option></select></label></div>}
          {workspace.module === "Inventory" && <div className="formRow"><label>Origin<input placeholder="Supplier or location" /></label><label>Destination<input defaultValue="Bustaniya warehouse" /></label></div>}
          {workspace.module === "Orders" && <div className="formRow"><label>Customer<input placeholder="Customer name" /></label><label>Order value<input name="value" type="number" placeholder="0" /></label></div>}
          {workspace.module === "Markets" && <div className="formRow"><label>Country / region<input placeholder="Pakistan" /></label><label>Currency<select><option>PKR</option><option>USD</option><option>GBP</option><option>AED</option></select></label></div>}
          <div className="formRow"><label>Status<select name="status"><option>Active</option><option>Draft</option><option>Scheduled</option><option>Paused</option></select></label><label>Date<input type="date" /></label></div>
          <label>Notes<textarea rows="4" placeholder="Add internal notes..." /></label>
          <div className="workspaceFormActions"><button type="button" onClick={() => setCreateMode(false)}>Cancel</button><button>Save record</button></div>
        </form>}

        <section className="workspaceRecords">
          <div className="workspaceInfo"><div><b>{records.length}</b><span>Local records</span></div><div><b>Ready</b><span>Supabase status</span></div></div>
          <div className="workspaceList">
            {records.length ? records.map(record => <article key={record.id}><div><b>{record.title}</b><span>{record.created}</span></div><p>{record.value}</p><i>{record.status}</i><button><MoreHorizontal /></button></article>)
            : <div className="workspaceEmpty"><Package /><h3>No records yet</h3><p>Create your first {workspace.feature.toLowerCase()} record. It will work locally until Supabase is connected.</p><button onClick={() => setCreateMode(true)}><Plus /> Create record</button></div>}
          </div>
        </section>
      </div>
    </aside>
  </>;
}
