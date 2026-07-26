import {
  NextRequest,
  NextResponse,
} from "next/server";

import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VisitRequest = {
  visitorId?: unknown;
  path?: unknown;
};

function createSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL saknas.",
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY saknas.",
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      (await request.json()) as VisitRequest;

    const visitorId =
      typeof body.visitorId === "string"
        ? body.visitorId.trim()
        : "";

    const path =
      typeof body.path === "string"
        ? body.path.trim()
        : "/";

    if (
      !visitorId ||
      visitorId.length < 10 ||
      visitorId.length > 100
    ) {
      return NextResponse.json(
        {
          error: "Ogiltigt besökar-ID.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !path.startsWith("/") ||
      path.length > 300
    ) {
      return NextResponse.json(
        {
          error: "Ogiltig sökväg.",
        },
        {
          status: 400,
        },
      );
    }

    /*
     * Adminbesök ska inte räknas.
     */
    if (path.startsWith("/admin")) {
      return NextResponse.json({
        success: true,
        skipped: true,
      });
    }

    const supabaseAdmin =
      createSupabaseAdmin();

    const { error } = await supabaseAdmin
      .from("page_views")
      .insert({
        visitor_id: visitorId,
        path,
      });

    if (error) {
      console.error(
        "Kunde inte registrera besök:",
        error,
      );

      return NextResponse.json(
        {
          error:
            "Besöket kunde inte registreras.",
        },
        {
          status: 500,
        },
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Fel vid registrering av besök:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Ett oväntat fel uppstod.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function GET() {
  try {
    const supabaseAdmin =
      createSupabaseAdmin();

    const { data, error } =
      await supabaseAdmin.rpc(
        "get_visitor_statistics",
      );

    if (error) {
      console.error(
        "Kunde inte hämta statistik:",
        error,
      );

      return NextResponse.json(
        {
          error:
            "Statistiken kunde inte hämtas.",
        },
        {
          status: 500,
        },
      );
    }

    const statistics = Array.isArray(data)
      ? data[0]
      : data;

    return NextResponse.json(
      {
        visitorsToday: Number(
          statistics?.visitors_today ?? 0,
        ),

        visitorsLast7Days: Number(
          statistics?.visitors_last_7_days ??
            0,
        ),

        visitorsTotal: Number(
          statistics?.visitors_total ?? 0,
        ),

        pageViewsToday: Number(
          statistics?.page_views_today ?? 0,
        ),

        pageViewsTotal: Number(
          statistics?.page_views_total ?? 0,
        ),
      },
      {
        headers: {
          "Cache-Control":
            "no-store, max-age=0",
        },
      },
    );
  } catch (error) {
    console.error(
      "Fel vid hämtning av statistik:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Ett oväntat fel uppstod.",
      },
      {
        status: 500,
      },
    );
  }
}