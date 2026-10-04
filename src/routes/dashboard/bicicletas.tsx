import { createFileRoute } from "@tanstack/react-router";
import { VehicleTypeDashboard } from "../../components/VehicleTypeDashboard";

export const Route = createFileRoute("/dashboard/bicicletas")({
  component: DashboardByType,
});

function DashboardByType() {
  return <VehicleTypeDashboard type="bicicleta" />;
}
