
  import { createRoot } from "react-dom/client";
  import { BrowserRouter } from "react-router";
  import { QueryClientProvider } from "@tanstack/react-query";
  import App from "./app/App.tsx";
  import { restaurantQueryClient } from "./modules/lib/restaurantData";
  import "./styles/index.css";

  createRoot(document.getElementById("root")!).render(
    <BrowserRouter>
      <QueryClientProvider client={restaurantQueryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  );
