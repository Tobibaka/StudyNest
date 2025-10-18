import { createBrowserRouter, createHashRouter } from "react-router-dom";
import App from "./App";
import AuthPage from "@pages/AuthPage";
import DashboardPage from "@pages/DashboardPage";

const baseRouter = [
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <AuthPage />
      },
      {
        path: "dashboard",
        element: <DashboardPage />
      }
    ]
  }
];

// Electron works better with hash routing to avoid deep-link issues on reload
export const router = createHashRouter(baseRouter);

export const browserRouter = createBrowserRouter(baseRouter);
