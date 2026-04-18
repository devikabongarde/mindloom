import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import KnowledgeGraphView from '../components/KnowledgeGraphView';
import api from '../utils/api';

export default function KnowledgeGraph() {
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const { data: shelves } = await api.get('/api/shelves/mine');
        const normalizedShelves = Array.isArray(shelves) ? shelves : [];

        if (!normalizedShelves.length) {
          if (!cancelled) setLinks([]);
          return;
        }

        const linkResults = await Promise.all(
          normalizedShelves.map((shelf) => api.get(`/api/links/shelf/${shelf._id}`))
        );

        const combined = [];
        linkResults.forEach((result, index) => {
          const shelf = normalizedShelves[index];
          const shelfLinks = Array.isArray(result.data) ? result.data : [];

          shelfLinks.forEach((link) => {
            combined.push({
              ...link,
              shelfId: shelf._id,
              shelfName: shelf.name,
            });
          });
        });

        if (!cancelled) setLinks(combined);
      } catch {
        if (!cancelled) setLinks([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Layout>
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="theme-hero-title text-3xl font-bold">Knowledge Graph</h1>
          <p className="text-sm theme-muted mt-1">
            Combined graph across all your shelves, including link-to-link references.
          </p>
        </div>

        {loading ? (
          <div className="theme-card rounded-[24px] p-6 shadow-xl">
            <p className="text-sm theme-muted">Building graph from your shelves...</p>
          </div>
        ) : (
          <KnowledgeGraphView links={links} includeShelfNodes />
        )}
      </div>
    </Layout>
  );
}
