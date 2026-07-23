"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bell, Boxes, ChevronDown, CircleDollarSign, Info, Landmark, LayoutDashboard,
  LogOut, Menu, Minus, MoreHorizontal, Package, Plus,
  ReceiptText, RefreshCw, Search, Settings, ShoppingBag, Store, Tags, TrendingUp, Users,
  WalletCards, X
} from "lucide-react";
import { categories as fallbackCategoryNames, categoryDetails, categoryToSlug, products as initialProducts, slugifyCategory } from "../data/store";
import { DEFAULT_STORE_SETTINGS } from "../data/storeSettings";
import { apparelSizes, fashionColors } from "../data/variantOptions";
import AdminLogin from "./AdminLogin";

function HelpHint({ text }) {
  return <span className="helpHint" tabIndex="0" role="note" aria-label={text} data-tooltip={text}><Info /></span>;
}

function AdminLoadingShell() {
  return (
    <main className="adminShell adminLoadingShell" aria-busy="true" aria-label="Loading Bustaniya admin">
      <aside className="adminSidebar adminLoadingSidebar" aria-hidden="true">
        <div className="adminLoadingBrand">
          <span className="adminSkeleton adminLoadingMark" />
          <span className="adminSkeleton adminLoadingBrandName" />
        </div>
        <div className="adminLoadingNavigation">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => <span className="adminSkeleton adminLoadingNavItem" key={item} />)}
        </div>
        <span className="adminSkeleton adminLoadingAccount" />
      </aside>
      <section className="adminMain">
        <header className="adminTopbar adminLoadingTopbar" aria-hidden="true">
          <span className="adminSkeleton adminLoadingSearch" />
          <div className="adminLoadingTopActions">
            <span className="adminSkeleton adminLoadingAction" />
            <span className="adminSkeleton adminLoadingAvatar" />
          </div>
        </header>
        <div className="adminContent adminLoadingContent">
          <div className="adminLoadingHeading">
            <span className="adminSkeleton adminLoadingEyebrow" />
            <span className="adminSkeleton adminLoadingTitle" />
            <span className="adminSkeleton adminLoadingSubtitle" />
          </div>
          <div className="adminLoadingMetricGrid" aria-hidden="true">
            {[1, 2, 3, 4].map((item) => <div className="adminLoadingMetric" key={item}><span className="adminSkeleton" /><span className="adminSkeleton" /><span className="adminSkeleton" /></div>)}
          </div>
          <section className="adminLoadingPanel" aria-hidden="true">
            <div><span className="adminSkeleton adminLoadingPanelTitle" /><span className="adminSkeleton adminLoadingPanelAction" /></div>
            {[1, 2, 3, 4, 5].map((item) => <span className="adminSkeleton adminLoadingRow" key={item} />)}
          </section>
          <p className="adminLoadingStatus">Preparing your workspace…</p>
        </div>
      </section>
    </main>
  );
}

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
  { name: "Orders", icon: ShoppingBag, section: "COMMERCE" },
  { name: "Products", icon: Package, section: "COMMERCE" },
  { name: "Categories", icon: Tags, section: "COMMERCE" },
  { name: "Inventory", icon: Boxes, section: "COMMERCE" },
  { name: "Customers", icon: Users, section: "COMMERCE" },
  { name: "Finances", icon: Landmark, section: "COMMERCE" },
  { name: "Settings", icon: Settings, section: "OPERATIONS" }
];

const navPermissionMap = {
  Dashboard: "dashboard",
  Orders: "orders",
  Products: "products",
  Categories: "products",
  Inventory: "inventory",
  Customers: "customers",
  Finances: "dashboard",
  Settings: "settings",
};

function getSectionFromLocation() {
  if (typeof window === "undefined") return "";
  const section = new URLSearchParams(window.location.search).get("section");
  return navItems.some((item) => item.name === section) ? section : "";
}

const PRODUCT_COST_KEYS = ["fabric", "stitching", "embellishment", "packaging", "delivery", "other"];

function canUseAdminArea(user, area) {
  if (!area) return true;
  if (!user) return true;
  if (user.role === "Owner") return true;
  return Array.isArray(user.permissions) && user.permissions.includes(area);
}

