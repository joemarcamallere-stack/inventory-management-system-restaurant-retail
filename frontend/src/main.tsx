
  import { Suspense } from "react";
  import { createRoot } from "react-dom/client";
  import { QueryClientProvider } from "@tanstack/react-query";
  import { BrowserRouter } from "react-router";
  import { Toaster } from "sonner";
  import App from "./app/App.tsx";
  import { SessionProvider } from "./app/hooks/useSession";
  import { appQueryClient } from "./app/queryClient";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <QueryClientProvider client={appQueryClient}>
      <SessionProvider>
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen grid place-items-center">Loading...</div>}>
            <App />
          </Suspense>
        </BrowserRouter>
      </SessionProvider>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
