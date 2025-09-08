let airtableCache = null;
let cacheTimestamp = 0;

export async function GET() {
  const now = Date.now();
  if (airtableCache && (now - cacheTimestamp) < 5 * 60 * 1000) {
    return new Response(JSON.stringify(airtableCache), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    let allRecords = [];
    let offset = undefined;
    let requestCount = 0;
    const maxRequests = 10;

    do {
      requestCount++;
      if (requestCount > maxRequests) throw new Error('Pagination limit reached');

      let url = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${encodeURIComponent(process.env.AIRTABLE_TABLE_NAME)}?maxRecords=100${offset ? `&offset=${offset}` : ''}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Airtable ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      allRecords = allRecords.concat(data.records);
      offset = data.offset;
    } while (offset);

    airtableCache = {
      records: allRecords,
      totalRecords: allRecords.length,
      success: true,
      timestamp: new Date().toISOString(),
    };
    cacheTimestamp = now;

    return new Response(JSON.stringify(airtableCache), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error("Erreur Airtable :", error.message);
    return new Response(
      JSON.stringify({ error: error.message, success: false }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
