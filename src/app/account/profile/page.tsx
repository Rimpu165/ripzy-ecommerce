import React from "react";
import { getCurrentUser } from "@/lib/auth";
import ProfileForm from "@/components/account/ProfileForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profile | Ripzy" };

export default async function ProfilePage() {
  const user = (await getCurrentUser())!;
  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">Profile</h1>
        <p className="mt-1 text-sm text-slate-500">Your personal details.</p>
      </div>
      <ProfileForm name={user.name} email={user.email} phone={user.phone ?? ""} />
    </div>
  );
}
