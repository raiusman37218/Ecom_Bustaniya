import { NextResponse } from "next/server";
import { getStoreSettings } from "../../../lib/storeSettings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const settings = await getStoreSettings();
    const safeDomainSettings = settings.domainSettings
      ? {
          primaryDomain: settings.domainSettings.primaryDomain || "",
          seoTitle: settings.domainSettings.seoTitle || "",
          metaPixelId: settings.domainSettings.metaPixelId || "",
          analyticsMeasurementId: settings.domainSettings.analyticsMeasurementId || "",
        }
      : null;

    return NextResponse.json(
      {
        ...settings,
        domainSettings: safeDomainSettings,
        paymentSettings: settings.paymentSettings,
        deliverySettings: settings.deliverySettings,
        checkoutSettings: settings.checkoutSettings,
        shippingZones: settings.shippingZones,
        sizeChartSettings: settings.sizeChartSettings,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch {
    return NextResponse.json({ paymentSettings: null }, { status: 200 });
  }
}
