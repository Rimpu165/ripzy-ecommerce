import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "./prisma";

/** Defaults used until an admin saves a value in /admin/settings. */
export const SETTING_DEFAULTS = {
  "store.name": "Ripzy",
  "store.supportEmail": "support@ripzy.com",
  "store.supportPhone": "+91 98765 43210",
  "store.gstin": "29ABCDE1234F1Z5",
  "store.address": "Ripzy Technologies Pvt. Ltd., Bengaluru, Karnataka 560001",
  "shipping.freeThreshold": "999",
  "shipping.flatFee": "79",
  "order.returnWindowDays": "7",
  "order.stockReservationMinutes": "15",
  "order.codEnabled": "true",
  "order.codMaxAmount": "50000",
  "catalog.lowStockThreshold": "5",
  "maintenance.enabled": "false",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

const loadAll = unstable_cache(
  async () => {
    const rows = await prisma.setting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string>;
  },
  ["settings-all"],
  { tags: ["settings"], revalidate: 300 }
);

export async function getSettings(): Promise<Record<SettingKey, string>> {
  const stored = await loadAll();
  return { ...SETTING_DEFAULTS, ...stored } as Record<SettingKey, string>;
}

export async function getSetting(key: SettingKey): Promise<string> {
  return (await getSettings())[key];
}

export async function getNumberSetting(key: SettingKey): Promise<number> {
  const n = Number(await getSetting(key));
  return Number.isFinite(n) ? n : Number(SETTING_DEFAULTS[key]);
}

export async function saveSettings(values: Partial<Record<SettingKey, string>>) {
  const entries = Object.entries(values).filter(([k]) => k in SETTING_DEFAULTS);
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    )
  );
  revalidateTag("settings", "max");
}
