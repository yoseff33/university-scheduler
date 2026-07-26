"use client";

import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Providers } from "./Providers";
import { AppShell } from "@/components/AppShell";
import { LoadingPage } from "@/components/ui";
import { ConnectionPage } from "@/features/ConnectionPage";
import { AuthPage } from "@/features/AuthPage";
import { SetupPage } from "@/features/SetupPage";
import {
  BranchesPage,
  CartPage,
  HomePage,
  MenuPage,
  OrdersPage,
  PaymentPage,
  PaymentResultPage,
  ProductPage,
  TrackOrderPage,
} from "@/features/CustomerPages";
import { getSupabase, hasSupabaseConfig } from "@/lib/supabase";

const accountPage = <K extends keyof typeof import("@/features/AccountPages")>(name: K) =>
  lazy(() => import("@/features/AccountPages").then((module) => ({ default: module[name] })));
const adminPage = <K extends keyof typeof import("@/features/AdminPages")>(name: K) =>
  lazy(() => import("@/features/AdminPages").then((module) => ({ default: module[name] })));

const AssetsPage = accountPage("AssetsPage");
const CouponsPage = accountPage("CouponsPage");
const LegalPage = accountPage("LegalPage");
const LoyaltyPage = accountPage("LoyaltyPage");
const MarketingConsentPage = accountPage("MarketingConsentPage");
const NotificationsPage = accountPage("NotificationsPage");
const ProfilePage = accountPage("ProfilePage");
const RewardsPage = accountPage("RewardsPage");
const VehiclesPage = accountPage("VehiclesPage");
const CardEditorPage = lazy(() =>
  import("@/features/CardEditor").then((module) => ({ default: module.CardEditorPage })),
);
const AdminDashboardPage = adminPage("AdminDashboardPage");
const AdminLayout = adminPage("AdminLayout");
const DataManagementPage = adminPage("DataManagementPage");
const OperationsBoardPage = adminPage("OperationsBoardPage");
const PlaceholderProtectedPage = adminPage("PlaceholderProtectedPage");
const ProductManagementPage = adminPage("ProductManagementPage");
const ReportsPage = adminPage("ReportsPage");
const SettingsPage = adminPage("SettingsPage");
const StickerCreatePage = adminPage("StickerCreatePage");

function ServiceWorkerRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker.register("/sw.js");
    }
  }, []);
  return null;
}

function ConfiguredApp() {
  const setup = useQuery({
    queryKey: ["setup-completed"],
    queryFn: async () => {
      const { data, error } = await getSupabase()
        .from("system_settings")
        .select("value")
        .eq("key", "setup_completed")
        .maybeSingle();
      if (error) throw error;
      return data?.value === true;
    },
  });
  if (setup.isLoading) return <LoadingPage label="نتحقق من جاهزية النظام…" />;
  if (!setup.data) {
    return <SetupPage onComplete={() => void setup.refetch()} />;
  }
  return (
    <BrowserRouter>
      <ServiceWorkerRegister />
      <Suspense fallback={<LoadingPage label="نجهّز الصفحة…" />}>
        <Routes>
          <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="branches" element={<BranchesPage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="product/:productId" element={<ProductPage />} />
          <Route path="cart" element={<CartPage />} />
          <Route path="checkout" element={<Navigate to="/cart" replace />} />
          <Route path="payment/:orderId" element={<PaymentPage />} />
          <Route path="payment-result" element={<PaymentResultPage />} />
          <Route path="track/:orderId" element={<TrackOrderPage />} />
          <Route path="login" element={<AuthPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="loyalty" element={<LoyaltyPage />} />
          <Route path="card-editor" element={<CardEditorPage />} />
          <Route path="stickers" element={<CardEditorPage />} />
          <Route path="assets" element={<AssetsPage />} />
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="rewards" element={<RewardsPage />} />
          <Route path="coupons" element={<CouponsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="privacy-settings" element={<MarketingConsentPage />} />
          <Route path="marketing-consent" element={<MarketingConsentPage />} />
          <Route path="terms" element={<LegalPage type="terms" />} />
          <Route path="privacy" element={<LegalPage type="privacy" />} />

          <Route path="cashier" element={<OperationsBoardPage mode="cashier" />} />
          <Route path="barista" element={<OperationsBoardPage mode="barista" />} />
          <Route path="delivery" element={<OperationsBoardPage mode="delivery" />} />

          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="orders" element={<OperationsBoardPage mode="cashier" />} />
            <Route path="customers" element={<DataManagementPage kind="customers" />} />
            <Route path="customer/:customerId" element={<PlaceholderProtectedPage title="ملف العميل" table="profiles" />} />
            <Route path="products" element={<ProductManagementPage />} />
            <Route path="categories" element={<DataManagementPage kind="categories" />} />
            <Route path="options" element={<PlaceholderProtectedPage title="الخيارات والإضافات" table="product_option_groups" />} />
            <Route path="branches" element={<DataManagementPage kind="branches" />} />
            <Route path="parking" element={<DataManagementPage kind="parking" />} />
            <Route path="staff" element={<DataManagementPage kind="staff" />} />
            <Route path="roles" element={<PlaceholderProtectedPage title="الأدوار والصلاحيات" table="roles" />} />
            <Route path="loyalty" element={<DataManagementPage kind="loyalty" />} />
            <Route path="loyalty-log" element={<PlaceholderProtectedPage title="سجل الولاء" table="loyalty_transactions" />} />
            <Route path="rewards" element={<PlaceholderProtectedPage title="إدارة المكافآت" table="loyalty_rewards" />} />
            <Route path="stickers" element={<DataManagementPage kind="stickers" />} />
            <Route path="stickers/new" element={<StickerCreatePage />} />
            <Route path="sticker-categories" element={<PlaceholderProtectedPage title="تصنيفات الملصقات" table="sticker_categories" />} />
            <Route path="asset-review" element={<PlaceholderProtectedPage title="مراجعة صور العملاء" table="customer_assets" />} />
            <Route path="campaigns" element={<DataManagementPage kind="campaigns" />} />
            <Route path="whatsapp-templates" element={<PlaceholderProtectedPage title="قوالب واتساب" table="whatsapp_templates" />} />
            <Route path="coupons" element={<DataManagementPage kind="coupons" />} />
            <Route path="payments" element={<DataManagementPage kind="payments" />} />
            <Route path="refunds" element={<PlaceholderProtectedPage title="الاسترجاعات" table="refunds" />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="audit" element={<DataManagementPage kind="audit" />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

            <Route path="*" element={<ConnectionPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export function CoffeeApp() {
  if (!hasSupabaseConfig) return <ConnectionPage />;
  return <Providers><ConfiguredApp /></Providers>;
}
