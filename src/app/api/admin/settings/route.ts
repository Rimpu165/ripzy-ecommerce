import { handler, parseJson, ok } from "@/lib/api";
import { audit } from "@/lib/audit";
import { SETTING_DEFAULTS, getSettings, saveSettings, type SettingKey } from "@/lib/settings";
import { settingsSchema } from "@/lib/marketing-schemas";

export const GET = handler({ permission: "settings.manage" }, async () => {
  return ok({ settings: await getSettings() });
});

export const PUT = handler({ permission: "settings.manage", limit: { max: 30, windowMs: 60_000 } }, async ({ user, req }) => {
  const input = await parseJson(req, settingsSchema);
  const before = await getSettings();

  const next: Partial<Record<SettingKey, string>> = {};
  const oldValues: Record<string, string> = {};
  const newValues: Record<string, string> = {};
  for (const key of Object.keys(SETTING_DEFAULTS) as SettingKey[]) {
    const value = String(input[key]);
    if (value !== before[key]) {
      next[key] = value;
      oldValues[key] = before[key];
      newValues[key] = value;
    }
  }

  if (Object.keys(next).length > 0) {
    await saveSettings(next);
    await audit({ userId: user!.id, action: "UPDATE", entityType: "Setting", entityId: "settings", oldValues, newValues, req });
  }
  return ok({ success: true, changed: Object.keys(next), settings: { ...before, ...next } });
});
