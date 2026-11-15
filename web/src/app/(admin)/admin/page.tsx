import { AccountManager } from "@/components/accounts/AccountManager";
import { AuditLog } from "@/components/audit/AuditLog";
import { DocumentManager } from "@/components/documents/DocumentManager";
import { UploadBatch } from "@/components/documents/UploadBatch";

// Admin area. The layout of this route group will check the Admin role on the server (PBI-042.2).
export default function AdminPage() {
  return (
    <main className="mx-auto grid max-w-4xl gap-4 p-8">
      <UploadBatch />
      <DocumentManager />
      <AccountManager />
      <AuditLog />
    </main>
  );
}
