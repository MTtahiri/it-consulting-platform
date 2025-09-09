export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed. Use GET.' });
  }

  try {
    const apiKey = process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableName = process.env.AIRTABLE_TABLE_NAME || 'Candidats';

    if (!apiKey || !baseId) {
      return res.status(500).json({
        error: 'Configuration manquante',
        details: 'AIRTABLE_API_KEY et AIRTABLE_BASE_ID sont requis'
      });
    }

    // Pagination pour récupérer TOUS les candidats
    let allRecords = [];
    let offset = null;
    let pageCount = 0;

    do {
      pageCount++;
      const encodedTableName = encodeURIComponent(tableName);
      let apiUrl = `https://api.airtable.com/v0/${baseId}/${encodedTableName}`;
      
      const params = new URLSearchParams({
        pageSize: '100',
        sort: JSON.stringify([{field: 'Date_Ajout', direction: 'desc'}])
      });

      if (offset) {
        params.append('offset', offset);
      }

      apiUrl += '?' + params.toString();

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({
          error: 'Erreur Airtable',
          status: response.status,
          details: errorData.error || response.statusText
        });
      }

      const data = await response.json();
      
      if (data.records && data.records.length > 0) {
        allRecords.push(...data.records);
      }

      offset = data.offset;

    } while (offset);

    res.status(200).json({
      records: allRecords,
      _pagination: {
        totalRecords: allRecords.length,
        pagesProcessed: pageCount,
        retrievalComplete: true
      },
      _debug: {
        recordCount: allRecords.length,
        timestamp: new Date().toISOString(),
        source: 'airtable-api-paginated'
      }
    });

  } catch (error) {
    console.error('Erreur API Airtable:', error);
    res.status(500).json({
      error: 'Erreur interne du serveur',
      details: error.message
    });
  }
}