
  import { createRoot } from "react-dom/client";
  import { QueryClientProvider } from "@tanstack/react-query";
  import { Toaster } from "sonner";
  import App from "./app/App.tsx";
  import { appQueryClient } from "./modules/lib/restaurantData";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <QueryClientProvider client={appQueryClient}>
      <App />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
