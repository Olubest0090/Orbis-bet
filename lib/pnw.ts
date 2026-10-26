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
