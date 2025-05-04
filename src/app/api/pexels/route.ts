import { NextRequest, NextResponse } from "next/server";

// Pexels API endpoint
const PEXELS_API_URL = "https://api.pexels.com/v1/search";

// Get Pexels API key from environment variables
const PEXELS_API_KEY = process.env.PEXELS_API_KEY || "";

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query") || "landscape";
    const orientation = searchParams.get("orientation") || "landscape";
    const size = searchParams.get("size") || "large";
    const perPage = parseInt(searchParams.get("per_page") || "10");
    const page = parseInt(searchParams.get("page") || "1");

    // Check if API key is available
    if (!PEXELS_API_KEY) {
      return NextResponse.json(
        { error: "Pexels API key not configured" },
        { status: 500 }
      );
    }

    // Build the API URL
    const url = new URL(PEXELS_API_URL);
    url.searchParams.append("query", query);
    url.searchParams.append("orientation", orientation);
    url.searchParams.append("size", size);
    url.searchParams.append("per_page", perPage.toString());
    url.searchParams.append("page", page.toString());

    // Fetch photos from Pexels API
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: PEXELS_API_KEY,
      },
    });

    // Check if the request was successful
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: "Failed to fetch photos", details: errorData },
        { status: response.status }
      );
    }

    // Return the photos
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching photos:", error);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 }
    );
  }
}
