// Politics & War API v3 (GraphQL) lookup used to verify nation ID + leader name.
export type PnwNation = {
  id: string;
  leader_name: string;
  nation_name: string;
};

export async function fetchNation(nationId: number): Promise<PnwNation | null> {
  const key = process.env.PNW_API_KEY;
  if (!key) throw new Error("PNW_API_KEY is not set");

  const res = await fetch(
    `https://api.politicsandwar.com/graphql?api_key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query:
          "query($id:[Int]){ nations(id:$id, first:1){ data { id leader_name nation_name } } }",
        variables: { id: [nationId] },
      }),
      cache: "no-store",
    }
  );
  if (!res.ok) throw new Error(`P&W API responded ${res.status}`);

  const json = (await res.json()) as {
    data?: { nations?: { data?: PnwNation[] } };
    errors?: unknown;
  };
  if (json.errors) throw new Error("P&W API returned errors");
  return json.data?.nations?.data?.[0] ?? null;
}

/** Sends an in-game message from the account that owns PNW_API_KEY. */
export async function sendPnwMessage(nationId: number, subject: string, html: string) {
  const key = process.env.PNW_API_KEY;
  if (!key) throw new Error("PNW_API_KEY is not set");

  const res = await fetch("https://politicsandwar.com/api/send-message/", {
    method: "POST",
    body: new URLSearchParams({
      key,
      to: String(nationId),
      subject: subject.slice(0, 50),
      message: html,
    }),
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    general_message?: string[];
  } | null;
  if (!res.ok || !json?.success) {
    throw new Error((json?.general_message || []).join(" ") || `P&W responded ${res.status}`);
  }
}
