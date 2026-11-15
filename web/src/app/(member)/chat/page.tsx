import { ChatWindow } from "@/components/chat/ChatWindow";
import { CitationViewer } from "@/components/chat/CitationViewer";

// Member area. The layout of this route group will check the role on the server (PBI-042.2).
export default function ChatPage() {
  return (
    <main className="mx-auto grid max-w-4xl gap-4 p-8">
      <ChatWindow />
      <CitationViewer />
    </main>
  );
}
