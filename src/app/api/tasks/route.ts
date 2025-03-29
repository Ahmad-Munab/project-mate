import { NextRequest} from "next/server";
import { permissionsMiddleware } from "@/middleware/permissions";

export async function POST(request: NextRequest) {
  // Check if user can edit
  const permissionError = await permissionsMiddleware(request, ["canEdit"]);
  if (permissionError) return permissionError;

  // Continue with task creation logic
  // ...
}

export async function DELETE(request: NextRequest) {
  // Check if user can delete
  const permissionError = await permissionsMiddleware(request, ["canDelete"]);
  if (permissionError) return permissionError;

  // Continue with task deletion logic
  // ...
}

export async function PATCH(request: NextRequest) {
  // Check if user can edit
  const permissionError = await permissionsMiddleware(request, ["canEdit"]);
  if (permissionError) return permissionError;

  // Continue with task update logic
  // ...
}