export default function AdminDashboard() {
  const [active, setActive] = useState(() => getSectionFromLocation() || "Dashboard");
  const [activeSectionReady, setActiveSectionReady] = useState(false);
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
  const [productPrice, setProductPrice] = useState(0);
  const [costBreakdown, setCostBreakdown] = useState({ fabric: 0, stitching: 0, embellishment: 0, packaging: 0, delivery: 0, other: 0 });
  const [productSaving, setProductSaving] = useState(false);
  const [workspace, setWorkspace] = useState(null);
  const [activity, setActivity] = useState([]);
  const [products, setProducts] = useState(() => initialProducts.map((p, index) => ({
    ...p,
    stock: [12, 7, 3, 18, 5, 9, 4, 11, 2, 14, 8, 6][index] ?? 10,
  })));
  const [adminReady, setAdminReady] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersConnected, setOrdersConnected] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [ordersLoadError, setOrdersLoadError] = useState("");
  const [ordersPagination, setOrdersPagination] = useState({ page: 1, pageSize: 20, total: 0, totalPages: 0 });
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [inventoryMovements, setInventoryMovements] = useState([]);
  const [catalogCategories, setCatalogCategories] = useState(fallbackCategoryRecords);
  const [categorySetupNeeded, setCategorySetupNeeded] = useState(false);
  const [categorySaving, setCategorySaving] = useState(false);
  const [currentAdminUser, setCurrentAdminUser] = useState(null);
  const [adminAuthChecked, setAdminAuthChecked] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [requestedOrderId, setRequestedOrderId] = useState("");
  const [requestedAdminFocus, setRequestedAdminFocus] = useState(null);
  const [metrics, setMetrics] = useState({
    totalSales: 0,
    orders: 0,
    customers: 0,
    products: 0,
    lowStock: 0,
  });

  useEffect(() => {
    const requestedSection = getSectionFromLocation();
    const savedActiveSection = localStorage.getItem("bustaniya-admin-active-section");
    if (requestedSection) {
      setActive(requestedSection);
    } else if (navItems.some((item) => item.name === savedActiveSection)) {
      setActive(savedActiveSection);
    }
    setActiveSectionReady(true);
    const saved = localStorage.getItem("bustaniya-admin-products");
    if (saved) {
      try { setProducts(JSON.parse(saved)); } catch {}
    }
    setAdminReady(true);
    fetch("/api/admin/me")
      .then((response) => response.ok ? response.json() : null)
      .then((result) => {
        if (!result?.user) return;
        setCurrentAdminUser(result.user);
        loadOrders();
      })
      .catch(() => {})
      .finally(() => setAdminAuthChecked(true));
  }, []);

  useEffect(() => {
    if (adminReady) localStorage.setItem("bustaniya-admin-products", JSON.stringify(products));
  }, [products, adminReady]);

  useEffect(() => {
    if (activeSectionReady) localStorage.setItem("bustaniya-admin-active-section", active);
  }, [active, activeSectionReady]);

  useEffect(() => {
    const handlePopState = () => {
      const section = getSectionFromLocation();
      if (section) {
        setRequestedAdminFocus(null);
        setActive(section);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigateAdminSection(section, options = {}) {
    if (!navItems.some((item) => item.name === section)) return;
    setRequestedAdminFocus(options.focus ? { section, focus: options.focus } : null);
    setActive(section);
    setSidebarOpen(false);
    localStorage.setItem("bustaniya-admin-active-section", section);
    const url = `/admin?section=${encodeURIComponent(section)}`;
    window.history[options.replace ? "replaceState" : "pushState"]({}, "", url);
  }

  const filteredProducts = useMemo(() => products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase())
  ), [products, search]);
  const totalProductCost = PRODUCT_COST_KEYS.reduce((sum, key) => sum + Number(costBreakdown[key] || 0), 0);
  const productGst = Math.round(Number(productPrice || 0) * 0.01);
  const productTax = Math.round(Number(productPrice || 0) * 0.04);
  const productFinalProfit = Number(productPrice || 0) - totalProductCost - productGst - productTax;

  useEffect(() => {
    if (!showProductForm || !editingProduct?.seoTitle) return;
    const pageTitleField = document.querySelector('.productFormDrawer input[maxlength="70"]');
    if (pageTitleField) pageTitleField.value = editingProduct.seoTitle;
  }, [showProductForm, editingProduct]);

  function openNewProductForm() {
    setEditingProduct(null);
    setProductCategory("Kurtis");
    setSelectedSizes(["S", "M", "L"]);
    setSelectedColors(["Pink"]);
    setProductMedia([]);
    setProductImageUrl("");
    setMediaError("");
    setProductPrice(0);
    setCostBreakdown({ fabric: 0, stitching: 0, embellishment: 0, packaging: 0, delivery: 0, other: 0 });
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
    setProductPrice(Number(product.price || 0));
    setCostBreakdown({ fabric: 0, stitching: 0, embellishment: 0, packaging: 0, delivery: 0, other: 0, ...(product.costBreakdown || {}) });
    setShowProductForm(true);
  }

  async function loadOrders({ page = 1 } = {}) {
    setOrdersLoading(true);
    setOrdersError("");
    setOrdersLoadError("");
    try {
      const response = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page, pageSize: ordersPagination.pageSize }),
      });
      const result = await response.json();
      if (!response.ok) {
        const error = new Error(result?.error?.message || "Orders could not be loaded.");
        error.status = response.status;
        throw error;
      }
      const formatted = (result.data || []).map((order) => ({
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
      setOrdersPagination(result.pagination || { page, pageSize: ordersPagination.pageSize, total: formatted.length, totalPages: formatted.length ? 1 : 0 });
      setOrdersConnected(true);
      try {
        await loadAdminData();
      } catch (adminDataError) {
        // Orders remain usable when a separate dashboard/catalog request fails.
        console.error("Admin workspace data load failed", adminDataError);
      }
    } catch (loadError) {
      setOrdersConnected(false);
      setOrdersError(loadError.message);
      setOrdersLoadError(loadError.message);
    } finally {
      setOrdersLoading(false);
    }
  }

  async function loadAdminData() {
    setCatalogLoading(true);
    try {
      const [catalogResponse, dashboardResponse, categoriesResponse] = await Promise.all([
        fetch("/api/admin/catalog", { method: "POST" }),
        fetch("/api/admin/dashboard", { method: "POST" }),
        fetch("/api/admin/categories", { method: "POST" }),
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
    const productForm = event.currentTarget;
    const form = new FormData(productForm);
    setProductSaving(true);
    setCatalogLoading(true);
    try {
      const mediaImages = await uploadProductMedia();
      const seoTitle = String(productForm.querySelector('input[maxlength="70"]')?.value || "").trim();
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
        cost_total_pkr: totalProductCost,
        cost_breakdown: {
          ...costBreakdown,
          metadata: {
            vendor: String(form.get("vendor") || "").trim(),
            barcode: String(form.get("barcode") || "").trim(),
            weight: String(form.get("weight") || "").trim(),
            weightUnit: String(form.get("weightUnit") || "kg"),
            countryOfOrigin: String(form.get("countryOfOrigin") || "Pakistan"),
            hsTariffCode: String(form.get("hsTariffCode") || "").trim(),
            seoTitle,
            seoDescription: String(form.get("seoDescription") || "").trim(),
            urlHandle: String(form.get("urlHandle") || "").trim(),
          },
        },
      };
      if (!editingProduct) {
        productPayload.is_new = true;
        productPayload.is_bestseller = false;
      }

      const response = await fetch("/api/admin/catalog", {
        method: editingProduct ? "PATCH" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(editingProduct ? { productId: editingProduct.id } : {}),
          product: productPayload,
          stock: Number(form.get("stock")),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save product.");
      await loadAdminData();
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
        },
        body: JSON.stringify({ productId: product.id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to remove product.");
      setProducts((current) => current.filter((item) => item.id !== product.id));
      await loadAdminData();
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
      await loadAdminData();
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
      },
      body: JSON.stringify({ action: "adjust", productId, change, reason }),
    });
    const result = await response.json();
    if (!response.ok) {
      const error = new Error(result.error || "Unable to adjust inventory.");
      setOrdersError(error.message);
      throw error;
    }
    await loadAdminData();
  }

  async function createCustomInventory(item) {
    setCatalogLoading(true);
    try {
      const response = await fetch("/api/admin/catalog", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
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
      await loadAdminData();
      return true;
    } catch (saveError) {
      setOrdersError(saveError.message);
      throw saveError;
    } finally {
      setCatalogLoading(false);
    }
  }

  async function createProductionBatch(batch) {
    setCatalogLoading(true);
    try {
      const response = await fetch("/api/admin/production-batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(batch) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save production batch.");
      await loadAdminData();
      return result.batch;
    } catch (error) {
      setOrdersError(error.message);
      throw error;
    } finally { setCatalogLoading(false); }
  }

  async function saveCategory(payload) {
    setCategorySaving(true);
    setOrdersError("");
    try {
      const response = await fetch("/api/admin/categories", {
        method: payload.id ? "PATCH" : "PUT",
        headers: {
          "Content-Type": "application/json",
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
      await loadAdminData();
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
      await loadAdminData();
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

  // The admin dashboard depends on browser-only session, timezone and cached
  // catalogue state. Render a deterministic shell first to avoid React
  // hydration failures that disable sidebar interactions in production.
  if (!adminReady || !adminAuthChecked) {
    return <AdminLoadingShell />;
  }

  if (!currentAdminUser) return <AdminLogin />;

  return (
    <main className="adminShell">
      <aside className={sidebarOpen ? "adminSidebar sidebarVisible" : "adminSidebar"}>
        <div className="adminLogo"><img src="/bustaniya-logo-v2.png" alt="Bustaniya" /><span>ADMIN</span></div>
        <button className="closeSidebar" onClick={() => setSidebarOpen(false)} aria-label="Close admin navigation"><X /></button>
        <nav>
          {visibleNavItems.map(({ name, icon: Icon, count, section }, index) => (
            <div className="adminNavItem" key={name}>
              {(index === 0 || visibleNavItems[index - 1].section !== section) && <p>{section}</p>}
              <a href={`/admin?section=${encodeURIComponent(name)}`} className={active === name ? "active" : ""} onClick={(event) => { event.preventDefault(); navigateAdminSection(name); }}>
                <Icon /> <span>{name}</span>{count && <b>{count}</b>}
              </a>
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
          <button className="adminMenu" onClick={() => setSidebarOpen(true)} aria-label="Open admin navigation"><Menu /></button>
          {active === "Products" ? <div className="adminSearch"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." aria-label="Search products" /></div> : <div className="adminTopbarContext"><b>{active}</b><span>Bustaniya admin</span></div>}
          <div className="adminTopActions">
            <a href="/" target="_blank">View store</a>
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
          {canAccessActive && active === "Dashboard" && <DashboardHome setActive={navigateAdminSection} orders={orders} products={products} metrics={metrics} connected={ordersConnected} loading={ordersLoading || catalogLoading} ordersError={ordersLoadError} currentAdminUser={currentAdminUser} onRefresh={() => loadOrders()} onAddProduct={() => { navigateAdminSection("Products"); openNewProductForm(); }} onOpenOrder={(order) => { setRequestedOrderId(order.id); navigateAdminSection("Orders"); }} />}
          {canAccessActive && active === "Products" && <ProductsPanel products={filteredProducts} search={search} setSearch={setSearch} onAdd={openNewProductForm} onEdit={openEditProductForm} onDelete={deleteProduct} onDeliveryChange={updateProductDelivery} loading={catalogLoading} initialView={requestedAdminFocus?.section === "Products" ? requestedAdminFocus.focus : ""} />}
          {canAccessActive && active === "Categories" && <CategoriesPanel categories={catalogCategories} products={products} onSave={saveCategory} onArchive={archiveCategory} saving={categorySaving} needsSetup={categorySetupNeeded} />}
          {canAccessActive && active === "Orders" && <OrdersPanel rows={orders} products={products} pagination={ordersPagination} canExport={currentAdminUser?.role === "Owner" || currentAdminUser?.permissions?.includes("orders.export")} connected={ordersConnected} loading={ordersLoading} error={ordersError} onRetry={() => loadOrders()} onPageChange={(page) => loadOrders({ page })} initialSelectedId={requestedOrderId} onInitialSelectionHandled={() => setRequestedOrderId("")} />}
          {canAccessActive && active === "Inventory" && <InventoryPanel products={products} movements={inventoryMovements} orders={orders} connected={ordersConnected} currentAdminUser={currentAdminUser} onAdjust={adjustInventory} onCreateCustomInventory={createCustomInventory} onCreateProductionBatch={createProductionBatch} initialView={requestedAdminFocus?.section === "Inventory" ? requestedAdminFocus.focus : ""} />}
          {canAccessActive && active === "Customers" && <CustomersPanel orders={orders} onOpen={setWorkspace} />}
          {canAccessActive && active === "Finances" && <FinancePanel orders={orders} products={products} connected={ordersConnected} currentAdminUser={currentAdminUser} initialTab={requestedAdminFocus?.section === "Finances" ? requestedAdminFocus.focus : ""} />}
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
              <div className="formRow"><label>Vendor<input name="vendor" defaultValue={editingProduct?.vendor || "Bustaniya"} /></label><label>Collection<input name="collection" defaultValue={editingProduct?.collection || ""} placeholder="Summer Collection, New Arrivals..." /></label></div>
              <label>Tags<input name="tags" placeholder="summer, printed, cotton, new-arrival" /></label>
            </section>

            <section className="productEditorCard">
              <h3>Cost, pricing & profit</h3>
              <p>Every figure in this section is for one item / one suit. Profit is calculated for one item after the fixed 1% GST and 4% tax.</p>
              {costBreakdown.costSource === "production_batch" && <div className="inventoryAlert materialAlert"><Package /><div><b>Production batch cost is linked <HelpHint text="This per-item cost is calculated from the batch's direct costs plus its share of common costs, divided by finished quantity." /></b><span>Batch {costBreakdown.productionBatchId} produced {Number(costBreakdown.productionBatchQuantity || 0).toLocaleString()} items. Its total cost of Rs. {Number(costBreakdown.productionBatchTotalCost || 0).toLocaleString()} has been divided into the per-item costs below.</span></div></div>}
              <div className="formRow"><label>Selling price (PKR)<input name="price" required type="number" min="0" value={productPrice || ""} onChange={(e) => setProductPrice(e.target.value)} placeholder="4,990" /></label><label>Compare-at price<input name="comparePrice" type="number" placeholder="5,990" /></label></div>
              <p className="fieldTitle">Per-item cost breakdown (PKR)</p>
              <div className="formRow"><label>Fabric<input type="number" min="0" value={costBreakdown.fabric || ""} onChange={(e) => setCostBreakdown(current => ({ ...current, fabric: e.target.value }))} /></label><label>Stitching<input type="number" min="0" value={costBreakdown.stitching || ""} onChange={(e) => setCostBreakdown(current => ({ ...current, stitching: e.target.value }))} /></label></div>
              <div className="formRow"><label>Embellishment<input type="number" min="0" value={costBreakdown.embellishment || ""} onChange={(e) => setCostBreakdown(current => ({ ...current, embellishment: e.target.value }))} /></label><label>Packaging<input type="number" min="0" value={costBreakdown.packaging || ""} onChange={(e) => setCostBreakdown(current => ({ ...current, packaging: e.target.value }))} /></label></div>
              <div className="formRow"><label>Travel / transport cost<input type="number" min="0" value={costBreakdown.delivery || ""} onChange={(e) => setCostBreakdown(current => ({ ...current, delivery: e.target.value }))} /></label><label>Other cost<input type="number" min="0" value={costBreakdown.other || ""} onChange={(e) => setCostBreakdown(current => ({ ...current, other: e.target.value }))} /></label></div>
              <div className="financeStatement">
                <div><span>Cost per item</span><b>{`Rs. ${totalProductCost.toLocaleString()}`}</b></div>
                <div><span>GST per item (1%)</span><b>- {`Rs. ${productGst.toLocaleString()}`}</b></div>
                <div><span>Tax per item (4%)</span><b>- {`Rs. ${productTax.toLocaleString()}`}</b></div>
                <div className="statementTotal"><span>Final profit per item</span><b>{`Rs. ${productFinalProfit.toLocaleString()}`}</b></div>
              </div>
            </section>

            <section className="productEditorCard">
              <h3>Inventory</h3>
              <div className="formRow"><label>SKU<input name="sku" defaultValue={editingProduct?.sku || editingProduct?.articleNumber || ""} placeholder="BST-KRT-001" /></label><label>Barcode<input name="barcode" defaultValue={editingProduct?.barcode || ""} placeholder="ISBN, UPC or GTIN" /></label></div>
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
              <input type="hidden" name="deliveryFeeMode" value="inherit" />
              <div className="formRow"><label>Delivery fee per order<input readOnly value="Rs. 200" /></label><label>Rule<input readOnly value="Applied once, even for multiple products" /></label></div>
              <p className="shippingRuleHint">Store rule: product prices exclude delivery. Every order has one flat Rs. 200 delivery fee, regardless of item quantity.</p>
              <div className="formRow"><label>Weight<input name="weight" type="number" step="0.1" defaultValue={editingProduct?.weight || ""} placeholder="0.5" /></label><label>Unit<select name="weightUnit" defaultValue={editingProduct?.weightUnit || "kg"}><option>kg</option><option>g</option></select></label></div>
              <div className="formRow"><label>Country of origin<select name="countryOfOrigin" defaultValue={editingProduct?.countryOfOrigin || "Pakistan"}><option>Pakistan</option></select></label><label>HS tariff code<input name="hsTariffCode" defaultValue={editingProduct?.hsTariffCode || ""} placeholder="Optional" /></label></div>
            </section>

            <section className="productEditorCard">
              <h3>Search engine listing</h3>
              <div className="seoPreview"><b>Bustaniya · Product title</b><span>https://bustaniya.pk/products/product-title</span><p>Your product description will appear here in search results.</p></div>
              <label>Page title<input maxLength="70" placeholder="Product title — Bustaniya" /></label>
              <label>Meta description<textarea name="seoDescription" rows="3" maxLength="160" defaultValue={editingProduct?.seoDescription || ""} placeholder="Describe this product for Google search..." /></label>
              <label>URL handle<input name="urlHandle" defaultValue={editingProduct?.urlHandle || ""} placeholder="gulnaar-corset-kurti" /></label>
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

function DashboardHome({ setActive, orders, products, metrics, connected, loading, ordersError, currentAdminUser, onRefresh, onAddProduct, onOpenOrder }) {
  // Dates are initialized only in the browser so the server and client render
  // the same initial markup regardless of their timezone.
  const [dashboardNow, setDashboardNow] = useState(null);
  const [overduePayables, setOverduePayables] = useState(0);
  const [financeSnapshot, setFinanceSnapshot] = useState({ transactions: [], supplierBills: [], packagingExpense: 0, deliveryExpense: 0, expenses: [] });
  const [dashboardPeriod, setDashboardPeriod] = useState("7");
  const [dashboardUpdatedAt, setDashboardUpdatedAt] = useState(null);
  const [dashboardRefreshing, setDashboardRefreshing] = useState(false);
  const [financeSnapshotStatus, setFinanceSnapshotStatus] = useState("loading");
  const isOwnerDashboard = !currentAdminUser || currentAdminUser.role === "Owner";
  useEffect(() => { setDashboardNow(new Date()); }, []);
  async function refreshDashboardFinance() {
    if (!isOwnerDashboard) {
      setFinanceSnapshotStatus("ready");
      setDashboardUpdatedAt(new Date());
      return;
    }
    try {
      const response = await fetch("/api/admin/finance-transactions", { cache: "no-store" });
      const result = response.ok ? await response.json() : null;
      const snapshot = { transactions: result?.transactions || [], supplierBills: result?.supplierBills || [], packagingExpense: Number(result?.packagingExpense || 0), deliveryExpense: Number(result?.deliveryExpense || 0), expenses: Array.isArray(result?.manualExpenses) ? result.manualExpenses : [] };
      setFinanceSnapshot(snapshot);
      setFinanceSnapshotStatus("ready");
      const today = new Date().toISOString().slice(0, 10);
      setOverduePayables(snapshot.supplierBills.filter((bill) => bill.status !== "paid" && bill.dueDate && bill.dueDate < today && Number(bill.total || 0) > Number(bill.paid || 0)).length);
    } catch { setFinanceSnapshotStatus("error"); }
    setDashboardUpdatedAt(new Date());
  }
  useEffect(() => { refreshDashboardFinance(); }, []);
  async function refreshDashboard() {
    setDashboardRefreshing(true);
    try {
      await Promise.all([refreshDashboardFinance(), onRefresh?.()]);
    } finally {
      setDashboardRefreshing(false);
    }
  }
  const liveOrders = connected ? orders : [];
  const dashboardSales = connected
    ? liveOrders.filter(isDeliveredOrder).reduce((sum, order) => sum + Number(order.total || 0), 0)
    : Number(metrics.totalSales || 0);
  const dashboardOrderCount = connected ? liveOrders.length : Number(metrics.orders || 0);
  const dashboardCustomerCount = connected
    ? new Set(liveOrders.map(orderCustomerIdentity).filter(Boolean)).size
    : Number(metrics.customers || 0);
  const deliveredItems = liveOrders.filter(isDeliveredOrder).flatMap((order) => normalizeOrderItems(order.raw || order));
  const productCosts = new Map((products || []).map((product) => [String(product.id), Number(product.costTotalPkr || 0)]));
  const dashboardCogs = deliveredItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(productCosts.get(String(item.productId)) || 0), 0);
  const dashboardReturns = liveOrders.filter(isReturnedOrder).length;
  const dashboardCod = liveOrders.filter(isPendingCodOrder).reduce((sum, order) => sum + Number(order.total || 0), 0);
  const dashboardProductRevenue = deliveredItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
  const dashboardDeliveryCollected = Math.max(0, dashboardSales - dashboardProductRevenue);
  const dashboardGst = Math.round(dashboardProductRevenue * .01);
  const dashboardTax = Math.round(dashboardProductRevenue * .04);
  const dashboardTaxes = dashboardGst + dashboardTax;
  const dashboardManualExpenses = financeSnapshot.expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0) + Number(financeSnapshot.packagingExpense || 0) + Number(financeSnapshot.deliveryExpense || 0);
  const dashboardCashbookExpenses = financeSnapshot.transactions.filter((item) => item.type === "business_expense" && !item.productionBatchId && item.category !== "Inventory production" && !String(item.title || "").startsWith("Production batch ")).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const dashboardProductionCashOutflow = financeSnapshot.transactions.filter((item) => item.type === "business_expense" && (item.productionBatchId || item.category === "Inventory production" || String(item.title || "").startsWith("Production batch "))).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const dashboardSupplierPayments = financeSnapshot.transactions.filter((item) => item.type === "supplier_payment").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const dashboardOwnerInvestments = financeSnapshot.transactions.filter((item) => item.type === "owner_investment").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const dashboardOwnerWithdrawals = financeSnapshot.transactions.filter((item) => item.type === "owner_withdrawal").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const dashboardCourierCost = (liveOrders.filter(isDeliveredOrder).length * 200) + (dashboardReturns * 200);
  const dashboardNetProfit = dashboardSales - dashboardCogs - dashboardCourierCost - dashboardTaxes - dashboardManualExpenses - dashboardCashbookExpenses;
  const dashboardAvailableCash = dashboardSales + dashboardOwnerInvestments - dashboardCourierCost - dashboardTaxes - dashboardManualExpenses - dashboardCashbookExpenses - dashboardProductionCashOutflow - dashboardSupplierPayments - dashboardOwnerWithdrawals;
  const zeroCostActive = (products || []).filter((product) => productStatus(product) === "Active" && !Number(product.costTotalPkr || 0));
  const lowStockProducts = (products || []).filter((product) => Number(product.stock || 0) <= Number(product.lowStockThreshold || 5));
  const chartRange = Number(dashboardPeriod);
  const chartDays = dashboardNow
    ? Array.from({ length: chartRange }, (_, index) => {
      const date = startOfDay(dashboardNow);
      date.setDate(date.getDate() - (chartRange - 1 - index));
      return { date, label: chartRange <= 7 ? date.toLocaleDateString("en-PK", { weekday: "short" }) : date.toLocaleDateString("en-PK", { day: "numeric", month: "short" }) };
    })
    : Array.from({ length: 7 }, () => ({ date: null, label: "—" }));
  const salesByDay = chartDays.map(({ date, label }) => ({
    label,
    sales: liveOrders.filter((order) => {
      const orderDate = toOrderDate(order);
      return date && orderDate && isDeliveredOrder(order) && startOfDay(orderDate).getTime() === date.getTime();
    }).reduce((sum, order) => sum + Number(order.total || 0), 0),
  }));
  const salesPeriodTotal = salesByDay.reduce((sum, day) => sum + day.sales, 0);
  const currentPeriodStart = chartDays[0]?.date;
  const previousPeriodStart = currentPeriodStart ? new Date(currentPeriodStart) : null;
  if (previousPeriodStart) previousPeriodStart.setDate(previousPeriodStart.getDate() - chartRange);
  const previousPeriodSales = liveOrders.filter((order) => {
    const orderDate = toOrderDate(order);
    return previousPeriodStart && currentPeriodStart && orderDate && isDeliveredOrder(order) && orderDate >= previousPeriodStart && orderDate < currentPeriodStart;
  }).reduce((sum, order) => sum + Number(order.total || 0), 0);
  const salesPeriodChange = previousPeriodSales > 0 ? Math.round(((salesPeriodTotal - previousPeriodSales) / previousPeriodSales) * 100) : null;
  const maxDailySales = Math.max(...salesByDay.map((day) => day.sales), 1);
  const statusBuckets = {
    Booked: 0,
    Unbooked: 0,
    Attempted: 0,
    Delivered: 0,
    Returned: 0,
    Cancelled: 0,
  };
  liveOrders.forEach((order) => {
    const status = normalizePostexCategory(order.postexStatus || order.status);
    if (orderStatus(order).includes("cancel") || orderStatus(order).includes("fail")) statusBuckets.Cancelled += 1;
    else if (status === "Delivered" || status === "Returned" || status === "Unbooked" || status === "Attempted") statusBuckets[status] += 1;
    else if (status === "Total Orders") statusBuckets.Unbooked += 1;
    else statusBuckets.Booked += 1;
  });
  const statusPalette = { Booked: "#1f6940", Unbooked: "#8bb39a", Attempted: "#d08a18", Delivered: "#2f8052", Returned: "#c5164d", Cancelled: "#dedfdc" };
  const statusEntries = Object.entries(statusBuckets).filter(([, count]) => count > 0);
  let completedPercent = 0;
  const donutStops = statusEntries.map(([label, count]) => {
    const start = completedPercent;
    completedPercent += (count / Math.max(dashboardOrderCount, 1)) * 100;
    return `${statusPalette[label]} ${start}% ${completedPercent}%`;
  });
  const donutStyle = { background: donutStops.length ? `conic-gradient(${donutStops.join(",")})` : "#dedfdc" };
  if (loading || (isOwnerDashboard && financeSnapshotStatus === "loading")) return <DashboardLoadingState />;
  if (ordersError) return <section className="adminCard ordersConnect"><div><b>Dashboard order data could not be loaded.</b><span>{ordersError}</span></div><button onClick={onRefresh}>Retry</button></section>;
  return <>
    <div className="adminTitle dashboardTitle"><div><p>{dashboardNow ? dashboardNow.toLocaleDateString("en-PK", { weekday:"long", day:"numeric", month:"long" }) : "Loading date…"}</p><h1>{dashboardNow && dashboardNow.getHours() < 12 ? "Good morning" : dashboardNow && dashboardNow.getHours() < 17 ? "Good afternoon" : "Good evening"}, Bustaniya</h1><span>{connected ? `Live store data${dashboardUpdatedAt ? ` · Updated ${dashboardUpdatedAt.toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" })}` : ""}` : "Connect Supabase orders to load live store data."}</span></div><div className="dashboardTitleActions"><button className="dashboardRefresh" onClick={refreshDashboard} disabled={dashboardRefreshing}><RefreshCw className={dashboardRefreshing ? "spinIcon" : ""} /> {dashboardRefreshing ? "Refreshing" : "Refresh"}</button><button className="dashboardPrimaryAction" onClick={onAddProduct}><Plus /> Add product</button></div></div>
    {isOwnerDashboard && financeSnapshotStatus === "error" && <div className="adminErrorBanner">Finance data could not be loaded. Sales and COD remain live, but cash, profit and Finance alerts are hidden until Refresh succeeds.</div>}
    <section className="dashboardSection dashboardPrimarySection"><div className="dashboardSectionHeading"><div><p>STORE PULSE</p><h2>Today at a glance</h2><span>Live sales, cash and profitability from your connected store.</span></div></div><div className="metricGrid dashboardPrimaryMetrics">
      <Metric icon={CircleDollarSign} label="Delivered sales" value={`Rs. ${dashboardSales.toLocaleString()}`} change="All time" note="delivered orders only" />
      {isOwnerDashboard && <Metric icon={WalletCards} label="Available cash" value={financeSnapshotStatus === "ready" ? `Rs. ${dashboardAvailableCash.toLocaleString()}` : "Unavailable"} change="All time" note="after recorded cash costs" />}
      <Metric icon={Landmark} label="Pending COD" value={`Rs. ${dashboardCod.toLocaleString()}`} change="Current" note="not received yet" />
      {isOwnerDashboard && <Metric icon={TrendingUp} label="Final net profit" value={financeSnapshotStatus === "ready" ? `Rs. ${dashboardNetProfit.toLocaleString()}` : "Unavailable"} change="Finance" note="actual P&amp;L · all time" />}
    </div></section>
    {isOwnerDashboard && financeSnapshotStatus === "ready" && <details className="adminCard dashboardCashBreakdown" open>
      <summary><div><p>CASH EXPLAINER</p><h2>How available cash is calculated</h2><span>Every addition and deduction behind the amount shown above.</span></div><b>Rs. {dashboardAvailableCash.toLocaleString()}</b></summary>
      <div className="cashBreakdownGrid">
        <section>
          <div className="cashBreakdownHeading"><div><h3>Sale and profit breakdown</h3><span>Shows what the delivered sales earned.</span></div><span className="cashBreakdownTag">P&amp;L</span></div>
          <div className="financeStatement">
            <div><span>Total delivered order value</span><b>Rs. {dashboardSales.toLocaleString()}</b></div>
            <div><span>Products sold (without delivery)</span><b>Rs. {dashboardProductRevenue.toLocaleString()}</b></div>
            <div><span>Delivery collected from customers</span><b className="cashPlus">+ Rs. {dashboardDeliveryCollected.toLocaleString()}</b></div>
            <div><span>Product cost of sold items (COGS)</span><b className="cashMinus">- Rs. {dashboardCogs.toLocaleString()}</b></div>
            <div><span>GST on product selling price (1%)</span><b className="cashMinus">- Rs. {dashboardGst.toLocaleString()}</b></div>
            <div><span>Tax on product selling price (4%)</span><b className="cashMinus">- Rs. {dashboardTax.toLocaleString()}</b></div>
            <div><span>Courier cost ({liveOrders.filter(isDeliveredOrder).length} delivered + {dashboardReturns} returned)</span><b className="cashMinus">- Rs. {dashboardCourierCost.toLocaleString()}</b></div>
            <div><span>Other operating expenses</span><b className="cashMinus">- Rs. {(dashboardManualExpenses + dashboardCashbookExpenses).toLocaleString()}</b></div>
            <div className="statementTotal"><span>Final net profit</span><b>Rs. {dashboardNetProfit.toLocaleString()}</b></div>
          </div>
        </section>
        <section>
          <div className="cashBreakdownHeading"><div><h3>Cash movement breakdown</h3><span>Shows the money currently available to use.</span></div><span className="cashBreakdownTag">CASH</span></div>
          <div className="financeStatement">
            <div><span>Delivered sales received</span><b className="cashPlus">+ Rs. {dashboardSales.toLocaleString()}</b></div>
            <div><span>Owner funds added</span><b className="cashPlus">+ Rs. {dashboardOwnerInvestments.toLocaleString()}</b></div>
            <div><span>Courier paid / payable</span><b className="cashMinus">- Rs. {dashboardCourierCost.toLocaleString()}</b></div>
            <div><span>GST (1%)</span><b className="cashMinus">- Rs. {dashboardGst.toLocaleString()}</b></div>
            <div><span>Tax (4%)</span><b className="cashMinus">- Rs. {dashboardTax.toLocaleString()}</b></div>
            <div><span>Operating expenses paid</span><b className="cashMinus">- Rs. {(dashboardManualExpenses + dashboardCashbookExpenses).toLocaleString()}</b></div>
            <div><span>Production / stock purchase cash paid</span><b className="cashMinus">- Rs. {dashboardProductionCashOutflow.toLocaleString()}</b></div>
            <div><span>Supplier payments</span><b className="cashMinus">- Rs. {dashboardSupplierPayments.toLocaleString()}</b></div>
            <div><span>Owner withdrawals</span><b className="cashMinus">- Rs. {dashboardOwnerWithdrawals.toLocaleString()}</b></div>
            <div className="statementTotal"><span>Available business cash</span><b>Rs. {dashboardAvailableCash.toLocaleString()}</b></div>
          </div>
        </section>
      </div>
      <p className="cashBreakdownNote"><b>Why product cost is not deducted twice from cash:</b> COGS reduces profit when an item sells. The actual fabric/stock payment reduces cash when it is recorded as a production batch, stock purchase or supplier payment. If a product cost was entered manually but its purchase payment was never recorded, add that payment in Finance so Available Cash remains accurate.</p>
    </details>}
    <section className="dashboardSection dashboardHealthSection"><div className="dashboardSectionHeading"><div><p>OPERATIONS</p><h2>Store health</h2><span>Orders, customers, stock and returns that need daily attention.</span></div></div><div className="miniMetricGrid dashboardSecondaryMetrics">
      <article><ShoppingBag /><span><b>{dashboardOrderCount}</b>All orders</span></article>
      <article><Users /><span><b>{dashboardCustomerCount}</b>Unique customers</span></article>
      <article className={lowStockProducts.length ? "alertMetric" : ""}><Package /><span><b>{lowStockProducts.length}</b>Low-stock products</span></article>
      <article className={dashboardReturns ? "alertMetric" : ""}><ReceiptText /><span><b>{dashboardReturns}</b>Returns to inspect</span></article>
    </div></section>
    {((isOwnerDashboard && ((financeSnapshotStatus === "ready" && (dashboardNetProfit < 0 || overduePayables)) || zeroCostActive.length)) || lowStockProducts.length || dashboardReturns) && <section className="adminCard managementCard dashboardAlerts"><div className="inventoryListHead"><div><h2>Action alerts</h2><span>Items needing attention, ordered by urgency.</span></div></div><div className="financeStatement">{isOwnerDashboard && financeSnapshotStatus === "ready" && dashboardNetProfit < 0 && <div className="expenseAmount"><span><b className="alertSeverity critical">Critical</b> Negative final net profit</span><button onClick={() => setActive("Finances", { focus: "pnl" })}>Review P&amp;L</button></div>}{isOwnerDashboard && zeroCostActive.length > 0 && <div className="expenseAmount"><span><b className="alertSeverity critical">Critical</b> {zeroCostActive.length} active product{zeroCostActive.length === 1 ? "" : "s"} with zero cost</span><button onClick={() => setActive("Products", { focus: "missing-cost" })}>Add cost</button></div>}{isOwnerDashboard && financeSnapshotStatus === "ready" && overduePayables > 0 && <div className="expenseAmount"><span><b className="alertSeverity critical">Critical</b> {overduePayables} overdue supplier payable{overduePayables === 1 ? "" : "s"}</span><button onClick={() => setActive("Finances", { focus: "suppliers" })}>Review payables</button></div>}{lowStockProducts.length > 0 && <div><span><b className="alertSeverity warning">Stock</b> {lowStockProducts.length} low-stock / out-of-stock products</span><button onClick={() => setActive("Inventory", { focus: "low-stock" })}>Review stock</button></div>}{dashboardReturns > 0 && <div><span><b className="alertSeverity warning">Returns</b> {dashboardReturns} returned order{dashboardReturns === 1 ? "" : "s"} pending inspection</span><button onClick={() => setActive("Inventory", { focus: "returns-inspection" })}>Inspect returns</button></div>}</div></section>}
    <DashboardAnalytics orders={orders} products={products} connected={connected} period={dashboardPeriod} setPeriod={setDashboardPeriod} />
    <div className="dashboardGrid">
      <section className="salesChart adminCard">
        <div className="cardHeading"><div><h2>Sales overview</h2><p>Delivered revenue for the last {chartRange} days</p></div><span className="chartDataLabel">Delivered only</span></div>
        <div className="chartTotal"><b>Rs. {salesPeriodTotal.toLocaleString()}</b><span className={salesPeriodChange !== null && salesPeriodChange < 0 ? "metricTrendDown" : "metricTrendUp"}>{salesPeriodChange === null ? "No previous-period baseline" : `${salesPeriodChange >= 0 ? "+" : ""}${salesPeriodChange}% vs previous ${chartRange} days`}</span></div>
        <div className={`fakeChart ${chartRange > 7 ? "longRange" : ""}`} role="img" aria-label={`Delivered sales chart for the last ${chartRange} days`}>
          {salesByDay.map((day, index) => <div key={`${day.label}-${index}`}><span title={`${day.label}: Rs. ${day.sales.toLocaleString()}`} style={{ height: `${day.sales ? Math.max(4, (day.sales / maxDailySales) * 100) : 0}%` }} />{(chartRange <= 7 || index % Math.ceil(chartRange / 6) === 0 || index === chartRange - 1) && <small>{day.label}</small>}</div>)}
        </div>
      </section>
      <section className="adminCard orderStatus">
        <div className="cardHeading"><div><h2>Order status</h2><p>Current fulfilment</p></div></div>
        <div className="donut" style={donutStyle}><div><b>{dashboardOrderCount}</b><span>Orders</span></div></div>
        <ul>{Object.entries(statusBuckets).map(([label, count]) => <li key={label}><i style={{ background: statusPalette[label] }} />{label} <b>{count}</b></li>)}</ul>
      </section>
    </div>
    <section className="adminCard recentOrders">
      <div className="cardHeading"><div><h2>Recent orders</h2><p>Latest customer purchases</p></div><button onClick={() => setActive("Orders")}>View all orders</button></div>
      <OrderTable rows={orders.slice(0, 4)} onSelect={onOpenOrder} />
    </section>
  </>;
}

function Metric({ icon: Icon, label, value, change, note }) {
  return <article className="metricCard"><div><Icon /></div><p>{label}</p><h2>{value}</h2><span><b>{change}</b> {note}</span></article>;
}

function DashboardLoadingState() {
  return <section className="dashboardDataLoading" aria-busy="true" aria-label="Loading live dashboard data">
    <div className="adminLoadingHeading"><span className="adminSkeleton adminLoadingEyebrow" /><span className="adminSkeleton adminLoadingTitle" /><span className="adminSkeleton adminLoadingSubtitle" /></div>
    <div className="adminLoadingMetricGrid">{[1,2,3,4].map((item) => <div className="adminLoadingMetric" key={item}><span className="adminSkeleton" /><span className="adminSkeleton" /><span className="adminSkeleton" /></div>)}</div>
    <p className="adminLoadingStatus">Loading live orders, products and Finance data…</p>
  </section>;
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

  function moveCategory(category, direction) {
    const siblings = categories.filter((item) => item.parentSlug === category.parentSlug).sort((a, b) => a.sortOrder - b.sortOrder);
    const index = siblings.findIndex((item) => item.id === category.id);
    const target = siblings[index + direction];
    if (!target) return;
    onSave({ ...category, sortOrder: target.sortOrder });
    onSave({ ...target, sortOrder: category.sortOrder });
  }

  function confirmArchive(category) {
    const count = productCount(category);
    if (window.confirm(`${category.name} ko archive karna hai?${count ? ` ${count} product${count === 1 ? "" : "s"} is category mein hain.` : ""} Products delete nahi honge, lekin category storefront se hide ho jayegi.`)) onArchive(category);
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
      showInHeader: form.get("showInHeader") === "on",
      showOnHomepage: form.get("showOnHomepage") === "on",
      showInFooter: form.get("showInFooter") === "on",
      showInSearch: form.get("showInSearch") === "on",
      seoTitle: form.get("seoTitle") || "",
      seoDescription: form.get("seoDescription") || "",
      imageAlt: form.get("imageAlt") || name,
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
          <div className="productRowActions"><button className="editProductButton" onClick={() => moveCategory(selectedCategory, -1)} disabled={saving}>↑</button><button className="editProductButton" onClick={() => moveCategory(selectedCategory, 1)} disabled={saving}>↓</button><button className="editProductButton" onClick={() => setEditing(selectedCategory)} disabled={saving}>Edit main</button><button className="removeProductButton" onClick={() => confirmArchive(selectedCategory)} disabled={saving}><X /><span>Archive</span></button></div>
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
      <label>Cover image alt text<input name="imageAlt" defaultValue={editing.imageAlt || editing.name || ""} placeholder="Describe this category image" /></label>
      <div className="categoryVisibility"><b>Storefront visibility</b><label><input type="checkbox" name="showInHeader" defaultChecked={editing.showInHeader ?? true} /> Header menu</label><label><input type="checkbox" name="showOnHomepage" defaultChecked={editing.showOnHomepage ?? true} /> Homepage</label><label><input type="checkbox" name="showInFooter" defaultChecked={editing.showInFooter ?? false} /> Footer</label><label><input type="checkbox" name="showInSearch" defaultChecked={editing.showInSearch ?? true} /> Search & filters</label></div>
      <details className="categorySeo"><summary>SEO settings</summary><label>SEO title<input name="seoTitle" maxLength="60" defaultValue={editing.seoTitle || ""} placeholder="Category title for Google" /></label><label>Meta description<textarea name="seoDescription" rows="3" maxLength="160" defaultValue={editing.seoDescription || ""} placeholder="Short search-result description" /></label></details>
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

function ProductsPanel({ products, search, setSearch, onAdd, onEdit, onDelete, onDeliveryChange, loading, initialView }) {
  const [tab, setTab] = useState(initialView === "missing-cost" ? "Missing cost" : "All");
  const [variantProduct, setVariantProduct] = useState(null);
  const visibleProducts = products.filter((product) => {
    const status = productStatus(product);
    return tab === "All" || status === tab || (tab === "Low stock" && Number(product.stock || 0) <= Number(product.lowStockThreshold || 5)) || (tab === "Missing cost" && !Number(product.costTotalPkr || 0));
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
        <div className="orderTabs">{["All","Active","Draft","Archived","Unlisted","Low stock","Missing cost"].map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item}</button>)}</div>
        <div className="catalogActions">
          <div className="inlineSearch"><Search /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." /></div>
          <button type="button" onClick={exportProducts}>Export CSV</button>
        </div>
      </div>
      <div className="collectionStrip">{collections.map((collection) => <span key={collection}>{collection}</span>)}</div>
      <div className="adminTableWrap"><table className="adminTable productAdminTable"><thead><tr><th>Product</th><th>Collection</th><th>Price</th><th>Unit cost</th><th>Variants</th><th>Inventory</th><th>Delivery</th><th>Status</th><th /></tr></thead><tbody>
        {visibleProducts.map((product) => {
          const variants = productVariants(product);
          const status = productStatus(product);
          return <tr key={product.id}><td><div className="tableProduct"><span style={{ backgroundImage: `url(${product.image})` }} /><div><b>{product.name}</b><small>{product.sku || product.articleNumber || `BST-${String(product.id).padStart(4,"0")}`}</small></div></div></td><td>{productCollection(product)}</td><td><b>Rs. {Number(product.price || 0).toLocaleString()}</b>{(product.compareAtPrice || product.compare_at_price) && <small className="trackingNumber">Was Rs. {Number(product.compareAtPrice || product.compare_at_price).toLocaleString()}</small>}</td><td><b>Rs. {Number(product.costTotalPkr || 0).toLocaleString()}</b>{product.costBreakdown?.costSource === "production_batch" && <small className="trackingNumber">Batch cost</small>}</td><td><button className="adjustStockButton" onClick={() => setVariantProduct(product)}>{variants.length} variants</button></td><td><span className={Number(product.stock || 0) <= Number(product.lowStockThreshold || 5) ? "stockLow" : ""}>{Number(product.stock || 0)} in stock</span><small className="trackingNumber">Alert at {Number(product.lowStockThreshold || 5)}</small></td><td><b>Rs. 200 / order</b></td><td><span className={`statusBadge ${status === "Active" ? "activeStatus" : status === "Out of stock" ? "cancelled" : "processing"}`}>{status}</span></td><td><div className="productRowActions"><button className="editProductButton" onClick={() => onEdit(product)} disabled={loading}>Edit</button><button className="removeProductButton" onClick={() => onDelete(product)} disabled={loading} aria-label={`Remove ${product.name}`}><X /><span>Remove</span></button></div></td></tr>;
        })}
        {!visibleProducts.length && <tr><td colSpan="9"><div className="inventoryEmpty">No products match this view.</div></td></tr>}
      </tbody></table></div>
    </section>
    {variantProduct && <VariantInventoryDrawer product={variantProduct} onClose={() => setVariantProduct(null)} />}
  </>;
}

function orderStatus(order) {
  return String(order.postexStatus || order.status || "").toLowerCase();
}

function orderCustomerIdentity(order) {
  const phone = String(order.phone || order.raw?.shipping_phone || order.raw?.guest_phone || "").replace(/\D/g, "");
  const email = String(order.raw?.shipping_email || order.raw?.guest_email || "").trim().toLowerCase();
  const id = String(order.raw?.customer_id || order.raw?.customerId || "").trim();
  const fallback = [order.customer || order.shipping_full_name, order.city || order.shipping_city]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean)
    .join("|");
  return phone || email || id || fallback;
}

function formatOrderStatus(value = "") {
  return String(value || "pending")
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isRevenueOrder(order) {
  const status = orderStatus(order);
  return !status.includes("cancel") && !status.includes("fail") && !status.includes("void");
}

function isDeliveredOrder(order) {
  return ["delivered", "completed"].includes(orderStatus(order));
}

function isReturnedOrder(order) {
  return normalizePostexCategory(order.postexStatus || order.status) === "Returned";
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
  let submittedItems = [];
  try {
    submittedItems = JSON.parse(String(form.get("itemsJson") || "[]"));
  } catch {
    submittedItems = [];
  }
  const items = (Array.isArray(submittedItems) ? submittedItems : []).map((item, index) => {
    const selectedProduct = products.find((product) => String(product.id) === String(item.productId || item.product_id || item.id));
    const quantity = Math.max(1, Number(item.quantity) || 1);
    const price = Number(selectedProduct?.price ?? item.price ?? 0);
    return {
      id: selectedProduct?.id || item.id || `manual-${index + 1}`,
      product_id: selectedProduct?.id || item.product_id || "",
      name: selectedProduct?.name || String(item.name || "").trim() || "Manual DM order",
      sku: selectedProduct?.articleNumber || selectedProduct?.article_number || selectedProduct?.sku || item.sku || "CUSTOM-ORDER",
      articleNumber: selectedProduct?.articleNumber || selectedProduct?.article_number || item.articleNumber || "",
      productId: selectedProduct?.id || item.productId || "",
      quantity,
      price,
      size: String(item.size || "").trim(),
      color: String(item.color || "").trim(),
    };
  }).filter((item) => item.name);
  const productTotal = items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const total = productTotal + 200;
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
    items,
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

function OrdersPanel({ rows, products, pagination, canExport, connected, loading, error, onRetry, onPageChange, initialSelectedId, onInitialSelectionHandled }) {
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

  useEffect(() => {
    if (!initialSelectedId || !allRows.some((order) => order.id === initialSelectedId)) return;
    setSelectedId(initialSelectedId);
    onInitialSelectionHandled?.();
  }, [allRows, initialSelectedId, onInitialSelectionHandled]);

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
    try {
      const shouldBookPostex = String(order.deliveryMethod || "").trim().toLowerCase() === "postex";
      const response = await fetch("/api/admin/postex-custom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
    await onRetry();
    setSelectedId(finalOrder.id);
  }

  async function exportOrders() {
    try {
      const response = await fetch("/api/admin/orders/export", { method: "POST" });
      if (!response.ok) throw new Error("Orders could not be exported.");
      const csv = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(csv);
      link.download = `bustaniya-orders-${new Date().toISOString().slice(0,10)}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (exportError) {
      window.alert(exportError.message || "Orders could not be exported.");
    }
  }
  return <><div className="adminTitle"><div><p>FULFILMENT</p><h1>Orders</h1><span>PostEx status, custom admin orders, fulfillment, returns and team notes.</span></div><button onClick={exportOrders} disabled={loading || !canExport || !connected || !allRows.length}>Export orders</button></div>
    {loading && <div className="ordersConnect" aria-busy="true"><div><b>Loading ordersâ€¦</b><span>Fetching the latest stored order data.</span></div></div>}
    {!loading && error && <div className="ordersConnect"><div><b>Orders could not be loaded.</b><span>{error}</span></div><button onClick={onRetry}>Retry</button></div>}
    {!loading && !connected && !error && <div className="ordersConnect"><div><b>Session expired</b><span>Please sign in again to view orders.</span></div></div>}
    {connected && !loading && <>
    <div className="moduleQuickLinks"><button className="customOrderCta" onClick={() => setShowDraft(true)}><Plus /> Create custom order</button></div>
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
    <section className="adminCard managementCard">
      <div className="ordersToolbar">
        <label className="orderStatusFilter">Order status<select value={activeTab} onChange={(event) => setActiveTab(event.target.value)}>{orderStatusCounts.map((category) => <option key={category.label} value={category.label}>{category.label} ({category.count})</option>)}</select></label>
        <div className="inlineSearch"><Search /><input value={orderSearch} onChange={(event) => setOrderSearch(event.target.value)} placeholder="Search order, customer, tracking..." /></div>
      </div>
      {allRows.length === 0 ? <div className="inventoryEmpty">No orders have been received yet.</div> : <OrderTable rows={visibleRows} onSelect={(order) => setSelectedId(order.id)} />}
      {pagination?.totalPages > 1 && <div className="ordersPagination"><button disabled={pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}>Previous</button><span>Page {pagination.page} of {pagination.totalPages}</span><button disabled={pagination.page >= pagination.totalPages} onClick={() => onPageChange(pagination.page + 1)}>Next</button></div>}
    </section>
    {showDraft && <DraftOrderDialog products={products} onClose={() => setShowDraft(false)} onCreate={createDraft} />}
    {selectedOrder && <OrderDetailDrawer order={selectedOrder} onClose={() => setSelectedId("")} onUpdate={updateLocalOrder} />}
    </>}
  </>;
}

function FinancePanel({ orders, products, connected, currentAdminUser, initialTab }) {
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeProducts = Array.isArray(products) ? products : [];
  const isOwnerFinance = !currentAdminUser || currentAdminUser.role === "Owner";
  const [packagingExpense, setPackagingExpense] = useState(0);
  const [deliveryExpense, setDeliveryExpense] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [cashbookTransactions, setCashbookTransactions] = useState([]);
  const [supplierBills, setSupplierBills] = useState([]);
  const [fixedCosts, setFixedCosts] = useState(0);
  const [marketingCampaigns, setMarketingCampaigns] = useState([]);
  const [profitAllocation, setProfitAllocation] = useState({ marketingPercent: 25, ownerPercent: 30, stockPercent: 45 });
  const [cashbookLoading, setCashbookLoading] = useState(true);
  const [cashbookError, setCashbookError] = useState("");
  const [financePeriod, setFinancePeriod] = useState("all");
  const [financeTab, setFinanceTab] = useState(["overview","pnl","cashbook","suppliers","marketing","reports"].includes(initialTab) ? initialTab : "overview");

  useEffect(() => {
    if (!isOwnerFinance) {
      setCashbookLoading(false);
      return;
    }
    let active = true;
    fetch("/api/admin/finance-transactions", { cache: "no-store" })
      .then((response) => response.json().then((result) => ({ ok: response.ok, result })))
      .then(({ ok, result }) => {
        if (!ok) throw new Error(result.error || "Unable to load cashbook.");
        if (!active) return;
        const legacy = (() => { try { return JSON.parse(localStorage.getItem("bustaniya-admin-finance") || "{}"); } catch { return {}; } })();
        const serverHasManualData = Number(result.packagingExpense || 0) > 0 || Number(result.deliveryExpense || 0) > 0 || (result.manualExpenses || []).length > 0;
        const legacyHasManualData = Number(legacy.packagingExpense || 0) > 0 || Number(legacy.deliveryExpense || 0) > 0 || (legacy.expenses || []).length > 0;
        const manual = !serverHasManualData && legacyHasManualData ? { packagingExpense: Number(legacy.packagingExpense || 0), deliveryExpense: Number(legacy.deliveryExpense || 0), manualExpenses: Array.isArray(legacy.expenses) ? legacy.expenses : [] } : { packagingExpense: Number(result.packagingExpense || 0), deliveryExpense: Number(result.deliveryExpense || 0), manualExpenses: result.manualExpenses || [] };
        setCashbookTransactions(result.transactions || []);
        setSupplierBills(result.supplierBills || []);
        setFixedCosts(Number(result.fixedCosts || 0));
        setMarketingCampaigns(result.marketingCampaigns || []);
        setProfitAllocation(result.allocation || { marketingPercent: 25, ownerPercent: 30, stockPercent: 45 });
        setPackagingExpense(manual.packagingExpense);
        setDeliveryExpense(manual.deliveryExpense);
        setExpenses(manual.manualExpenses);
        if (!serverHasManualData && legacyHasManualData) {
          fetch("/api/admin/finance-transactions", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(manual) }).then((migrationResponse) => { if (migrationResponse.ok) localStorage.removeItem("bustaniya-admin-finance"); }).catch(() => {});
        }
      })
      .catch((error) => { if (active) setCashbookError(error.message); })
      .finally(() => { if (active) setCashbookLoading(false); });
    return () => { active = false; };
  }, [isOwnerFinance]);

  const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;
  const financeTabs = [
    ["overview", "Overview"],
    ["pnl", "P&L"],
    ["cashbook", "Cashbook"],
    ["suppliers", "Suppliers"],
    ["marketing", "Marketing"],
    ["reports", "Reports"],
  ];
  const periodMatches = (order) => {
    if (financePeriod === "all") return true;
    const rawDate = order.createdAt || order.raw?.created_at || order.raw?.order_date || "";
    const date = rawDate ? new Date(rawDate) : null;
    if (!date || Number.isNaN(date.getTime())) return false;
    const now = new Date();
    const start = financePeriod === "month" ? new Date(now.getFullYear(), now.getMonth(), 1) : new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = financePeriod === "month" ? new Date(now.getFullYear(), now.getMonth() + 1, 1) : new Date(now.getFullYear(), now.getMonth(), 1);
    return date >= start && date < end;
  };
  const activeOrders = connected ? safeOrders.filter(isRevenueOrder).filter(periodMatches) : [];
  const deliveredOrders = activeOrders.filter(isDeliveredOrder);
  const returnedOrders = safeOrders.filter(isReturnedOrder).filter(periodMatches);
  const pendingOrders = activeOrders.filter(isPendingCodOrder);
  const deliveredItems = deliveredOrders.flatMap((order) => normalizeOrderItems(order.raw || order));
  const deliveredOrderCount = deliveredOrders.length;
  const returnedOrderCount = returnedOrders.length;
  const totalProductsSold = deliveredItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const grossRevenue = deliveredOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const receivedCash = deliveredOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const receivables = pendingOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const productCosts = new Map(safeProducts.map((product) => [String(product.id), Number(product.costTotalPkr || 0)]));
  const deliveredProductRevenue = deliveredItems
    .reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0), 0);
  const deliveredCogs = deliveredOrders.reduce((sum, order) => sum + normalizeOrderItems(order.raw || order)
    .reduce((itemTotal, item) => itemTotal + Number(item.quantity || 0) * Number(productCosts.get(String(item.productId)) || 0), 0), 0);
  const manualExpenseTotal = expenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const isProductionBatchExpense = (item) => item.type === "business_expense" && (
    item.productionBatchId ||
    item.category === "Inventory production" ||
    String(item.title || "").startsWith("Production batch ")
  );
  const productionCashOutflow = cashbookTransactions.filter(isProductionBatchExpense).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const supplierPaymentTotal = cashbookTransactions.filter((item) => item.type === "supplier_payment").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const cashbookOperatingExpenses = cashbookTransactions
    .filter((item) => item.type === "business_expense" && !isProductionBatchExpense(item))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const ownerInvestments = cashbookTransactions.filter((item) => item.type === "owner_investment").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const ownerWithdrawals = cashbookTransactions.filter((item) => item.type === "owner_withdrawal").reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const packagingTotal = Number(packagingExpense || 0);
  const deliveryTotal = Number(deliveryExpense || 0);
  // A batch purchase is cash spent now but becomes COGS only when its units sell.
  // Keeping it out of this P&L total prevents subtracting the same cost twice.
  const profitExpenseTotal = manualExpenseTotal + cashbookOperatingExpenses + packagingTotal + deliveryTotal;
  const cashOutflowTotal = profitExpenseTotal + productionCashOutflow + supplierPaymentTotal;
  const courierDeliveryCost = deliveredOrderCount * 200;
  const returnCourierCost = returnedOrderCount * 200;
  const gstProvision = Math.round(deliveredProductRevenue * 0.01);
  const taxProvision = Math.round(deliveredProductRevenue * 0.04);
  const gstTaxTotal = Math.round(deliveredProductRevenue * 0.05);
  const deliveryCollected = grossRevenue - deliveredProductRevenue;
  const profitAfterProductCost = grossRevenue - deliveredCogs;
  const netProfit = grossRevenue - deliveredCogs - courierDeliveryCost - returnCourierCost - profitExpenseTotal - gstTaxTotal;
  const availableCash = grossRevenue - courierDeliveryCost - returnCourierCost - gstTaxTotal - cashOutflowTotal + ownerInvestments - ownerWithdrawals;
  const allocatableProfit = Math.max(0, netProfit);
  const marketingAllocation = Math.round(allocatableProfit * Number(profitAllocation.marketingPercent || 0) / 100);
  const ownerAllocation = Math.round(allocatableProfit * Number(profitAllocation.ownerPercent || 0) / 100);
  const stockAllocation = Math.max(0, allocatableProfit - marketingAllocation - ownerAllocation);
  const inventoryRetailValue = safeProducts.reduce((sum, product) => sum + Number(product.price || 0) * Number(product.stock || 0), 0);
  const inventoryCostValue = safeProducts.reduce((sum, product) => sum + Number(product.costTotalPkr || 0) * Number(product.stock || 0), 0);
  const lowStockValue = safeProducts
    .filter((product) => Number(product.stock || 0) <= Number(product.lowStockThreshold || 5))
    .reduce((sum, product) => sum + Number(product.price || 0) * Number(product.stock || 0), 0);
  const profitMargin = grossRevenue ? Math.round((netProfit / grossRevenue) * 100) : 0;
  const supplierPayableTotal = supplierBills.reduce((sum, bill) => sum + Math.max(0, Number(bill.total || 0) - Number(bill.paid || 0)), 0);
  const today = new Date().toISOString().slice(0, 10);
  const overdueSupplierBills = supplierBills.filter((bill) => bill.status !== "paid" && bill.dueDate && bill.dueDate < today);
  const upcomingPayables = supplierBills.filter((bill) => bill.status !== "paid" && (!bill.dueDate || bill.dueDate <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10))).reduce((sum, bill) => sum + Math.max(0, Number(bill.total) - Number(bill.paid)), 0);
  const expectedClosingCash = availableCash + receivables - upcomingPayables;
  const contributionPerOrder = deliveredOrderCount ? Math.max(0, (grossRevenue - deliveredCogs - gstTaxTotal - courierDeliveryCost) / deliveredOrderCount) : 0;
  const breakEvenOrders = contributionPerOrder ? Math.ceil(Number(fixedCosts || 0) / contributionPerOrder) : 0;
  const marketingSpendTotal = marketingCampaigns.reduce((sum, item) => sum + Number(item.spend || 0), 0);
  const marketingSalesTotal = marketingCampaigns.reduce((sum, item) => sum + Number(item.sales || 0), 0);
  const marketingCustomersTotal = marketingCampaigns.reduce((sum, item) => sum + Number(item.customers || 0), 0);

  async function addMarketingCampaign(event) { event.preventDefault(); const data = new FormData(event.currentTarget); const next = [{ id: `campaign-${Date.now()}`, name: String(data.get("name") || "").trim(), platform: data.get("platform") || "Other", spend: Number(data.get("spend") || 0), sales: Number(data.get("sales") || 0), customers: Number(data.get("customers") || 0), date: data.get("date") || today }, ...marketingCampaigns]; if (!next[0].name) return; setCashbookLoading(true); try { const response = await fetch("/api/admin/finance-transactions", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ transactions:cashbookTransactions, allocation:profitAllocation, supplierBills, fixedCosts:Number(fixedCosts||0), marketingCampaigns:next }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to save campaign."); setMarketingCampaigns(result.marketingCampaigns || next); event.currentTarget.reset(); } catch (error) { setCashbookError(error.message); } finally { setCashbookLoading(false); } }

  async function saveFixedCosts(event) {
    event.preventDefault(); setCashbookLoading(true); setCashbookError("");
    try { const response = await fetch("/api/admin/finance-transactions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transactions: cashbookTransactions, allocation: profitAllocation, supplierBills, fixedCosts: Number(fixedCosts || 0) }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to save fixed costs."); setFixedCosts(Number(result.fixedCosts || 0)); } catch (error) { setCashbookError(error.message); } finally { setCashbookLoading(false); }
  }

  async function addSupplierBill(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const total = Number(data.get("total") || 0);
    const paid = Math.min(total, Math.max(0, Number(data.get("paid") || 0)));
    if (!total) return;
    const nextBills = [{ id: `supplier-bill-${Date.now()}`, supplier: String(data.get("supplier") || "").trim(), reference: String(data.get("reference") || "").trim(), total, paid, date: data.get("date") || today, dueDate: data.get("dueDate") || "", note: String(data.get("note") || "").trim(), status: paid >= total ? "paid" : "open" }, ...supplierBills];
    if (!nextBills[0].supplier) return;
    setCashbookLoading(true); setCashbookError("");
    try {
      const response = await fetch("/api/admin/finance-transactions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transactions: cashbookTransactions, allocation: profitAllocation, supplierBills: nextBills }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save supplier bill.");
      setSupplierBills(result.supplierBills || nextBills); event.currentTarget.reset();
    } catch (error) { setCashbookError(error.message); } finally { setCashbookLoading(false); }
  }

  async function recordSupplierPayment(bill) {
    const remaining = Math.max(0, Number(bill.total) - Number(bill.paid));
    const amount = Number(window.prompt(`Record payment to ${bill.supplier}. Remaining: Rs. ${remaining.toLocaleString()}`, String(remaining)) || 0);
    if (!amount || amount < 0 || amount > remaining) return;
    const nextBills = supplierBills.map((item) => item.id === bill.id ? { ...item, paid: Number(item.paid || 0) + amount, status: Number(item.paid || 0) + amount >= Number(item.total) ? "paid" : "open" } : item);
    const nextTransactions = [{ id: `supplier-payment-${Date.now()}`, type: "supplier_payment", title: `Supplier payment: ${bill.supplier}`, category: "Supplier payable", amount, date: today, note: bill.reference || bill.note || "", supplierBillId: bill.id }, ...cashbookTransactions];
    setCashbookLoading(true); setCashbookError("");
    try { const response = await fetch("/api/admin/finance-transactions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transactions: nextTransactions, allocation: profitAllocation, supplierBills: nextBills, fixedCosts: Number(fixedCosts || 0), marketingCampaigns }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || "Unable to record supplier payment."); setSupplierBills(result.supplierBills || nextBills); setCashbookTransactions(result.transactions || nextTransactions); } catch (error) { setCashbookError(error.message); } finally { setCashbookLoading(false); }
  }

  if (!isOwnerFinance) {
    return <div className="financeSystem">
      <div className="adminTitle"><div><p>SALES OVERVIEW</p><h1>Finances</h1><span>Operational sales and delivery information for staff.</span></div></div>
      <div className="inventoryAlert materialAlert"><Landmark /><div><b>Staff finance view</b><span>Owner-only data such as product costs, profit, cashbook, withdrawals and allocation plans is hidden.</span></div></div>
      <div className="miniMetricGrid financeMetrics">
        <article><CircleDollarSign /><span><b>{money(grossRevenue)}</b>Delivered sales</span></article>
        <article><ShoppingBag /><span><b>{deliveredOrderCount}</b>Delivered orders</span></article>
        <article><Package /><span><b>{totalProductsSold}</b>Products sold</span></article>
        <article><Landmark /><span><b>{money(receivables)}</b>Pending COD</span></article>
        <article className={returnedOrderCount ? "alertMetric" : ""}><Package /><span><b>{returnedOrderCount}</b>Returned orders</span></article>
      </div>
      <section className="adminCard financeSummaryCard"><div className="cardHeading"><div><h2>What to do next</h2><p>Use Orders for booking, delivery, return and customer updates.</p></div></div><div className="financeStatement"><div><span>Orders waiting for COD / delivery follow-up</span><b>{pendingOrders.length}</b></div><div><span>Returns needing stock inspection</span><b>{returnedOrderCount}</b></div><div className="statementTotal"><span>For profit or cash details</span><b>Contact owner</b></div></div></section>
    </div>;
  }

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
    ...returnedOrders.slice(0, 8).map((order) => ({
      id: order.id,
      date: order.date,
      type: "Returned order courier cost",
      account: order.customer,
      amount: -200,
      status: "Returned",
    })),
    ...cashbookTransactions.map((entry) => ({
      id: entry.id,
      date: formatFinanceDate(entry.date),
      type: entry.type === "owner_investment" ? "Owner investment" : entry.type === "owner_withdrawal" ? "Owner withdrawal" : "Business expense",
      account: entry.title,
      amount: entry.type === "owner_investment" ? Number(entry.amount) : -Number(entry.amount),
      status: entry.category,
    })),
  ];

  async function saveManualFinance(next = {}) {
    setCashbookLoading(true);
    setCashbookError("");
    const payload = { manualExpenses: next.manualExpenses ?? expenses, packagingExpense: Number(next.packagingExpense ?? packagingExpense ?? 0), deliveryExpense: Number(next.deliveryExpense ?? deliveryExpense ?? 0) };
    try {
      const response = await fetch("/api/admin/finance-transactions", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save Finance expenses.");
      setExpenses(result.manualExpenses || payload.manualExpenses);
      setPackagingExpense(Number(result.packagingExpense ?? payload.packagingExpense));
      setDeliveryExpense(Number(result.deliveryExpense ?? payload.deliveryExpense));
    } catch (error) {
      setCashbookError(error.message);
    } finally {
      setCashbookLoading(false);
    }
  }

  async function addExpense(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextExpenses = [{
      id: Date.now(),
      title: data.get("title"),
      category: data.get("category"),
      amount: Number(data.get("amount") || 0),
      date: data.get("date") || new Date().toISOString().slice(0, 10),
    }, ...expenses];
    await saveManualFinance({ manualExpenses: nextExpenses });
    event.currentTarget.reset();
  }

  async function addCashbookTransaction(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextTransactions = [{
      id: `cash-${Date.now()}`,
      type: data.get("type"),
      title: String(data.get("title") || "Finance entry").trim(),
      category: String(data.get("category") || "Other").trim(),
      amount: Number(data.get("amount") || 0),
      date: data.get("date") || new Date().toISOString().slice(0, 10),
      note: String(data.get("note") || "").trim(),
    }, ...cashbookTransactions];
    if (!nextTransactions[0].amount || nextTransactions[0].amount < 0) return;
    setCashbookLoading(true);
    setCashbookError("");
    try {
      const response = await fetch("/api/admin/finance-transactions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transactions: nextTransactions }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save cashbook entry.");
      setCashbookTransactions(result.transactions || nextTransactions);
      event.currentTarget.reset();
    } catch (error) {
      setCashbookError(error.message);
    } finally {
      setCashbookLoading(false);
    }
  }

  async function saveProfitAllocation(event) {
    event.preventDefault();
    const marketingPercent = Math.min(100, Math.max(0, Number(profitAllocation.marketingPercent || 0)));
    const ownerPercent = Math.min(100 - marketingPercent, Math.max(0, Number(profitAllocation.ownerPercent || 0)));
    const allocation = { marketingPercent, ownerPercent, stockPercent: 100 - marketingPercent - ownerPercent };
    setCashbookLoading(true);
    setCashbookError("");
    try {
      const response = await fetch("/api/admin/finance-transactions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transactions: cashbookTransactions, allocation }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save profit allocation.");
      setProfitAllocation(result.allocation || allocation);
    } catch (error) {
      setCashbookError(error.message);
    } finally {
      setCashbookLoading(false);
    }
  }

  function exportFinance() {
    const csv = [
      ["Metric","Value"],
      ["Gross revenue", grossRevenue],
      ["Delivered orders", deliveredOrderCount],
      ["Total products sold", totalProductsSold],
      ["Product sales total", deliveredProductRevenue],
      ["Received cash", receivedCash],
      ["Pending COD / receivables", receivables],
      ["Actual product cost (COGS)", deliveredCogs],
      ["Profit after product cost", profitAfterProductCost],
      ["Manual expenses", manualExpenseTotal],
      ["Operating expenses from cashbook", cashbookOperatingExpenses],
      ["Production batch cash spent (not deducted from profit twice)", productionCashOutflow],
      ["Owner investment / cash added", ownerInvestments],
      ["Owner withdrawals / personal use", ownerWithdrawals],
      ["Estimated available business cash", availableCash],
      ["Packaging expense", packagingTotal],
      ["Extra delivery expense", deliveryTotal],
      ["Returned orders", returnedOrderCount],
      ["Returned order courier cost (Rs. 200 each)", returnCourierCost],
      ["Courier delivery cost (Rs. 200 × delivered orders)", courierDeliveryCost],
      ["GST provision (1%)", gstProvision],
      ["Tax provision (4%)", taxProvision],
      ["GST + Tax total (5%)", gstTaxTotal],
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

  return <div className={`financeSystem financeTab-${financeTab}`}>
    <div className="adminTitle">
      <div><p>FINANCE MANAGER</p><h1>Finances</h1><span>{connected ? "Live order totals with actual product costs." : "No finance data yet. Connect live orders or add expenses to start tracking."}</span></div>
      <div className="orderTabs">{[["all","All time"],["month","This month"],["lastMonth","Last month"]].map(([value,label]) => <button type="button" key={value} className={financePeriod === value ? "active" : ""} onClick={() => setFinancePeriod(value)}>{label}</button>)}</div>
      <button onClick={exportFinance}><ReceiptText /> Export report</button>
    </div>

    <nav className="financeSectionTabs orderTabs" aria-label="Finance sections">
      {financeTabs.map(([value, label]) => <button type="button" key={value} className={financeTab === value ? "active" : ""} onClick={() => setFinanceTab(value)}>{label}</button>)}
    </nav>

    {financeTab === "overview" && <>
    <div className="miniMetricGrid financeMetrics">
      <article><CircleDollarSign /><span><b>{money(grossRevenue)}</b>Total sales</span></article>
      <article><ShoppingBag /><span><b>{deliveredOrderCount}</b>Delivered orders</span></article>
      <article><Package /><span><b>{totalProductsSold}</b>Total products sold</span></article>
      <article><WalletCards /><span><b>{money(deliveredCogs)}</b>Total product cost</span></article>
      <article><ShoppingBag /><span><b>{money(courierDeliveryCost)}</b>Courier delivery cost</span></article>
      <article><WalletCards /><span><b>{money(availableCash)}</b>Available business cash</span></article>
      <article><CircleDollarSign /><span><b>{money(ownerInvestments)}</b>Owner funds added</span></article>
      <article className={ownerWithdrawals ? "alertMetric" : ""}><CircleDollarSign /><span><b>{money(ownerWithdrawals)}</b>Owner withdrawals</span></article>
      <article className={returnedOrderCount ? "alertMetric" : ""}><Package /><span><b>{returnedOrderCount}</b>Returned orders</span></article>
      <article className={returnCourierCost ? "alertMetric" : ""}><TrendingUp /><span><b>{money(returnCourierCost)}</b>Return courier loss</span></article>
      <article><Landmark /><span><b>{money(receivables)}</b>Pending COD</span></article>
      <article className={overdueSupplierBills.length ? "alertMetric" : ""}><Landmark /><span><b>{money(supplierPayableTotal)}</b>Supplier payables</span></article>
      <article><TrendingUp /><span><b>{money(profitAfterProductCost)}</b>Profit before deductions</span></article>
      <article className={netProfit < 0 ? "alertMetric" : ""}><TrendingUp /><span><b>{money(netProfit)}</b>Final net profit</span></article>
    </div>

    <section className="financeGrid financeGridWide">
      <form className="adminCard financeExpenseForm" onSubmit={saveProfitAllocation}>
        <h2>Profit allocation planner <HelpHint text="This only plans how current net profit may be used. It does not move cash or create an expense." /></h2>
        <p className="trackingNumber">Plan from current net profit only. Saving this plan does not create an expense or personal withdrawal.</p>
        <div className="formRow"><label>Marketing %<input type="number" min="0" max="100" value={profitAllocation.marketingPercent} onChange={(event) => setProfitAllocation((current) => ({ ...current, marketingPercent: event.target.value }))} /></label><label>Owner / family %<input type="number" min="0" max="100" value={profitAllocation.ownerPercent} onChange={(event) => setProfitAllocation((current) => ({ ...current, ownerPercent: event.target.value }))} /></label></div>
        <div className="financeStatement"><div><span>Current net profit to allocate</span><b>{money(allocatableProfit)}</b></div><div><span>Marketing budget ({profitAllocation.marketingPercent || 0}%)</span><b>{money(marketingAllocation)}</b></div><div><span>Owner / family amount ({profitAllocation.ownerPercent || 0}%)</span><b>{money(ownerAllocation)}</b></div><div className="statementTotal"><span>New stock / reinvestment ({Math.max(0, 100 - Number(profitAllocation.marketingPercent || 0) - Number(profitAllocation.ownerPercent || 0))}%)</span><b>{money(stockAllocation)}</b></div></div>
        <button disabled={cashbookLoading}>{cashbookLoading ? "Saving..." : "Save allocation plan"}</button>
      </form>
    </section>

    <section className="financeGrid financeGridWide"><div className="adminCard financeSummaryCard"><div className="cardHeading"><div><h2>Management KPIs</h2><p>Owner view of sales, customers, inventory and cash health.</p></div></div><div className="financeStatement"><div><span>Average order value</span><b>{money(deliveredOrderCount ? grossRevenue / deliveredOrderCount : 0)}</b></div><div><span>Return rate</span><b>{deliveredOrderCount + returnedOrderCount ? Math.round(returnedOrderCount / (deliveredOrderCount + returnedOrderCount) * 100) : 0}%</b></div><div><span>Low-stock products</span><b>{safeProducts.filter((product) => Number(product.stock || 0) <= Number(product.lowStockThreshold || 5)).length}</b></div><div className="statementTotal"><span>Cash after 30-day forecast</span><b>{money(expectedClosingCash)}</b></div></div></div><div className="adminCard financeSummaryCard"><div className="cardHeading"><div><h2>Inventory finance</h2><p>Retail and saved purchase value</p></div></div><div className="inventoryFinanceList"><div><span>Retail value on hand</span><b>{money(inventoryRetailValue)}</b></div><div><span>Purchase value on hand</span><b>{money(inventoryCostValue)}</b></div><div><span>Low-stock retail exposure</span><b>{money(lowStockValue)}</b></div><div><span>Products tracked</span><b>{safeProducts.length}</b></div></div></div></section>

    <section className="financeGrid financeGridWide">
      <div className="adminCard financeSummaryCard"><div className="cardHeading"><div><h2>30-day cash-flow forecast</h2><p>Estimate based on current cash, pending COD and supplier bills due within 30 days.</p></div></div><div className="financeStatement"><div><span>Current available cash</span><b>{money(availableCash)}</b></div><div><span>Expected COD collections</span><b>+ {money(receivables)}</b></div><div><span>Supplier payables due</span><b>- {money(upcomingPayables)}</b></div><div className="statementTotal"><span>Expected closing cash</span><b>{money(expectedClosingCash)}</b></div></div></div>
      <form className="adminCard financeExpenseForm" onSubmit={saveFixedCosts}><h2>Break-even calculator <HelpHint text="Fixed monthly costs are regular costs like rent, salaries, utilities and software. Contribution per order excludes fixed costs." /></h2><label>Monthly fixed costs<input type="number" min="0" value={fixedCosts} onChange={(event) => setFixedCosts(event.target.value)} placeholder="Rent, salaries, utilities..." /></label><div className="financeStatement"><div><span>Average contribution per delivered order</span><b>{money(contributionPerOrder)}</b></div><div><span>Break-even delivered orders</span><b>{breakEvenOrders || "Add sales data"}</b></div><div className="statementTotal"><span>Break-even sales target</span><b>{breakEvenOrders ? money(breakEvenOrders * (grossRevenue / deliveredOrderCount)) : "—"}</b></div></div><button disabled={cashbookLoading}>{cashbookLoading ? "Saving..." : "Save fixed costs"}</button></form>
    </section>
    </>}

    <section className="financeGrid financeGridWide"><div className="adminCard financeSummaryCard"><div className="cardHeading"><div><h2>Management KPIs</h2><p>Owner view of sales, customers, inventory and cash health.</p></div></div><div className="financeStatement"><div><span>Average order value</span><b>{money(deliveredOrderCount ? grossRevenue / deliveredOrderCount : 0)}</b></div><div><span>Return rate</span><b>{deliveredOrderCount + returnedOrderCount ? Math.round(returnedOrderCount / (deliveredOrderCount + returnedOrderCount) * 100) : 0}%</b></div><div><span>Low-stock products</span><b>{safeProducts.filter((product) => Number(product.stock || 0) <= Number(product.lowStockThreshold || 5)).length}</b></div><div className="statementTotal"><span>Cash after 30-day forecast</span><b>{money(expectedClosingCash)}</b></div></div></div><div className="adminCard financeSummaryCard"><div className="cardHeading"><div><h2>Marketing ROI</h2><p>Only campaign-attributed sales are included.</p></div></div><div className="financeStatement"><div><span>Campaign spend</span><b>{money(marketingSpendTotal)}</b></div><div><span>Attributed sales</span><b>{money(marketingSalesTotal)}</b></div><div><span>ROAS</span><b>{marketingSpendTotal ? `${(marketingSalesTotal / marketingSpendTotal).toFixed(2)}x` : "—"}</b></div><div className="statementTotal"><span>Customer acquisition cost</span><b>{marketingCustomersTotal ? money(marketingSpendTotal / marketingCustomersTotal) : "—"}</b></div></div></div></section>
    <section className="financeGrid financeGridWide"><div className="adminCard managementCard"><div className="inventoryListHead"><div><h2>Marketing campaigns</h2><span>Spend and attributed results</span></div></div><div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Campaign</th><th>Platform</th><th>Spend</th><th>Sales</th><th>ROAS</th></tr></thead><tbody>{marketingCampaigns.map((campaign) => <tr key={campaign.id}><td><b>{campaign.name}</b></td><td>{campaign.platform}</td><td>{money(campaign.spend)}</td><td>{money(campaign.sales)}</td><td>{campaign.spend ? `${(campaign.sales / campaign.spend).toFixed(2)}x` : "—"}</td></tr>)}{!marketingCampaigns.length && <tr><td colSpan="5" className="emptyFinanceCell">No campaigns added yet.</td></tr>}</tbody></table></div></div><form className="adminCard financeExpenseForm" onSubmit={addMarketingCampaign}><h2>Add marketing campaign</h2><label>Campaign name<input name="name" required placeholder="e.g. Eid Instagram campaign" /></label><div className="formRow"><label>Platform<select name="platform"><option>Instagram</option><option>Meta Ads</option><option>TikTok</option><option>Google</option><option>Other</option></select></label><label>Date<input name="date" type="date" defaultValue={today} /></label></div><div className="formRow"><label>Spend<input name="spend" type="number" min="0" defaultValue="0" /></label><label>Attributed sales<input name="sales" type="number" min="0" defaultValue="0" /></label></div><label>New customers<input name="customers" type="number" min="0" defaultValue="0" /></label><button disabled={cashbookLoading}>{cashbookLoading ? "Saving..." : "Save campaign"}</button></form></section>

    <section className="financeGrid financeGridWide">
      <div className="adminCard financeSummaryCard"><div className="cardHeading"><div><h2>30-day cash-flow forecast</h2><p>Estimate based on current cash, pending COD and supplier bills due within 30 days.</p></div></div><div className="financeStatement"><div><span>Current available cash</span><b>{money(availableCash)}</b></div><div><span>Expected COD collections</span><b>+ {money(receivables)}</b></div><div><span>Supplier payables due</span><b>- {money(upcomingPayables)}</b></div><div className="statementTotal"><span>Expected closing cash</span><b>{money(expectedClosingCash)}</b></div></div></div>
      <form className="adminCard financeExpenseForm" onSubmit={saveFixedCosts}><h2>Break-even calculator <HelpHint text="Fixed monthly costs are regular costs like rent, salaries, utilities and software. Contribution per order excludes fixed costs." /></h2><label>Monthly fixed costs<input type="number" min="0" value={fixedCosts} onChange={(event) => setFixedCosts(event.target.value)} placeholder="Rent, salaries, utilities..." /></label><div className="financeStatement"><div><span>Average contribution per delivered order</span><b>{money(contributionPerOrder)}</b></div><div><span>Break-even delivered orders</span><b>{breakEvenOrders || "Add sales data"}</b></div><div className="statementTotal"><span>Break-even sales target</span><b>{breakEvenOrders ? money(breakEvenOrders * (grossRevenue / deliveredOrderCount)) : "—"}</b></div></div><button disabled={cashbookLoading}>{cashbookLoading ? "Saving..." : "Save fixed costs"}</button></form>
    </section>

    <section className="financeGrid financeGridWide">
      <div className="adminCard managementCard">
        <div className="inventoryListHead"><div><h2>Supplier payables</h2><span>{overdueSupplierBills.length ? `${overdueSupplierBills.length} overdue — action needed` : "Bills and due dates"}</span></div><b>{money(supplierPayableTotal)} due</b></div>
        <div className="adminTableWrap"><table className="adminTable financeTable"><thead><tr><th>Supplier</th><th>Reference</th><th>Due date</th><th>Bill</th><th>Paid</th><th>Remaining</th><th /></tr></thead><tbody>{supplierBills.map((bill) => { const remaining = Math.max(0, Number(bill.total) - Number(bill.paid)); const payments = cashbookTransactions.filter((entry) => entry.supplierBillId === bill.id); const dueSoon = bill.dueDate && bill.dueDate >= today && bill.dueDate <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0,10); return <tr key={bill.id}><td><b>{bill.supplier}</b>{payments.length > 0 && <small><br />{payments.length} payment{payments.length === 1 ? "" : "s"}: {payments.map((entry) => `${entry.date} ${money(entry.amount)}`).join(" · ")}</small>}</td><td>{bill.reference || "—"}</td><td className={dueSoon && remaining ? "expenseAmount" : ""}>{bill.dueDate || "—"}{dueSoon && remaining ? <small><br />Due soon</small> : null}</td><td>{money(bill.total)}</td><td>{money(bill.paid)}</td><td className={bill.dueDate && bill.dueDate < today && remaining ? "expenseAmount" : ""}>{money(remaining)}</td><td>{remaining > 0 && <button className="editProductButton" onClick={() => recordSupplierPayment(bill)} disabled={cashbookLoading}>Pay</button>}</td></tr>; })}{!supplierBills.length && <tr><td colSpan="7" className="emptyFinanceCell">No supplier bills added yet.</td></tr>}</tbody></table></div>
      </div>
      <form className="adminCard financeExpenseForm" onSubmit={addSupplierBill}>
        <h2>Add supplier bill</h2><p className="trackingNumber">Record the full bill, any amount already paid, and the due date. This creates a payable, not an expense twice.</p>
        <label>Supplier<input name="supplier" required placeholder="e.g. Main fabric supplier" /></label><div className="formRow"><label>Bill/reference<input name="reference" placeholder="Invoice or WhatsApp ref" /></label><label>Bill date<input name="date" type="date" defaultValue={today} /></label></div><div className="formRow"><label>Total bill<input name="total" type="number" min="1" required /></label><label>Already paid<input name="paid" type="number" min="0" defaultValue="0" /></label></div><label>Due date<input name="dueDate" type="date" /></label><label>Note<input name="note" placeholder="What was purchased" /></label><button disabled={cashbookLoading}>{cashbookLoading ? "Saving..." : "Save payable"}</button>
      </form>
    </section>

    <section className="financeGrid financeGridWide">
      <div className="adminCard financeSummaryCard">
        <div className="cardHeading"><div><h2>Profit &amp; Loss statement</h2><p>Actual delivered-order performance. Product cost is recognised only when units sell.</p></div><b>{profitMargin}% net margin</b></div>
        <div className="financeStatement">
          <div><span>Sales revenue</span><b>+ {money(grossRevenue)}</b></div>
          <div><span>Less: cost of goods sold</span><b>- {money(deliveredCogs)}</b></div>
          <div><span>Gross profit</span><b>{money(grossRevenue - deliveredCogs)}</b></div>
          <div><span>Less: GST and tax</span><b>- {money(gstTaxTotal)}</b></div>
          <div><span>Less: delivered-order courier cost</span><b>- {money(courierDeliveryCost)}</b></div>
          <div><span>Less: returned-order courier loss</span><b>- {money(returnCourierCost)}</b></div>
          <div><span>Less: operating expenses</span><b>- {money(profitExpenseTotal)}</b></div>
          <div className="statementTotal"><span>Net profit / loss</span><b>{money(netProfit)}</b></div>
        </div>
      </div>
      <div className="adminCard financeSummaryCard">
        <div className="cardHeading"><div><h2>Returns-loss report</h2><p>Returned orders do not create sales revenue. Courier loss is charged at Rs. 200 per returned order.</p></div></div>
        <div className="financeStatement">
          <div><span>Returned orders</span><b>{returnedOrderCount}</b></div>
          <div><span>Return rate</span><b>{deliveredOrderCount + returnedOrderCount ? Math.round((returnedOrderCount / (deliveredOrderCount + returnedOrderCount)) * 100) : 0}%</b></div>
          <div><span>Return courier cost</span><b>- {money(returnCourierCost)}</b></div>
          <div><span>Stock action</span><b>Inspect before restock</b></div>
        </div>
        {returnedOrders.length > 0 && <div className="trackingNumber">Returned: {returnedOrders.slice(0, 4).map((order) => `${order.id} (${order.customer})`).join(" · ")}{returnedOrders.length > 4 ? ` +${returnedOrders.length - 4} more` : ""}</div>}
      </div>
    </section>

    <section className="financeGrid">
      <div className="adminCard financeSummaryCard">
        <div className="cardHeading"><div><h2>Profit summary <HelpHint text="COGS means the saved cost of delivered products. Cashbook stock purchases are not deducted twice; their cost is counted when units sell." /></h2><p>Follow the steps below from sales to final profit.</p></div><b>{profitMargin}% margin</b></div>
        <div className="financeStatement">
          <div><span>1. Product sales ({totalProductsSold} items)</span><b>+ {money(deliveredProductRevenue)}</b></div>
          <div><span>2. Delivery fees collected</span><b>{deliveryCollected >= 0 ? "+ " : "- "}{money(Math.abs(deliveryCollected))}</b></div>
          <div><span>3. Total sale received</span><b>{money(grossRevenue)}</b></div>
          <div><span>4. Less: saved product cost</span><b>- {money(deliveredCogs)}</b></div>
          <div><span>5. Profit after product cost</span><b>{money(profitAfterProductCost)}</b></div>
          <div><span>6. Less: GST + Tax (5% of product sales)</span><b>- {money(gstTaxTotal)}</b></div>
          <div><span>7. Less: courier delivery (Rs. 200 × {deliveredOrderCount} orders)</span><b>- {money(courierDeliveryCost)}</b></div>
          <div><span>8. Less: returned-order courier loss (Rs. 200 × {returnedOrderCount} orders)</span><b>- {money(returnCourierCost)}</b></div>
          <div><span>9. Less: operating expenses</span><b>- {money(profitExpenseTotal)}</b></div>
          {productionCashOutflow > 0 && <div><span>Stock purchases tracked in Cashbook</span><b>{money(productionCashOutflow)} (deducted when units sell)</b></div>}
          <div className="statementTotal"><span>10. Final net profit</span><b>{money(netProfit)}</b></div>
        </div>
        <div className="financeControls">
          <label>GST<input readOnly value="1% per product" /></label>
          <label>Tax<input readOnly value="4% per product" /></label>
          <label>Packaging expense<input type="number" min="0" value={packagingExpense} onChange={(event) => setPackagingExpense(event.target.value)} onBlur={() => saveManualFinance({ packagingExpense })} /></label>
          <label>Extra delivery expense<input type="number" min="0" value={deliveryExpense} onChange={(event) => setDeliveryExpense(event.target.value)} onBlur={() => saveManualFinance({ deliveryExpense })} /></label>
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

    <section className="financeGrid financeGridWide financeReportsPanel">
      <div className="adminCard financeSummaryCard">
        <div className="cardHeading"><div><h2>Reports &amp; exports</h2><p>Download the current finance period for review or sharing.</p></div></div>
        <div className="financeStatement"><div><span>Selected period</span><b>{financePeriod === "all" ? "All time" : financePeriod === "month" ? "This month" : "Last month"}</b></div><div><span>Delivered sales</span><b>{money(grossRevenue)}</b></div><div><span>Net profit / loss</span><b>{money(netProfit)}</b></div><div className="statementTotal"><span>Supplier payables</span><b>{money(supplierPayableTotal)}</b></div></div>
      </div>
      <div className="adminCard financeExpenseForm"><h2>Export finance report</h2><p className="trackingNumber">CSV includes sales, costs, courier, GST/tax, cash and inventory values for the selected period.</p><button type="button" onClick={exportFinance}><ReceiptText /> Download CSV report</button></div>
    </section>
  </div>;
}

function InventoryPanel({ products, movements, orders, connected, currentAdminUser, onAdjust, onCreateCustomInventory, onCreateProductionBatch, initialView }) {
  const emptyProductionCosts = () => ({ fabric: 0, stitching: 0, stitchingMaterial: 0, packaging: 0, travel: 0, other: 0 });
  const inventoryMoney = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;
  const newProductionItem = () => ({ key: `batch-item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, productId: "", quantity: "", newProductName: "", newProductPrice: "", newProductCategory: "Kurtis", newProductImage: "", directCostBreakdown: emptyProductionCosts() });
  const [tab, setTab] = useState("Stock");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogProductId, setDialogProductId] = useState("");
  const [productionOpen, setProductionOpen] = useState(false);
  const [productionSaving, setProductionSaving] = useState(false);
  // Kept for the legacy dialog markup below; multi-product batches use productionItems.
  const [productionProductId, setProductionProductId] = useState("");
  const [productionItems, setProductionItems] = useState(() => [newProductionItem()]);
  const [productionBatches, setProductionBatches] = useState([]);
  const [productionBatchesLoading, setProductionBatchesLoading] = useState(true);
  const [voidingBatchId, setVoidingBatchId] = useState("");
  const [voidBatch, setVoidBatch] = useState(null);
  const [voidConfirmation, setVoidConfirmation] = useState("");
  const [inventoryView, setInventoryView] = useState(initialView === "low-stock" ? "Low stock" : "All");
  const [inventorySearch, setInventorySearch] = useState("");
  const [localHistory, setLocalHistory] = useState([]);
  const [sourceSearch, setSourceSearch] = useState("");
  const [resourcesSaving, setResourcesSaving] = useState(false);
  const [profitProjectionView, setProfitProjectionView] = useState("product");
  const [expectedItemsPerOrder, setExpectedItemsPerOrder] = useState("");
  const [projectionTransactions, setProjectionTransactions] = useState([]);
  const [projectionFinanceLoaded, setProjectionFinanceLoaded] = useState(false);
  const [projectionFinanceAvailable, setProjectionFinanceAvailable] = useState(false);
  const [inventorySources, setInventorySources] = useState([
    { id: "stitching-main", name: "Main stitching unit", type: "Stitching unit", contact: "", location: "Pakistan", notes: "Primary production source", status: "Active" },
    { id: "materials-general", name: "General trims supplier", type: "Material supplier", contact: "", location: "Pakistan", notes: "Buttons, laces and finishing items", status: "Active" },
  ]);
  const [materials, setMaterials] = useState([
    { id: "buttons", item: "Buttons", category: "Buttons", sourceId: "materials-general", quantity: 0, unit: "pcs", unitCost: 0, reorderAt: 50, notes: "", status: "Tracked" },
    { id: "laces", item: "Laces", category: "Laces", sourceId: "materials-general", quantity: 0, unit: "meters", unitCost: 0, reorderAt: 20, notes: "", status: "Tracked" },
  ]);

  useEffect(() => {
    if (initialView !== "returns-inspection") return;
    const timer = window.setTimeout(() => document.getElementById("returned-order-inspection")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    return () => window.clearTimeout(timer);
  }, [initialView]);

  async function saveProductionBatch(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const sharedCostBreakdown = Object.fromEntries(["fabric", "stitching", "stitchingMaterial", "packaging", "travel", "other"].map((key) => [key, Number(form.get(`shared-${key}`) || 0)]));
    setProductionSaving(true);
    try {
      await onCreateProductionBatch({ items: productionItems.map(({ key, ...item }) => ({ ...item, quantity: Number(item.quantity || 0), directCostBreakdown: Object.fromEntries(Object.entries(item.directCostBreakdown).map(([name, value]) => [name, Number(value || 0)])) })), sharedCostBreakdown, date: form.get("date"), note: form.get("note") });
      await loadProductionBatches();
      setProductionOpen(false);
      setProductionItems([newProductionItem()]);
    } catch (error) { window.alert(error.message || "Unable to save production batch."); } finally { setProductionSaving(false); }
  }

  function updateProductionItem(key, patch) {
    setProductionItems((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item));
  }

  function updateProductionItemCost(key, costKey, value) {
    setProductionItems((current) => current.map((item) => item.key === key ? { ...item, directCostBreakdown: { ...item.directCostBreakdown, [costKey]: value } } : item));
  }

  async function loadProductionBatches() {
    setProductionBatchesLoading(true);
    try {
      const response = await fetch("/api/admin/production-batches", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load production batches.");
      setProductionBatches(result.batches || []);
    } catch (error) {
      setProductionBatches([]);
    } finally {
      setProductionBatchesLoading(false);
    }
  }

  function requestVoidBatch(batch) {
    setVoidBatch(batch);
    setVoidConfirmation("");
  }

  function closeVoidBatch() {
    if (voidingBatchId) return;
    setVoidBatch(null);
    setVoidConfirmation("");
  }

  async function voidProductionBatch(event) {
    if (event?.id) {
      if (currentAdminUser?.role !== "Owner") {
        window.alert("Only an Owner can void a production batch.");
        return;
      }
      requestVoidBatch(event);
      return;
    }
    event.preventDefault();
    const batch = voidBatch;
    if (!batch || voidConfirmation.trim() !== `VOID ${batch.id}`) return;
    setVoidingBatchId(batch.id);
    try {
      const response = await fetch("/api/admin/production-batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "void", batchId: batch.id, confirmation: voidConfirmation.trim() }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to void production batch.");
      setProductionBatches(result.batches || []);
      setVoidBatch(null);
      setVoidConfirmation("");
      window.alert("Production batch voided. Its Finance production expense has been removed.");
    } catch (error) {
      window.alert(error.message || "Unable to void production batch.");
    } finally {
      setVoidingBatchId("");
    }
  }

  useEffect(() => { loadProductionBatches(); }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/admin/inventory-projection", { cache: "no-store" })
      .then((response) => response.json().then((result) => ({ ok: response.ok, result })))
      .then(({ ok, result }) => {
        if (!ok) throw new Error(result.error || "Unable to load finance assumptions.");
        if (active) {
          setProjectionTransactions(result.transactions || []);
          setProjectionFinanceAvailable(true);
        }
      })
      .catch(() => {})
      .finally(() => { if (active) setProjectionFinanceLoaded(true); });
    return () => { active = false; };
  }, []);

  async function saveInventoryResources(nextSources, nextMaterials) {
    setInventorySources(nextSources);
    setMaterials(nextMaterials);
    setResourcesSaving(true);
    try {
      const response = await fetch("/api/admin/inventory-resources", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sources: nextSources, materials: nextMaterials }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to save sources and materials.");
      setInventorySources(result.sources || nextSources);
      setMaterials(result.materials || nextMaterials);
      localStorage.removeItem("bustaniya-inventory-sources");
    } catch (error) {
      window.alert(error.message || "Unable to save sources and materials.");
    } finally { setResourcesSaving(false); }
  }

  useEffect(() => {
    let active = true;
    const localFallback = (() => { try { return JSON.parse(localStorage.getItem("bustaniya-inventory-sources") || "{}"); } catch { return {}; } })();
    fetch("/api/admin/inventory-resources", { cache: "no-store" })
      .then((response) => response.json().then((result) => ({ ok: response.ok, result })))
      .then(({ ok, result }) => {
        if (!ok) throw new Error(result.error || "Unable to load sources and materials.");
        const remoteSources = result.sources || [];
        const remoteMaterials = result.materials || [];
        const fallbackSources = Array.isArray(localFallback.sources) ? localFallback.sources : [];
        const fallbackMaterials = Array.isArray(localFallback.materials) ? localFallback.materials : [];
        if (!active) return;
        if (remoteSources.length || remoteMaterials.length) {
          setInventorySources(remoteSources);
          setMaterials(remoteMaterials);
          localStorage.removeItem("bustaniya-inventory-sources");
        } else {
          // One-time migration for records created before Supabase persistence.
          saveInventoryResources(
            fallbackSources.length ? fallbackSources : inventorySources,
            fallbackMaterials.length ? fallbackMaterials : materials,
          );
        }
      })
      .catch(() => {})
    return () => { active = false; };
  }, []);

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
  const stockCostValue = products.reduce((sum, product) => sum + Number(product.costTotalPkr || 0) * Number(product.stock || 0), 0);
  const stockSalesTax = Math.round(value * 0.05);
  const potentialStockProfit = value - stockCostValue - stockSalesTax;
  const historicalOrders = connected ? (orders || []) : [];
  const deliveredHistoricalOrders = historicalOrders.filter(isDeliveredOrder);
  const returnedHistoricalOrders = historicalOrders.filter(isReturnedOrder);
  const historicalSoldUnits = deliveredHistoricalOrders.reduce((sum, order) => sum + normalizeOrderItems(order.raw || order)
    .reduce((itemTotal, item) => itemTotal + Number(item.quantity || 0), 0), 0);
  const cogsSold = deliveredHistoricalOrders.reduce((sum, order) => sum + normalizeOrderItems(order.raw || order).reduce((itemsTotal, item) => {
    const product = products.find((entry) => String(entry.id) === String(item.productId));
    return itemsTotal + Number(item.quantity || 0) * Number(product?.costTotalPkr || 0);
  }, 0), 0);
  const stockPurchaseCash = projectionTransactions.filter((entry) => entry.type === "business_expense" && (entry.productionBatchId || entry.category === "Inventory production" || String(entry.title || "").startsWith("Production batch "))).reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const restockCashRequired = products.reduce((sum, product) => {
    const target = Math.max(Number(product.lowStockThreshold || 5) * 2, 10);
    return sum + Math.max(0, target - Number(product.stock || 0)) * Number(product.costTotalPkr || 0);
  }, 0);
  const skuProfitRows = products.map((product) => {
    const soldItems = deliveredHistoricalOrders.flatMap((order) => normalizeOrderItems(order.raw || order)).filter((item) => String(item.productId) === String(product.id));
    const unitsSold = soldItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    const sales = soldItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.price || product.price || 0), 0);
    const cost = unitsSold * Number(product.costTotalPkr || 0);
    const margin = sales ? Math.round(((sales - cost - Math.round(sales * .05)) / sales) * 100) : 0;
    return { product, unitsSold, sales, cost, margin };
  }).filter((row) => row.unitsSold > 0).sort((a, b) => b.sales - a.sales);
  const stockAgeRows = products.map((product) => {
    const receipts = (movements || []).filter((movement) => String(movement.product_id) === String(product.id) && Number(movement.quantity_change || 0) > 0 && movement.created_at).map((movement) => new Date(movement.created_at)).filter((date) => !Number.isNaN(date.getTime()));
    const oldestReceipt = receipts.length ? new Date(Math.min(...receipts.map((date) => date.getTime()))) : null;
    const days = oldestReceipt ? Math.max(0, Math.floor((Date.now() - oldestReceipt.getTime()) / 86400000)) : null;
    return { product, days };
  }).filter((row) => Number(row.product.stock || 0) > 0);
  const stockAgeCounts = { fresh: stockAgeRows.filter((row) => row.days !== null && row.days <= 30).length, normal: stockAgeRows.filter((row) => row.days > 30 && row.days <= 60).length, slow: stockAgeRows.filter((row) => row.days > 60 && row.days <= 90).length, dead: stockAgeRows.filter((row) => row.days > 90).length, legacy: stockAgeRows.filter((row) => row.days === null).length };
  const historicalItemsPerOrder = deliveredHistoricalOrders.length ? historicalSoldUnits / deliveredHistoricalOrders.length : 1;
  const projectionItemsPerOrder = Math.max(1, Number(expectedItemsPerOrder || historicalItemsPerOrder || 1));
  const projectedOrderCount = total ? Math.ceil(total / projectionItemsPerOrder) : 0;
  const historicalFulfilledOrderCount = deliveredHistoricalOrders.length + returnedHistoricalOrders.length;
  const returnRate = historicalFulfilledOrderCount ? returnedHistoricalOrders.length / historicalFulfilledOrderCount : 0;
  const projectedReturnCourierLoss = Math.round(projectedOrderCount * returnRate * 200);
  const marketingSpend = projectionTransactions
    .filter((entry) => entry.type === "business_expense" && String(entry.category || "").toLowerCase() === "marketing")
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const projectedMarketingCost = historicalSoldUnits ? Math.round((marketingSpend / historicalSoldUnits) * total) : 0;
  const allCostsProjectedProfit = potentialStockProfit - projectedReturnCourierLoss - projectedMarketingCost;
  const displayedStockProfit = profitProjectionView === "all" ? allCostsProjectedProfit : potentialStockProfit;
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
    const nextSources = [{
      id: `source-${Date.now()}`,
      name,
      type: data.get("type") || "Material supplier",
      contact: data.get("contact") || "",
      location: data.get("location") || "",
      notes: data.get("notes") || "",
      status: data.get("status") || "Active",
    }, ...inventorySources];
    saveInventoryResources(nextSources, materials);
    event.currentTarget.reset();
  }

  function addMaterial(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const item = String(data.get("item") || "").trim();
    if (!item) return;
    const nextMaterials = [{
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
    }, ...materials];
    saveInventoryResources(inventorySources, nextMaterials);
    event.currentTarget.reset();
  }

  function updateMaterialQuantity(materialId, change) {
    const nextMaterials = materials.map((item) =>
      item.id === materialId
        ? { ...item, quantity: Math.max(0, Number(item.quantity || 0) + change) }
        : item
    );
    saveInventoryResources(inventorySources, nextMaterials);
  }

  if (productionOpen) {
    return <div className="inventorySystem"><div className="adminOverlay" onClick={() => setProductionOpen(false)} /><form className="inventoryDialog" onSubmit={saveProductionBatch}>
      <DialogHead title="Create multi-product production batch" onClose={() => setProductionOpen(false)} />
      <p className="trackingNumber">Add every design in this production run. Shared costs are divided by total finished-suit quantity; direct costs remain with their selected design.</p>
      {productionItems.map((item, index) => <section className="adminCard" style={{ padding: "14px", marginBottom: "12px" }} key={item.key}>
        <div className="editorHeading"><p className="fieldTitle">Design {index + 1}</p>{productionItems.length > 1 && <button type="button" className="removeProductButton" onClick={() => setProductionItems((current) => current.filter((entry) => entry.key !== item.key))}>Remove</button>}</div>
        <label>Design / product<select required value={item.productId} onChange={(event) => updateProductionItem(item.key, { productId: event.target.value })}><option value="">Select product</option><option value="__new__">+ Create new product/design</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
        {item.productId === "__new__" && <><label>Product / design name<input required value={item.newProductName} onChange={(event) => updateProductionItem(item.key, { newProductName: event.target.value })} placeholder="e.g. Blue Arora – Design 4" /></label><div className="formRow"><label>Selling price<input type="number" min="0" required value={item.newProductPrice} onChange={(event) => updateProductionItem(item.key, { newProductPrice: event.target.value })} placeholder="0" /></label><label>Category<input value={item.newProductCategory} onChange={(event) => updateProductionItem(item.key, { newProductCategory: event.target.value })} placeholder="Kurtis" /></label></div><label>Image URL (optional)<input value={item.newProductImage} onChange={(event) => updateProductionItem(item.key, { newProductImage: event.target.value })} placeholder="https://..." /></label></>}
        <label>Finished suits for this design<input type="number" min="1" required value={item.quantity} onChange={(event) => updateProductionItem(item.key, { quantity: event.target.value })} placeholder="25" /></label>
        <p className="fieldTitle">Direct costs for this design (PKR)</p>
        <div className="formRow"><label>Fabric<input type="number" min="0" value={item.directCostBreakdown.fabric || ""} onChange={(event) => updateProductionItemCost(item.key, "fabric", event.target.value)} /></label><label>Stitching<input type="number" min="0" value={item.directCostBreakdown.stitching || ""} onChange={(event) => updateProductionItemCost(item.key, "stitching", event.target.value)} /></label></div>
        <div className="formRow"><label>Stitching material<input type="number" min="0" value={item.directCostBreakdown.stitchingMaterial || ""} onChange={(event) => updateProductionItemCost(item.key, "stitchingMaterial", event.target.value)} /></label><label>Packaging<input type="number" min="0" value={item.directCostBreakdown.packaging || ""} onChange={(event) => updateProductionItemCost(item.key, "packaging", event.target.value)} /></label></div>
        <div className="formRow"><label>Travel / transport<input type="number" min="0" value={item.directCostBreakdown.travel || ""} onChange={(event) => updateProductionItemCost(item.key, "travel", event.target.value)} /></label><label>Other<input type="number" min="0" value={item.directCostBreakdown.other || ""} onChange={(event) => updateProductionItemCost(item.key, "other", event.target.value)} /></label></div>
      </section>)}
      <button type="button" onClick={() => setProductionItems((current) => [...current, newProductionItem()])}><Plus /> Add another design</button>
      <section className="adminCard" style={{ padding: "14px", marginTop: "12px" }}><p className="fieldTitle">Shared costs for all designs (PKR)</p><p className="trackingNumber">These costs are divided across every suit by quantity.</p><div className="formRow"><label>Shared fabric<input name="shared-fabric" type="number" min="0" defaultValue="0" /></label><label>Shared stitching<input name="shared-stitching" type="number" min="0" defaultValue="0" /></label></div><div className="formRow"><label>Shared stitching material<input name="shared-stitchingMaterial" type="number" min="0" defaultValue="0" /></label><label>Shared packaging<input name="shared-packaging" type="number" min="0" defaultValue="0" /></label></div><div className="formRow"><label>Shared travel / transport<input name="shared-travel" type="number" min="0" defaultValue="0" /></label><label>Shared other<input name="shared-other" type="number" min="0" defaultValue="0" /></label></div></section>
      <label>Date<input name="date" type="date" defaultValue={new Date().toISOString().slice(0,10)} /></label><label>Batch note<textarea name="note" rows="2" placeholder="Supplier, stitching unit or batch reference" /></label><button className="dialogSave" disabled={productionSaving}>{productionSaving ? "Saving batch..." : "Save batch, allocate costs & add stock"}</button>
    </form></div>;
  }

  return <div className="inventorySystem">
    <div className="adminTitle"><div><p>OPERATIONS</p><h1>Inventory</h1><span>Track finished products, stitching units, suppliers and materials like buttons, laces and trims.</span></div><button onClick={() => tab === "Sources" ? setTab("Sources") : openAdjust()}><Plus /> {tab === "Sources" ? "Add source below" : "Adjust stock"}</button></div>
    <div className="miniMetricGrid">
      <article><Boxes /><span><b>{total}</b>Available units</span></article>
      <article><WalletCards /><span><b>{inventoryMoney(stockCostValue)}</b>Stock value on hand</span></article>
      <article><CircleDollarSign /><span><b>{inventoryMoney(cogsSold)}</b>COGS sold</span></article>
      <article><Landmark /><span><b>{inventoryMoney(stockPurchaseCash)}</b>Stock purchase cash</span></article>
      <article className={restockCashRequired ? "alertMetric" : ""}><TrendingUp /><span><b>{inventoryMoney(restockCashRequired)}</b>Restock cash required</span></article>
      <article className={low ? "alertMetric" : ""}><TrendingUp /><span><b>{low}</b>Low stock</span></article>
      <article><Store /><span><b>{inventorySources.length}</b>Sources</span></article>
      <article><WalletCards /><span><b>Rs. {stockCostValue.toLocaleString()}</b>Stock cost value</span></article>
      <article><TrendingUp /><span><b>Rs. {value.toLocaleString()}</b>Potential sales value</span></article>
      <article className={displayedStockProfit < 0 ? "alertMetric" : ""}><CircleDollarSign /><span><b>Rs. {displayedStockProfit.toLocaleString()}</b>{profitProjectionView === "all" ? "All-cost projected profit" : "Product-only stock profit"}</span></article>
      <article className={lowMaterialCount ? "alertMetric" : ""}><Tags /><span><b>Rs. {materialValue.toLocaleString()}</b>Material value</span></article>
    </div>

    {low + out > 0 && <div className="inventoryAlert"><Bell /><div><b>{low + out} products need attention</b><span>Out-of-stock products cannot be ordered, and low stock is highlighted here.</span></div><button onClick={() => setInventoryView(low ? "Low stock" : "Out of stock")}>Review items</button></div>}
    {returnedHistoricalOrders.length > 0 && <section id="returned-order-inspection" className="adminCard managementCard inventoryLedger"><div className="inventoryListHead"><div><h2>Returned-order inspection queue</h2><span>Inspect every returned parcel before adding any unit back to available stock.</span></div><b>{returnedHistoricalOrders.length} pending</b></div><div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Finance impact</th><th>Required action</th></tr></thead><tbody>{returnedHistoricalOrders.slice(0, 10).map((order) => <tr key={order.id}><td><b>{order.id}</b></td><td>{order.customer || "—"}</td><td>{normalizeOrderItems(order.raw || order).map((item) => `${item.name} × ${item.quantity}`).join(", ")}</td><td className="expenseAmount">- Rs. 200 courier loss</td><td><b>Inspect → restock or mark damaged</b></td></tr>)}</tbody></table></div><p className="trackingNumber">Finance automatically deducts Rs. 200 once per returned order. Inventory is not restored automatically, so damaged or missing parcels cannot inflate stock.</p></section>}
    {lowMaterialCount > 0 && <div className="inventoryAlert materialAlert"><Bell /><div><b>{lowMaterialCount} material items need reorder review</b><span>Buttons, laces, trims and other raw materials are tracked separately from finished product stock.</span></div><button onClick={() => setTab("Sources")}>Review materials</button></div>}

    <section className="adminCard managementCard inventoryLedger">
      <div className="inventoryListHead"><div><h2>Inventory profit projection</h2><span>Estimate only — actual profit remains in Finance after orders are delivered.</span></div></div>
      <div className="inventoryViewBar"><button type="button" className={profitProjectionView === "product" ? "active" : ""} onClick={() => setProfitProjectionView("product")}>Product-only</button><button type="button" className={profitProjectionView === "all" ? "active" : ""} onClick={() => setProfitProjectionView("all")}>All costs included</button><HelpHint text="Estimated stock profit after expected return-courier loss and saved marketing spend. Actual profit remains in Finance." /></div>
      {profitProjectionView === "product" ? <div className="inventoryAlert materialAlert"><CircleDollarSign /><div><b>Product-only stock profit: Rs. {potentialStockProfit.toLocaleString()}</b><span>Potential sales minus saved per-item product cost and 5% GST/tax. This is the clean product margin before delivery, returns and marketing.</span></div></div> : <><div className="financeControls"><label>Expected items per order<input type="number" min="1" step="0.1" value={expectedItemsPerOrder || historicalItemsPerOrder.toFixed(1)} onChange={(event) => setExpectedItemsPerOrder(event.target.value)} /></label><label>Projected orders<input readOnly value={projectedOrderCount} /></label><label>Historical return rate<input readOnly value={`${Math.round(returnRate * 100)}%`} /></label></div><div className="financeStatement"><div><span>Product-only stock profit</span><b>{inventoryMoney(potentialStockProfit)}</b></div><div><span>Delivery collected less courier (Rs. 200 per order)</span><b>Rs. 0</b></div><div><span>Expected returned-order courier loss</span><b>- {inventoryMoney(projectedReturnCourierLoss)}</b></div><div><span>Actual marketing spend allocated per sold item</span><b>- {inventoryMoney(projectedMarketingCost)}</b></div><div className="statementTotal"><span>All-cost projected inventory profit</span><b>{inventoryMoney(allCostsProjectedProfit)}</b></div></div><p className="trackingNumber">{!projectionFinanceLoaded ? "Loading Finance-linked assumptions..." : projectionFinanceAvailable ? "Marketing uses saved Cashbook entries in the Marketing category. Return loss uses your historic returned-order rate; change expected items per order if needed." : "Finance marketing data is unavailable for this account, so marketing is shown as Rs. 0. Product-only calculation remains accurate."}</p></>}
    </section>

    <section className="financeGrid financeGridWide">
      <div className="adminCard managementCard"><div className="inventoryListHead"><div><h2>SKU profitability</h2><span>Delivered sales less saved unit cost and 5% GST/tax.</span></div></div><div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Product / SKU</th><th>Units sold</th><th>Sales</th><th>COGS</th><th>Net margin</th></tr></thead><tbody>{skuProfitRows.slice(0, 12).map((row) => <tr key={row.product.id}><td><b>{row.product.name}</b><br /><small>{row.product.sku || row.product.articleNumber || "—"}</small></td><td>{row.unitsSold}</td><td>Rs. {row.sales.toLocaleString()}</td><td>Rs. {row.cost.toLocaleString()}</td><td className={row.margin < 15 ? "expenseAmount" : "incomeAmount"}>{row.margin}%</td></tr>)}{!skuProfitRows.length && <tr><td colSpan="5" className="emptyFinanceCell">No delivered SKU sales yet.</td></tr>}</tbody></table></div></div>
      <div className="adminCard financeSummaryCard"><div className="cardHeading"><div><h2>Stock ageing</h2><p>Based on the oldest dated positive inventory receipt. Legacy stock without receipt date is kept separate.</p></div></div><div className="financeStatement"><div><span>Fresh stock (0–30 days)</span><b>{stockAgeCounts.fresh}</b></div><div><span>Normal stock (31–60 days)</span><b>{stockAgeCounts.normal}</b></div><div><span>Slow-moving (61–90 days)</span><b>{stockAgeCounts.slow}</b></div><div><span>Legacy stock — no dated receipt</span><b>{stockAgeCounts.legacy}</b></div><div className="statementTotal"><span>Dead-stock risk (90+ days)</span><b>{stockAgeCounts.dead}</b></div></div></div>
    </section>

    <div className="inventoryTabs">
      {["Stock","Sources","History"].map(item => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{item === "Sources" ? "Sources & Materials" : item}</button>)}
    </div>

    {tab === "Stock" && <section className="adminCard managementCard inventoryLedger">
      <div className="inventoryViewBar">
        {["All","Low stock","Out of stock"].map(item => <button type="button" key={item} className={inventoryView === item ? "active" : ""} onClick={() => setInventoryView(item)}>{item}</button>)}
      </div>
      <div className="inventoryControlBar simpleInventoryControls">
        <div className="inlineSearch"><Search /><input value={inventorySearch} onChange={(event) => setInventorySearch(event.target.value)} placeholder="Search products or SKU..." /></div>
        <button type="button" onClick={() => setProductionOpen(true)}><Plus /> Create production batch</button>
        <button type="button" onClick={() => openAdjust("__custom__")}><Plus /> Add product with stock</button>
      </div>
      <div className="adminTableWrap"><table className="adminTable inventoryTable simpleInventoryTable"><thead><tr><th>Product</th><th>SKU</th><th>Available</th><th>Threshold</th><th>Retail value</th><th>Status</th><th /></tr></thead><tbody>{visibleInventoryRows.map(product => { const status = inventoryStatus(product); return <tr key={product.id}><td><div className="tableProduct"><span style={{backgroundImage:`url(${product.image})`}}/><b>{product.name}</b></div></td><td>{product.sku || product.articleNumber || `BST-${String(product.id).padStart(4,"0")}`}</td><td><b className={Number(product.stock || 0) <= Number(product.lowStockThreshold || 5) ? "stockLow" : ""}>{Number(product.stock || 0)}</b></td><td>{Number(product.lowStockThreshold || 5)}</td><td>Rs. {(Number(product.price || 0) * Number(product.stock || 0)).toLocaleString()}</td><td><span className={`statusBadge ${status.className}`}>{status.label}</span></td><td><button className="adjustStockButton" onClick={() => openAdjust(product.id)}>Adjust</button></td></tr>})}</tbody></table>{!visibleInventoryRows.length&&<div className="inventoryEmpty">No products match this view.</div>}</div>
    </section>}

    {tab === "Stock" && <section className="adminCard managementCard inventoryLedger">
      <div className="editorHeading"><div><h2>Production batches</h2><p>Voiding is owner-only and requires a typed batch confirmation. Use it only for a test batch with no customer orders; the audit record remains.</p></div></div>
      <div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Batch</th><th>Product</th><th>Quantity</th><th>Total cost</th><th>Unit cost</th><th>Date</th><th>Status</th><th /></tr></thead><tbody>
        {productionBatches.map((batch) => <tr key={batch.id}><td><b>{batch.id}</b></td><td>{batch.productName}</td><td>{Number(batch.quantity || 0).toLocaleString()}</td><td>Rs. {Number(batch.totalCost || 0).toLocaleString()}</td><td>Rs. {Number(batch.unitCost || 0).toLocaleString()}</td><td>{batch.date || "—"}</td><td><span className={`statusBadge ${batch.status === "voided" ? "cancelled" : "delivered"}`}>{batch.status === "voided" ? "Voided" : "Active"}</span></td><td>{batch.status !== "voided" && <button className="removeProductButton" type="button" disabled={voidingBatchId === batch.id} onClick={() => voidProductionBatch(batch)}>{voidingBatchId === batch.id ? "Voiding..." : "Void test batch"}</button>}</td></tr>)}
        {!productionBatchesLoading && !productionBatches.length && <tr><td colSpan="8"><div className="inventoryEmpty">No production batches yet.</div></td></tr>}
        {productionBatchesLoading && <tr><td colSpan="8"><div className="inventoryEmpty">Loading production batches...</div></td></tr>}
      </tbody></table></div>
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
      saving={resourcesSaving}
    />}

    {tab === "History" && <InventoryList title="Stock adjustment history" headers={["Product","Change","Reason","Date","User"]} rows={history.map(x => [x.product, x.change > 0 ? `+${x.change}` : x.change, x.reason, x.date, x.user])} empty="No stock adjustments yet." />}

    {dialogOpen && <InventoryDialog products={products} productChoice={dialogProductId} setProductChoice={setDialogProductId} onClose={() => setDialogOpen(false)} onAdjust={adjustStock} />}
    {voidBatch && <><div className="adminOverlay" onClick={closeVoidBatch} /><form className="inventoryDialog" onSubmit={voidProductionBatch}>
      <DialogHead title={`Void ${voidBatch.id}`} onClose={closeVoidBatch} />
      <p className="trackingNumber">Owner-only action. It reverses the batch stock, removes its linked Finance production expense and keeps a voided audit record. Do not void a batch that has customer orders.</p>
      <label>Type <b>{`VOID ${voidBatch.id}`}</b> exactly to confirm<input value={voidConfirmation} onChange={(event) => setVoidConfirmation(event.target.value)} autoComplete="off" autoFocus /></label>
      <button className="removeProductButton" type="submit" disabled={voidingBatchId === voidBatch.id || voidConfirmation.trim() !== `VOID ${voidBatch.id}`}>{voidingBatchId === voidBatch.id ? "Voiding batch..." : "Void batch permanently"}</button>
    </form></>}
    {productionOpen && <><div className="adminOverlay" onClick={() => setProductionOpen(false)} /><form className="inventoryDialog" onSubmit={saveProductionBatch}><DialogHead title="Create production batch" onClose={() => setProductionOpen(false)} /><p className="trackingNumber">Add one design at a time. Stock, per-suit cost and Finance expense will update together.</p><label>Design / product<select name="productId" required value={productionProductId} onChange={(event) => setProductionProductId(event.target.value)}><option value="">Select product</option><option value="__new__">+ Create new product/design</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>{productionProductId === "__new__" && <section className="adminCard" style={{ padding: "14px", marginBottom: "12px" }}><p className="fieldTitle">New product details</p><label>Product / design name<input name="newProductName" required placeholder="e.g. Blue Arora – Design 4" /></label><div className="formRow"><label>Selling price<input name="newProductPrice" type="number" min="0" required placeholder="0" /></label><label>Category<input name="newProductCategory" placeholder="e.g. Kurtis" defaultValue="Kurtis" /></label></div><label>Image URL (optional)<input name="newProductImage" placeholder="https://... or uploaded image URL" /></label></section>}<div className="formRow"><label>Finished suits<input name="quantity" type="number" min="1" required placeholder="25" /></label><label>Date<input name="date" type="date" defaultValue={new Date().toISOString().slice(0,10)} /></label></div><p className="fieldTitle">Costs for this design batch (PKR)</p><div className="formRow"><label>Fabric<input name="fabric" type="number" min="0" defaultValue="0" /></label><label>Stitching<input name="stitching" type="number" min="0" defaultValue="0" /></label></div><div className="formRow"><label>Stitching material<input name="stitchingMaterial" type="number" min="0" defaultValue="0" /></label><label>Packaging<input name="packaging" type="number" min="0" defaultValue="0" /></label></div><div className="formRow"><label>Travel / transport<input name="travel" type="number" min="0" defaultValue="0" /></label><label>Other<input name="other" type="number" min="0" defaultValue="0" /></label></div><label>Note<textarea name="note" rows="2" placeholder="Supplier, stitching unit or batch reference" /></label><button className="dialogSave" disabled={productionSaving}>{productionSaving ? "Saving batch..." : "Save batch, add stock & record cost"}</button></form></>}
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
  saving,
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
      <button disabled={saving}>{saving ? "Saving..." : "Add source"}</button>
    </form>

    <section className="adminCard managementCard inventoryMaterialsMain">
      <div className="inventoryListHead"><div><h2>Materials</h2><span>Buttons, laces, fabric, trims and packaging. Value: Rs. {materialValue.toLocaleString()}</span></div></div>
      <div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Material</th><th>Category</th><th>Source</th><th>Qty</th><th>Reorder</th><th>Value</th><th /></tr></thead><tbody>
        {materials.map((item) => {
          const low = Number(item.quantity || 0) <= Number(item.reorderAt || 0);
          return <tr key={item.id}><td><b>{item.item}</b><small className="trackingNumber">{item.notes || item.unit}</small></td><td>{item.category}</td><td>{sourceName(item.sourceId)}</td><td><b className={low ? "stockLow" : ""}>{Number(item.quantity || 0).toLocaleString()} {item.unit}</b></td><td>{Number(item.reorderAt || 0).toLocaleString()} {item.unit}</td><td>Rs. {(Number(item.quantity || 0) * Number(item.unitCost || 0)).toLocaleString()}</td><td><div className="materialQtyActions"><button type="button" disabled={saving} onClick={() => onUpdateMaterialQuantity(item.id, -1)}><Minus /></button><button type="button" disabled={saving} onClick={() => onUpdateMaterialQuantity(item.id, 1)}><Plus /></button></div></td></tr>;
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
      <button disabled={saving}>{saving ? "Saving..." : "Add material"}</button>
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
  const makeItem = () => ({ key: `${Date.now()}-${Math.random()}`, productId: products[0]?.id ? String(products[0].id) : "__custom__", quantity: 1, size: "", color: "", customName: "", unitPrice: "" });
  const [draftItems, setDraftItems] = useState(() => [makeItem()]);
  const [postexCities, setPostexCities] = useState([]);
  const [citiesLoading, setCitiesLoading] = useState(false);
  const [citiesError, setCitiesError] = useState("");
  const preparedItems = draftItems.map((entry, index) => {
    const product = products.find((candidate) => String(candidate.id) === entry.productId);
    return {
      id: product?.id || `custom-${index + 1}`,
      productId: product?.id || "",
      product_id: product?.id || "",
      name: product?.name || entry.customName || "Custom item",
      sku: product?.articleNumber || product?.article_number || product?.sku || "CUSTOM-ORDER",
      articleNumber: product?.articleNumber || product?.article_number || "",
      quantity: Math.max(1, Number(entry.quantity) || 1),
      price: Number(product?.price ?? entry.unitPrice ?? 0),
      size: entry.size || "",
      color: entry.color || "",
    };
  });
  const productSubtotal = preparedItems.reduce((sum, item) => sum + item.quantity * item.price, 0);
  const deliveryFee = 200;
  const orderTotal = productSubtotal + deliveryFee;
  const updateItem = (key, changes) => setDraftItems((items) => items.map((item) => item.key === key ? { ...item, ...changes } : item));

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
    <div className="formRow"><label>PostEx city<input name="city" required list="postex-city-options" placeholder={citiesLoading ? "Loading PostEx cities..." : "Start typing city name"} autoComplete="off" />{postexCities.length > 0 && <><datalist id="postex-city-options">{postexCities.map((city) => <option key={city} value={city} />)}</datalist><small className="trackingNumber">Type to search and select a PostEx city.</small></>}{citiesError && <small className="trackingNumber">{citiesError}</small>}</label><label>Source<select name="source"><option>Manual</option><option>Instagram DM</option><option>WhatsApp</option><option>Phone call</option><option>Walk-in</option></select></label></div>
    <div className="formRow"><label>Payment<select name="paymentStatus"><option>COD pending</option><option>Advance pending</option><option>Paid</option></select></label><label>Delivery method<select name="deliveryMethod"><option>Rider / same city</option><option>PostEx</option><option>Customer pickup</option><option>Staff delivery</option><option>Manual courier</option><option>PostEx later</option></select></label></div>
    <div className="formRow"><label>Order status<select name="status">{customOrderStatusOptions.map((status) => <option key={status}>{status}</option>)}</select></label><label>Fulfillment<select name="fulfillmentStatus"><option>Manual delivery</option><option>Rider assigned</option><option>Ready for pickup</option><option>Booked with PostEx</option><option>Delivered</option><option>On hold</option></select></label></div>
    <label>Shipping address<textarea name="address" rows="3" required placeholder="Full delivery address from DM" /></label>
    <div className="inventoryListHead"><div><h3>Order items</h3><span>Add as many different products as needed.</span></div><button type="button" onClick={() => setDraftItems((items) => [...items, makeItem()])}>Add another item</button></div>
    {draftItems.map((entry, index) => {
      const selectedProduct = products.find((product) => String(product.id) === entry.productId);
      const sizes = Array.isArray(selectedProduct?.sizes) && selectedProduct.sizes.length ? selectedProduct.sizes : ["S", "M", "L"];
      const colors = Array.isArray(selectedProduct?.colors) && selectedProduct.colors.length ? selectedProduct.colors : ["Default"];
      return <div className="adminCard" key={entry.key} style={{ padding: "16px", marginBottom: "12px" }}>
        <div className="inventoryListHead"><b>Item {index + 1}</b>{draftItems.length > 1 && <button type="button" onClick={() => setDraftItems((items) => items.filter((item) => item.key !== entry.key))}>Remove</button>}</div>
        <label>Product<select value={entry.productId} onChange={(event) => updateItem(entry.key, { productId: event.target.value, size: "", color: "" })}>{products.map((product) => <option key={product.id} value={product.id}>{product.name} - Rs. {Number(product.price || 0).toLocaleString()}</option>)}<option value="__custom__">Custom item</option></select></label>
        {selectedProduct ? <div className="formRow"><label>Size<select value={entry.size} onChange={(event) => updateItem(entry.key, { size: event.target.value })}>{sizes.map((size) => <option key={size}>{size}</option>)}</select></label><label>Color<select value={entry.color} onChange={(event) => updateItem(entry.key, { color: event.target.value })}>{colors.map((color) => <option key={color}>{color}</option>)}</select></label></div> : <label>Custom item<input required value={entry.customName} onChange={(event) => updateItem(entry.key, { customName: event.target.value })} placeholder="Product, size, color" /></label>}
        <div className="formRow"><label>Quantity<input type="number" min="1" value={entry.quantity} onChange={(event) => updateItem(entry.key, { quantity: event.target.value })} /></label><label>Unit price<input type="number" min="0" value={selectedProduct ? Number(selectedProduct.price || 0) : entry.unitPrice} onChange={(event) => updateItem(entry.key, { unitPrice: event.target.value })} readOnly={!!selectedProduct} /></label></div>
      </div>;
    })}
    <input type="hidden" name="itemsJson" value={JSON.stringify(preparedItems)} />
    <div className="adminCard" style={{ padding: "16px", marginBottom: "12px" }}><div className="formRow"><span>Products subtotal: <b>Rs. {productSubtotal.toLocaleString()}</b></span><span>Delivery (once per order): <b>Rs. {deliveryFee.toLocaleString()}</b></span></div><b>Order total: Rs. {orderTotal.toLocaleString()}</b></div>
    <label>Internal note<textarea name="notes" rows="3" placeholder="Rider name, pickup timing, DM link, customer request" /></label>
    <button className="dialogSave">Create custom order</button>
  </form></>;
}

function OrderDetailDrawer({ order, onClose, onUpdate }) {
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
    try {
      const response = await fetch("/api/admin/postex-custom", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
        <p className="shippingRuleHint">When PostEx marks this order as Returned, Finance records Rs. 200 as courier loss. Product cost stays out of the loss; add stock back only after the parcel is physically received and checked.</p>
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
    {rows.map((order) => <tr key={order.id}><td><b>{order.id}</b>{order.tracking&&<small className="trackingNumber">{order.tracking}</small>}{order.deliveryMethod&&<small className="trackingNumber">{order.deliveryMethod}</small>}</td><td>{order.customer}<small className="trackingNumber">{order.city}</small></td><td><b>Rs. {Number(order.total || 0).toLocaleString()}</b></td><td><span className={`statusBadge ${orderStatus(order).replaceAll(" ","")}`}>{order.postexStatus || order.status}</span></td><td>{order.date}</td><td>{order.risk || "Standard COD"}</td><td>{onSelect && <button className="editProductButton" onClick={() => onSelect(order)} aria-label={`Open order ${order.id}`}>Open</button>}</td></tr>)}
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

function DashboardAnalytics({ orders, products, connected, period, setPeriod }) {
  const days = Number(period);
  const end = new Date();
  const start = new Date(end); start.setDate(start.getDate() - days);
  const previousStart = new Date(start); previousStart.setDate(previousStart.getDate() - days);
  const orderDate = (order) => new Date(order.createdAt || order.raw?.created_at || 0);
  const scoped = (orders || []).filter((order) => { const date = orderDate(order); return !Number.isNaN(date.getTime()) && date >= start; });
  const previousScoped = (orders || []).filter((order) => { const date = orderDate(order); return !Number.isNaN(date.getTime()) && date >= previousStart && date < start; });
  const delivered = scoped.filter(isDeliveredOrder);
  const returned = scoped.filter(isReturnedOrder);
  const sales = delivered.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const previousSales = previousScoped.filter(isDeliveredOrder).reduce((sum, order) => sum + Number(order.total || 0), 0);
  const salesChange = previousSales > 0 ? Math.round(((sales - previousSales) / previousSales) * 100) : null;
  const customerKeys = delivered.map(orderCustomerIdentity).filter(Boolean);
  const customerOrderCounts = customerKeys.reduce((map, key) => map.set(key, (map.get(key) || 0) + 1), new Map());
  const repeatCustomers = [...customerOrderCounts.values()].filter((count) => count > 1).length;
  const items = delivered.flatMap((order) => normalizeOrderItems(order.raw || order));
  const productsById = new Map((products || []).map((product) => [String(product.id), product]));
  const productsBySku = new Map((products || []).map((product) => [String(product.sku || product.articleNumber || "").trim().toLowerCase(), product]).filter(([key]) => key));
  const productsByName = new Map((products || []).map((product) => [String(product.name || "").trim().toLowerCase(), product]));
  const productSales = items.reduce((map, item) => {
    const product = productsById.get(String(item.productId)) || productsBySku.get(String(item.sku || "").trim().toLowerCase()) || productsByName.get(String(item.name || "").trim().toLowerCase());
    const key = product ? `id:${product.id}` : `item:${String(item.sku || item.name || "unknown").trim().toLowerCase()}`;
    const current = map.get(key) || { key, product, name: product?.name || item.name || "Unknown product", sku: product?.sku || product?.articleNumber || item.sku || "—", quantity: 0 };
    current.quantity += Number(item.quantity || 0);
    map.set(key, current);
    return map;
  }, new Map());
  const topProducts = [...productSales.values()].sort((a,b) => b.quantity - a.quantity).slice(0, 5);
  const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;
  return <section className="analyticsSystem" aria-labelledby="dashboard-analytics-heading"><div className="adminTitle dashboardAnalyticsTitle"><div><p>BUSINESS INTELLIGENCE</p><h2 id="dashboard-analytics-heading">Performance analytics</h2><span>{connected ? "Live delivered-order performance, matched by customer identity and product ID / SKU." : "Connect live orders to view performance."}</span></div><div className="orderTabs" aria-label="Analytics period">{[["7","7 days"],["30","30 days"],["90","90 days"]].map(([value,label]) => <button type="button" className={period === value ? "active" : ""} aria-pressed={period === value} onClick={() => setPeriod(value)} key={value}>{label}</button>)}</div></div><div className="miniMetricGrid financeMetrics"><article><CircleDollarSign /><span><b>{money(sales)}</b>Delivered sales <small className={salesChange !== null && salesChange < 0 ? "metricTrendDown" : "metricTrendUp"}>{salesChange === null ? "No prior-period baseline" : `${salesChange >= 0 ? "+" : ""}${salesChange}% vs previous ${days} days`}</small></span></article><article><ShoppingBag /><span><b>{delivered.length}</b>Fulfilled orders</span></article><article><TrendingUp /><span><b>{money(delivered.length ? sales / delivered.length : 0)}</b>Average order value</span></article><article><Users /><span><b>{customerOrderCounts.size ? Math.round(repeatCustomers / customerOrderCounts.size * 100) : 0}%</b>Repeat customer rate</span></article><article className={returned.length ? "alertMetric" : ""}><Package /><span><b>{returned.length}</b>Returned orders</span></article></div><div className="financeGrid financeGridWide"><div className="adminCard managementCard"><div className="inventoryListHead"><div><h2>Top products sold</h2><span>Delivered units matched by product ID, then SKU, then exact product name.</span></div></div><div className="adminTableWrap"><table className="adminTable"><thead><tr><th>Product / SKU</th><th>Units sold</th><th>Current stock</th></tr></thead><tbody>{topProducts.map((row) => <tr key={row.key}><td><b>{row.name}</b><small className="trackingNumber">{row.sku}</small></td><td>{row.quantity}</td><td>{row.product?.stock ?? "—"}</td></tr>)}{!topProducts.length && <tr><td colSpan="3" className="emptyFinanceCell">No delivered product sales in this period.</td></tr>}</tbody></table></div></div><div className="adminCard financeSummaryCard"><div className="cardHeading"><div><h2>Operations health</h2><p>Actionable indicators for the selected period.</p></div></div><div className="financeStatement"><div><span>Return rate</span><b>{delivered.length + returned.length ? Math.round(returned.length / (delivered.length + returned.length) * 100) : 0}%</b></div><div><span>Low-stock products</span><b>{products.filter((product) => Number(product.stock || 0) <= Number(product.lowStockThreshold || 5)).length}</b></div><div><span>Products with missing cost</span><b>{products.filter((product) => !Number(product.costTotalPkr || 0)).length}</b></div><div className="statementTotal"><span>Next action</span><b>{products.some((product) => !Number(product.costTotalPkr || 0)) ? "Add missing product costs" : "Review low stock"}</b></div></div></div></div></section>;
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
  const [heroUrlInputs, setHeroUrlInputs] = useState({});
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

  async function addHeroImageUrl(field) {
    const url = String(heroUrlInputs[field] || "").trim();
    if (!/^https:\/\//i.test(url)) {
      setStoreSettingsError("Paste a secure https:// image URL from Cloudinary.");
      return;
    }
    if (!/^https:\/\/res\.cloudinary\.com\//i.test(url)) {
      setStoreSettingsError("Paste a Cloudinary delivery URL beginning with https://res.cloudinary.com/.");
      return;
    }
    try {
      await new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("This Cloudinary URL does not load an image."));
        image.src = url;
      });
      setStoreSettingsError("");
      setStoreSettings((current) => ({ ...current, [field]: [...(current[field] || []), url] }));
      setHeroUrlInputs((current) => ({ ...current, [field]: "" }));
    } catch (error) {
      setStoreSettingsError(error.message || "This Cloudinary URL does not load an image.");
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

  return <><div className="adminTitle"><div><p>CONFIGURATION</p><h1>Settings</h1><span>Manage storefront and workspace configuration. Store Details changes save live; use the relevant section to save its settings.</span></div></div>
    {savedAt && <div className="adminErrorBanner settingsSaved">Store settings saved at {savedAt}.</div>}
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
              {[{ field: "heroDesktopImages", legacyField: "heroDesktopImage", label: "Desktop Hero Slides", hint: "Select multiple wide campaign images · recommended 16:8" }, { field: "heroMobileImages", legacyField: "heroMobileImage", label: "Mobile Hero Slides", hint: "Select multiple portrait campaign images · recommended 4:5" }].map((item) => {
                const images = storeSettings[item.field]?.length ? storeSettings[item.field] : [storeSettings[item.legacyField]].filter(Boolean);
                return <div className="heroImageSetting" key={item.field}>
                  <span><b>{item.label}</b><small>{item.hint}</small></span>
                  <div className="heroSlidesEditor">{images.map((image, index) => <div className="heroSlideEditor" key={`${image}-${index}`}><div className="heroAdminImagePreview"><img src={image} alt="" /></div><input value={image} onChange={(event) => setStoreSettings((current) => ({ ...current, [item.field]: images.map((value, imageIndex) => imageIndex === index ? event.target.value : value) }))} placeholder="/hero-image.jpg or https://..." /><button type="button" disabled={images.length === 1} onClick={() => setStoreSettings((current) => ({ ...current, [item.field]: images.filter((_, imageIndex) => imageIndex !== index) }))}>Remove</button></div>)}</div>
                  <p className="heroUrlHelp">Upload images to your Cloudinary account first, then paste each secure Cloudinary URL below.</p>
                  <div className="heroUrlAdder"><input value={heroUrlInputs[item.field] || ""} onChange={(event) => setHeroUrlInputs((current) => ({ ...current, [item.field]: event.target.value }))} placeholder="Paste Cloudinary image URL (https://...)" /><button type="button" onClick={() => addHeroImageUrl(item.field)}>Add URL</button></div>
                </div>;
              })}
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
