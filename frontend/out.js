import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  ShoppingCart,
  Search,
  Menu,
  X,
  Heart,
  Bell,
  Tag,
  Globe,
  MapPin,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Twitter,
  Truck,
  ShieldCheck,
  RotateCcw,
  Home,
  Grid,
  Package,
  FileText,
  User
} from "lucide-react";
import { api } from "../store";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { storefrontPath } from "../utils/storefrontHost";
import { useCommerceStore } from "../store/commerceStore";
import { usePortalStore } from "../store/portalStore";
import PortalCartDrawer from "../portal/components/layout/PortalCartDrawer";
export default function StorefrontLayout({ children }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { cart, isCartOpen, toggleCart, unreadCount, fetchUnreadCount } = useCommerceStore((state) => ({
    cart: state.cart,
    isCartOpen: state.isCartOpen,
    toggleCart: state.toggleCart,
    unreadCount: state.unreadCount,
    fetchUnreadCount: state.fetchUnreadCount
  }));
  const { isAuthenticated, customer, fetchNotifications, fetchOrders } = usePortalStore();
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  useEffect(() => {
    loadSettings();
  }, []);
  useEffect(() => {
    let active = true;
    if (!isAuthenticated) return void 0;
    const loadRecent = async () => {
      const notifs = await fetchNotifications?.(1);
      const orders = await fetchOrders?.(1, "all");
      if (!active) return;
      setRecentNotifications(notifs?.notifications?.slice(0, 3) || []);
      setRecentOrders(orders?.orders?.slice(0, 3) || []);
    };
    loadRecent();
    return () => {
      active = false;
    };
  }, [isAuthenticated, fetchNotifications, fetchOrders]);
  const loadSettings = async () => {
    try {
      const res = await api.get("/storefront/settings");
      setSettings(res.data.data);
    } catch (err) {
    }
  };
  useEffect(() => {
    if (fetchUnreadCount) {
      fetchUnreadCount();
      const interval = setInterval(() => fetchUnreadCount(), 6e4);
      return () => clearInterval(interval);
    }
    return void 0;
  }, [fetchUnreadCount]);
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    navigate(storefrontPath(`/products?search=${encodeURIComponent(searchQuery)}`));
  };
  return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col font-sans", dir: "rtl" }, /* @__PURE__ */ React.createElement("div", { className: "bg-indigo-600 text-white text-[10px] md:text-xs py-2 text-center font-bold tracking-widest uppercase bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" }, "\u2728 \u0634\u062D\u0646 \u0645\u062C\u0627\u0646\u064A \u0644\u0644\u0637\u0644\u0628\u0627\u062A \u0623\u0643\u062B\u0631 \u0645\u0646 500 \u062C.\u0645 | \u062F\u0641\u0639 \u0639\u0646\u062F \u0627\u0644\u0627\u0633\u062A\u0644\u0627\u0645 \u0645\u062A\u0627\u062D \u2728"), /* @__PURE__ */ React.createElement("header", { className: "bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800 sticky top-0 z-50" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center h-20 gap-4" }, /* @__PURE__ */ React.createElement(Link, { to: storefrontPath("/"), className: "flex items-center gap-3 flex-shrink-0" }, settings?.branding?.logo ? /* @__PURE__ */ React.createElement(
    "img",
    {
      src: settings.branding.logo,
      alt: settings?.store?.name || settings?.name || "Store Logo",
      className: "w-10 h-10 md:w-12 md:h-12 object-contain"
    }
  ) : /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg ring-4 ring-indigo-50 dark:ring-indigo-900/20" }, settings?.store?.name?.[0] || settings?.name?.[0] || "P"), /* @__PURE__ */ React.createElement("div", { className: "hidden sm:block" }, /* @__PURE__ */ React.createElement("span", { className: "text-xl md:text-2xl font-black text-gray-900 dark:text-white leading-none block" }, settings?.store?.name || settings?.name || "PayQusta Store"), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-gray-400 font-bold uppercase tracking-tighter" }, "\u062A\u062C\u0631\u0628\u0629 \u0634\u0631\u0627\u0621 \u0641\u0627\u062E\u0631\u0629"))), /* @__PURE__ */ React.createElement("form", { onSubmit: handleSearch, className: "flex-1 max-w-xl hidden md:block relative group" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: "\u0627\u0628\u062D\u062B \u0639\u0646 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A\u060C \u0627\u0644\u0645\u0627\u0631\u0643\u0627\u062A...",
      value: searchQuery,
      onChange: (e) => setSearchQuery(e.target.value),
      className: "w-full h-12 pr-12 pl-4 rounded-2xl bg-gray-100 dark:bg-gray-800 border-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder-gray-400 font-medium"
    }
  ), /* @__PURE__ */ React.createElement("button", { type: "submit", className: "absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-indigo-500 transition-colors" }, /* @__PURE__ */ React.createElement(Search, { className: "w-5 h-5" }))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 md:gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "hidden lg:block" }, /* @__PURE__ */ React.createElement(LanguageSwitcher, null)), /* @__PURE__ */ React.createElement(
    Link,
    {
      to: "/account/wishlist",
      className: "relative p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all group",
      "aria-label": "Wishlist"
    },
    /* @__PURE__ */ React.createElement(Heart, { className: "w-6 h-6 text-gray-700 dark:text-gray-300 group-hover:text-rose-500" })
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => navigate("/account/notifications"),
      className: "relative p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all group",
      "aria-label": "Notifications"
    },
    /* @__PURE__ */ React.createElement(Bell, { className: "w-6 h-6 text-gray-700 dark:text-gray-300 group-hover:text-primary-600" }),
    unreadCount > 0 && /* @__PURE__ */ React.createElement("span", { className: "absolute top-1 right-1 bg-red-500 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center ring-2 ring-white dark:ring-gray-900 animate-pulse" }, unreadCount > 9 ? "9+" : unreadCount)
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: toggleCart,
      className: "relative p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl transition-all group",
      "aria-label": "Cart"
    },
    /* @__PURE__ */ React.createElement(ShoppingCart, { className: "w-6 h-6 text-gray-700 dark:text-gray-300 group-hover:text-indigo-600" }),
    cartCount > 0 && /* @__PURE__ */ React.createElement("span", { className: "absolute top-1 right-1 bg-indigo-600 text-white text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center ring-2 ring-white dark:ring-gray-900 shadow-lg animate-bounce" }, cartCount)
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      className: "md:hidden p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl",
      onClick: () => setMobileMenuOpen(!mobileMenuOpen)
    },
    mobileMenuOpen ? /* @__PURE__ */ React.createElement(X, { className: "w-6 h-6" }) : /* @__PURE__ */ React.createElement(Menu, { className: "w-6 h-6" })
  ))), /* @__PURE__ */ React.createElement("nav", { className: "hidden md:flex items-center gap-8 py-3 border-t border-gray-50 dark:border-gray-800/50" }, /* @__PURE__ */ React.createElement(Link, { to: storefrontPath("/"), className: `text-sm font-bold uppercase tracking-wide transition-colors ${location.pathname === storefrontPath("/") ? "text-indigo-600" : "text-gray-500 hover:text-indigo-600"}` }, "\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629"), /* @__PURE__ */ React.createElement(Link, { to: storefrontPath("/products"), className: `text-sm font-bold uppercase tracking-wide transition-colors ${location.pathname.includes("/products") ? "text-indigo-600" : "text-gray-500 hover:text-indigo-600"}` }, "\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A"), /* @__PURE__ */ React.createElement(Link, { to: storefrontPath("/categories"), className: "text-sm font-bold uppercase tracking-wide text-gray-500 hover:text-indigo-600 transition-colors" }, "\u0627\u0644\u0623\u0642\u0633\u0627\u0645"), /* @__PURE__ */ React.createElement(Link, { to: storefrontPath("/offers"), className: "text-sm font-bold uppercase tracking-wide text-rose-500 hover:text-rose-600 transition-colors flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Tag, { className: "w-3 h-3" }), "\u0627\u0644\u0639\u0631\u0648\u0636"))), mobileMenuOpen && /* @__PURE__ */ React.createElement("div", { className: "md:hidden fixed inset-0 top-20 bg-white dark:bg-gray-900 z-50 p-6 animate-fade-in" }, /* @__PURE__ */ React.createElement("form", { onSubmit: handleSearch, className: "mb-8 relative group" }, /* @__PURE__ */ React.createElement(
    "input",
    {
      type: "text",
      placeholder: "\u0627\u0628\u062D\u062B...",
      value: searchQuery,
      onChange: (e) => setSearchQuery(e.target.value),
      className: "w-full h-14 pr-12 pl-4 rounded-2xl bg-gray-100 dark:bg-gray-800 border-none focus:ring-2 focus:ring-indigo-500 text-lg"
    }
  ), /* @__PURE__ */ React.createElement("button", { type: "submit", className: "absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" }, /* @__PURE__ */ React.createElement(Search, { className: "w-6 h-6" }))), /* @__PURE__ */ React.createElement("nav", { className: "flex flex-col gap-6" }, /* @__PURE__ */ React.createElement(Link, { onClick: () => setMobileMenuOpen(false), to: storefrontPath("/"), className: "text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter border-b border-gray-100 dark:border-gray-800 pb-4" }, "\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629"), /* @__PURE__ */ React.createElement(Link, { onClick: () => setMobileMenuOpen(false), to: storefrontPath("/products"), className: "text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter border-b border-gray-100 dark:border-gray-800 pb-4" }, "\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A"), /* @__PURE__ */ React.createElement(Link, { onClick: () => setMobileMenuOpen(false), to: storefrontPath("/cart"), className: "text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter border-b border-gray-100 dark:border-gray-800 pb-4" }, "\u0633\u0644\u0629 \u0627\u0644\u062A\u0633\u0648\u0642"), /* @__PURE__ */ React.createElement(Link, { onClick: () => setMobileMenuOpen(false), to: "/store/about", className: "text-2xl font-black text-gray-500 dark:text-gray-400 uppercase tracking-tighter" }, "\u0645\u0646 \u0646\u062D\u0646")), /* @__PURE__ */ React.createElement("div", { className: "mt-12" }, /* @__PURE__ */ React.createElement(LanguageSwitcher, null)))), isAuthenticated && customer && /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 shadow-sm" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex gap-4 flex-wrap" }, [
    { label: "\u0637\u0644\u0628\u0627\u062A\u064A", path: "/account/orders", icon: Package },
    { label: "\u0641\u0648\u0627\u062A\u064A\u0631\u064A", path: "/account/invoices", icon: FileText },
    { label: "\u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A", path: "/account/notifications", icon: Bell },
    { label: "\u0627\u0644\u0645\u0641\u0636\u0644\u0629", path: "/account/wishlist", icon: Heart },
    { label: "\u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0634\u062E\u0635\u064A", path: "/account/profile", icon: User }
  ].map((item) => /* @__PURE__ */ React.createElement(
    Link,
    {
      key: item.path,
      to: item.path,
      className: "flex items-center gap-2 rounded-full border border-gray-200 dark:border-gray-800 px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-200 hover:border-primary-300 hover:text-primary-500 transition"
    },
    /* @__PURE__ */ React.createElement(item.icon, { className: "w-4 h-4" }),
    item.label
  )))), isAuthenticated && customer && /* @__PURE__ */ React.createElement("section", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 grid gap-4 lg:grid-cols-2" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-4 space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-black text-gray-900 dark:text-white" }, "\u0622\u062E\u0631 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400" }, "\u0623\u062D\u062F\u062B \u0663 \u0625\u0634\u0639\u0627\u0631\u0627\u062A \u0645\u0646 \u062D\u0633\u0627\u0628\u0643")), /* @__PURE__ */ React.createElement(Link, { to: "/account/notifications", className: "text-xs font-bold text-primary-600 hover:underline" }, "\u0639\u0631\u0636 \u0643\u0644 \u0627\u0644\u0625\u0634\u0639\u0627\u0631\u0627\u062A")), recentNotifications.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400" }, "\u0644\u0627 \u062A\u0648\u062C\u062F \u0625\u0634\u0639\u0627\u0631\u0627\u062A \u062C\u062F\u064A\u062F\u0629") : recentNotifications.map((notif) => /* @__PURE__ */ React.createElement("div", { key: notif._id, className: "border border-gray-100 dark:border-gray-800 rounded-2xl p-3 hover:border-primary-300 transition" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold text-gray-900 dark:text-white" }, notif.title), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400 line-clamp-2" }, notif.message)))), /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-4 space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-black text-gray-900 dark:text-white" }, "\u0623\u062D\u062F\u062B \u0627\u0644\u0637\u0644\u0628\u0627\u062A"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400" }, "\u0627\u0637\u0651\u0644\u0639 \u0639\u0644\u0649 \u062D\u0627\u0644\u0629 \u0622\u062E\u0631 \u0663 \u0637\u0644\u0628\u0627\u062A")), /* @__PURE__ */ React.createElement(Link, { to: "/account/orders", className: "text-xs font-bold text-primary-600 hover:underline" }, "\u0639\u0631\u0636 \u0643\u0644 \u0627\u0644\u0637\u0644\u0628\u0627\u062A")), recentOrders.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400" }, "\u0644\u0645 \u064A\u062A\u0645 \u062A\u0633\u062C\u064A\u0644 \u0637\u0644\u0628\u0627\u062A \u0628\u0639\u062F") : recentOrders.map((order) => /* @__PURE__ */ React.createElement("div", { key: order._id, className: "border border-gray-100 dark:border-gray-800 rounded-2xl p-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-bold text-gray-900 dark:text-white" }, "#", order.invoiceNumber || order.orderNumber || order._id.slice(-4)), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400 capitalize" }, "\u0627\u0644\u062D\u0627\u0644\u0629: ", order.orderStatus || order.status || "\u0645\u0639\u0644\u0642\u0629"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400" }, new Date(order.createdAt).toLocaleDateString("ar-EG")))))), /* @__PURE__ */ React.createElement("main", { className: "flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full" }, children), /* @__PURE__ */ React.createElement(
    PortalCartDrawer,
    {
      cart,
      cartTotal,
      isCartOpen,
      toggleCart
    }
  ), /* @__PURE__ */ React.createElement("footer", { className: "bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 mt-20 pb-24 md:pb-12" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-b border-gray-50 dark:border-gray-800/50" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-right" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center md:items-start gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center" }, /* @__PURE__ */ React.createElement(Truck, { className: "w-6 h-6 text-indigo-600" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { className: "font-black text-lg text-gray-900 dark:text-white" }, "\u062A\u0648\u0635\u064A\u0644 \u0644\u0643\u0644 \u0627\u0644\u0645\u062D\u0627\u0641\u0638\u0627\u062A"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500" }, "\u0646\u0635\u0644\u0643 \u0623\u064A\u0646\u0645\u0627 \u0643\u0646\u062A \u0641\u064A \u0623\u0633\u0631\u0639 \u0648\u0642\u062A \u0645\u0645\u0643\u0646"))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center md:items-start gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center" }, /* @__PURE__ */ React.createElement(ShieldCheck, { className: "w-6 h-6 text-emerald-600" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { className: "font-black text-lg text-gray-900 dark:text-white" }, "\u062F\u0641\u0639 \u0622\u0645\u0646 \u0648\u0645\u0648\u062B\u0648\u0642"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500" }, "\u0637\u0631\u0642 \u062F\u0641\u0639 \u0645\u062A\u0639\u062F\u062F\u0629 \u0648\u0622\u0645\u0646\u0629 \u062A\u0645\u0627\u0645\u0627\u064B"))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center md:items-start gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center" }, /* @__PURE__ */ React.createElement(RotateCcw, { className: "w-6 h-6 text-rose-600" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { className: "font-black text-lg text-gray-900 dark:text-white" }, "\u0633\u064A\u0627\u0633\u0629 \u0625\u0631\u062C\u0627\u0639 \u0645\u0631\u0646\u0629"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500" }, "\u064A\u0645\u0643\u0646\u0643 \u0625\u0631\u062C\u0627\u0639 \u0627\u0644\u0645\u0646\u062A\u062C \u062E\u0644\u0627\u0644 14 \u064A\u0648\u0645 \u0628\u0643\u0644 \u0633\u0647\u0648\u0644\u0629"))))), /* @__PURE__ */ React.createElement("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-12" }, /* @__PURE__ */ React.createElement("div", { className: "md:col-span-1" }, /* @__PURE__ */ React.createElement(Link, { to: storefrontPath("/"), className: "flex items-center gap-3 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg" }, settings?.store?.name?.[0] || "P"), /* @__PURE__ */ React.createElement("span", { className: "text-xl font-black text-gray-900 dark:text-white uppercase tracking-tighter" }, settings?.store?.name || "PayQusta")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500 leading-relaxed mb-6" }, settings?.store?.description || "\u0646\u062D\u0646 \u0646\u0624\u0645\u0646 \u0628\u0623\u0646 \u0627\u0644\u062A\u0633\u0648\u0642 \u064A\u062C\u0628 \u0623\u0646 \u064A\u0643\u0648\u0646 \u0645\u0645\u062A\u0639\u0627\u064B \u0648\u0633\u0647\u0644\u0627\u064B. \u0645\u062A\u062C\u0631\u0646\u0627 \u064A\u0642\u062F\u0645 \u0644\u0643 \u0623\u0641\u0636\u0644 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0627\u0644\u0645\u062E\u062A\u0627\u0631\u0629 \u0628\u0639\u0646\u0627\u064A\u0629 \u0644\u062A\u0646\u0627\u0633\u0628 \u0630\u0648\u0642\u0643 \u0648\u0627\u062D\u062A\u064A\u0627\u062C\u0627\u062A\u0643."), /* @__PURE__ */ React.createElement("div", { className: "flex gap-4" }, /* @__PURE__ */ React.createElement("a", { href: "#", className: "p-2 border border-gray-100 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-400 hover:text-indigo-600 transition-all" }, /* @__PURE__ */ React.createElement(Facebook, { className: "w-5 h-5" })), /* @__PURE__ */ React.createElement("a", { href: "#", className: "p-2 border border-gray-100 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-400 hover:text-indigo-600 transition-all" }, /* @__PURE__ */ React.createElement(Instagram, { className: "w-5 h-5" })), /* @__PURE__ */ React.createElement("a", { href: "#", className: "p-2 border border-gray-100 dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-400 hover:text-indigo-600 transition-all" }, /* @__PURE__ */ React.createElement(Twitter, { className: "w-5 h-5" })))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-black text-sm uppercase tracking-widest text-gray-400 mb-8 mt-2" }, "\u0639\u0646 \u0627\u0644\u0645\u062A\u062C\u0631"), /* @__PURE__ */ React.createElement("ul", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement(Link, { to: "/store/about", className: "text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-indigo-600 hover:mr-1 transition-all" }, "\u0645\u0646 \u0646\u062D\u0646")), /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement(Link, { to: "/store/contact", className: "text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-indigo-600 hover:mr-1 transition-all" }, "\u0627\u062A\u0635\u0644 \u0628\u0646\u0627")), /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement(Link, { to: "/store/shipping", className: "text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-indigo-600 hover:mr-1 transition-all" }, "\u0633\u064A\u0627\u0633\u0629 \u0627\u0644\u0634\u062D\u0646")), /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement(Link, { to: "/store/privacy", className: "text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-indigo-600 hover:mr-1 transition-all" }, "\u0633\u064A\u0627\u0633\u0629 \u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629")))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-black text-sm uppercase tracking-widest text-gray-400 mb-8 mt-2" }, "\u062A\u0633\u0648\u0642 \u0645\u0639\u0646\u0627"), /* @__PURE__ */ React.createElement("ul", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement(Link, { to: storefrontPath("/products"), className: "text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-indigo-600 hover:mr-1 transition-all" }, "\u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A")), /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement(Link, { to: storefrontPath("/categories"), className: "text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-indigo-600 hover:mr-1 transition-all" }, "\u0627\u0644\u0623\u0642\u0633\u0627\u0645")), /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement(Link, { to: storefrontPath("/offers"), className: "text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-indigo-600 hover:mr-1 transition-all" }, "\u0627\u0644\u0639\u0631\u0648\u0636 \u0627\u0644\u062D\u0635\u0631\u064A\u0629")), /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement(Link, { to: storefrontPath("/cart"), className: "text-sm font-bold text-gray-600 dark:text-gray-400 hover:text-indigo-600 hover:mr-1 transition-all" }, "\u0633\u0644\u0629 \u0627\u0644\u0645\u0634\u062A\u0631\u064A\u0627\u062A")))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-black text-sm uppercase tracking-widest text-gray-400 mb-8 mt-2" }, "\u062A\u0648\u0627\u0635\u0644 \u0645\u0628\u0627\u0634\u0631"), /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, settings?.store?.phone && /* @__PURE__ */ React.createElement("div", { className: "flex gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400" }, /* @__PURE__ */ React.createElement(Phone, { className: "w-5 h-5" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-400 font-bold uppercase mb-0.5" }, "\u0627\u062A\u0635\u0644 \u0628\u0646\u0627"), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-black text-gray-900 dark:text-white", dir: "ltr" }, settings.store.phone))), settings?.store?.email && /* @__PURE__ */ React.createElement("div", { className: "flex gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-400" }, /* @__PURE__ */ React.createElement(Mail, { className: "w-5 h-5" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-400 font-bold uppercase mb-0.5" }, "\u0627\u0644\u0628\u0631\u064A\u062F \u0627\u0644\u0625\u0644\u0643\u062A\u0631\u0648\u0646\u064A"), /* @__PURE__ */ React.createElement("p", { className: "text-sm font-black text-gray-900 dark:text-white" }, settings.store.email)))))), /* @__PURE__ */ React.createElement("div", { className: "border-t border-gray-50 dark:border-gray-800 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-6" }, /* @__PURE__ */ React.createElement("p", { className: "text-[10px] font-bold text-gray-400 uppercase tracking-widest" }, "\xA9 ", (/* @__PURE__ */ new Date()).getFullYear(), " ", settings?.store?.name || "PayQusta", ". \u062C\u0645\u064A\u0639 \u0627\u0644\u062D\u0642\u0648\u0642 \u0645\u062D\u0641\u0648\u0638\u0629."), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 grayscale opacity-30 hover:grayscale-0 hover:opacity-100 transition-all" }, /* @__PURE__ */ React.createElement("div", { className: "h-6 w-10 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center font-black text-[8px] tracking-tighter" }, "VISA"), /* @__PURE__ */ React.createElement("div", { className: "h-6 w-10 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center font-black text-[8px] tracking-tighter" }, "MC"), /* @__PURE__ */ React.createElement("div", { className: "h-6 w-10 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center font-black text-[8px] tracking-tighter" }, "COD"))))), /* @__PURE__ */ React.createElement("div", { className: "md:hidden fixed bottom-0 inset-x-0 h-16 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-100 dark:border-gray-800 flex items-center justify-around px-4 z-[100] shadow-[0_-10px_20px_rgba(0,0,0,0.05)]" }, /* @__PURE__ */ React.createElement(Link, { to: storefrontPath("/"), className: `flex flex-col items-center gap-1 ${location.pathname === storefrontPath("/") ? "text-indigo-600" : "text-gray-400"}` }, /* @__PURE__ */ React.createElement(Home, { className: "w-6 h-6" }), /* @__PURE__ */ React.createElement("span", { className: "text-[8px] font-black uppercase tracking-tighter" }, "\u0627\u0644\u0631\u0626\u064A\u0633\u064A\u0629")), /* @__PURE__ */ React.createElement(Link, { to: storefrontPath("/products"), className: `flex flex-col items-center gap-1 ${location.pathname.includes("/products") ? "text-indigo-600" : "text-gray-400"}` }, /* @__PURE__ */ React.createElement(Grid, { className: "w-6 h-6" }), /* @__PURE__ */ React.createElement("span", { className: "text-[8px] font-black uppercase tracking-tighter" }, "\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A")), /* @__PURE__ */ React.createElement(Link, { to: storefrontPath("/cart"), className: `relative flex flex-col items-center gap-1 ${location.pathname.includes("/cart") ? "text-indigo-600" : "text-gray-400"}` }, /* @__PURE__ */ React.createElement(ShoppingCart, { className: "w-6 h-6" }), /* @__PURE__ */ React.createElement("span", { className: "text-[8px] font-black uppercase tracking-tighter" }, "\u0627\u0644\u0633\u0644\u0629"), cartCount > 0 && /* @__PURE__ */ React.createElement("span", { className: "absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] font-black rounded-full w-4 h-4 flex items-center justify-center ring-2 ring-white dark:ring-gray-900" }, cartCount)), /* @__PURE__ */ React.createElement("button", { onClick: () => setMobileMenuOpen(!mobileMenuOpen), className: `flex flex-col items-center gap-1 ${mobileMenuOpen ? "text-indigo-600" : "text-gray-400"}` }, /* @__PURE__ */ React.createElement(Menu, { className: "w-6 h-6" }), /* @__PURE__ */ React.createElement("span", { className: "text-[8px] font-black uppercase tracking-tighter" }, "\u0627\u0644\u0645\u0632\u064A\u062F"))));
}
