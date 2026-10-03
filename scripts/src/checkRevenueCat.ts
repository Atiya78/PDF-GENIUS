import {
  listApps,
  listEntitlements,
  listOfferings,
  listProducts,
  listProjects,
} from "@replit/revenuecat-sdk";
import { getUncachableRevenueCatClient } from "./revenueCatClient";

async function main() {
  const client = getUncachableRevenueCatClient();
  const projectId = process.env.REVENUECAT_PROJECT_ID;
  if (!projectId) throw new Error("REVENUECAT_PROJECT_ID is missing");
  const projects = await listProjects({ client, query: { limit: 100 } });
  if (projects.error) {
    console.log(JSON.stringify({ service: "revenuecat", httpStatus: projects.response.status }));
    process.exitCode = 1;
    return;
  }
  // Check the imported project, never substitute or create another project.
  const projectAccessible = projects.data?.items.some((project) => project.id === projectId) ?? false;
  console.log(JSON.stringify({ service: "revenuecat", connected: true, importedProjectAccessible: projectAccessible }));
  if (!projectAccessible) {
    process.exitCode = 1;
    return;
  }
  const options = { client, path: { project_id: projectId }, query: { limit: 100 } };
  const resources = await Promise.all([
    listApps(options),
    listProducts(options),
    listEntitlements(options),
    listOfferings(options),
  ]);
  const names = ["apps", "products", "entitlements", "offerings"];
  resources.forEach((resource, index) => {
    console.log(JSON.stringify({
      resource: names[index],
      httpStatus: resource.response.status,
      count: resource.data?.items.length ?? 0,
    }));
    if (resource.error) process.exitCode = 1;
  });
}

main().catch((error) => {
  // Never print provider settings, credentials, or raw error responses.
  console.log(JSON.stringify({ checkFailed: true, errorType: error?.name ?? "Error" }));
  process.exitCode = 1;
});