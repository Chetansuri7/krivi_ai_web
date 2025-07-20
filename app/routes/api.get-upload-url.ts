import { json } from "@remix-run/node";
import type { ActionFunctionArgs } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  const { fileName, contentType } = await request.json();
  const token = process.env.DO_FUNC_TOKEN;

  if (!token) {
    return json({ error: "Missing DigitalOcean API token." }, { status: 500 });
  }

  const response = await fetch("https://faas-blr1-8177d592.doserverless.co/api/v1/namespaces/fn-1aa420aa-05ee-4e7d-a14f-62b31f9f7822/actions/presigned-url-generator-go/generateUploadUrl?blocking=true&result=true", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${token}`,
    },
    body: JSON.stringify({ fileName, contentType }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to get upload URL:", errorText);
    return json({ error: "Failed to get upload URL from function." }, { status: response.status });
  }

  const data = await response.json();
  return json(data);
}