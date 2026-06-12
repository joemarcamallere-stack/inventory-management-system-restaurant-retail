
  import { createRoot } from "react-dom/client";
  import { QueryClientProvider } from "@tanstack/react-query";
  import App from "./app/App.tsx";
  import { restaurantQueryClient } from "./modules/lib/restaurantData";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <QueryClientProvider client={restaurantQueryClient}>
      <App />
    </QueryClientProvider>
  );
