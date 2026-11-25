import React from "react";
import { statusCls, statusLabel } from "./styles";

export default function StatusChip({ status, className = "" }: { status: string; className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${statusCls(status)} ${className}`}>
      {statusLabel(status)}
    </span>
  );
}
