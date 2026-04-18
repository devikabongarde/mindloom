import { useEffect, useMemo, useRef, useState } from 'react';

const VIEWBOX_WIDTH = 1000;
const VIEWBOX_HEIGHT = 680;

function normalizeUrl(raw = '') {
  const value = String(raw || '').trim();
  if (!value) return '';

  const withProtocol = value.startsWith('http://') || value.startsWith('https://')
    ? value
    : `https://${value}`;

  try {
    const parsed = new URL(withProtocol);
    parsed.hash = '';
    const pathname = parsed.pathname.replace(/\/$/, '') || '/';
    return `${parsed.protocol}//${parsed.host}${pathname}${parsed.search}`;
  } catch {
    return withProtocol.replace(/\/$/, '');
  }
}

function truncate(value = '', limit = 28) {
  const text = String(value || '');
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function buildGraph(links = [], includeShelfNodes = false) {
  const linkNodes = links.map((link) => ({
    id: String(link._id),
    kind: 'link',
    url: link.url,
    label: link.title || link.url,
    status: link.status || 'fresh',
    shelfId: link.shelfId || null,
  }));

  const shelfNodes = new Map();
  if (includeShelfNodes) {
    links.forEach((link) => {
      if (!link.shelfId) return;
      const id = `shelf:${String(link.shelfId)}`;
      if (!shelfNodes.has(id)) {
        shelfNodes.set(id, {
          id,
          kind: 'shelf',
          url: null,
          label: link.shelfName || 'Shelf',
          status: 'shelf',
        });
      }
    });
  }

  const byNormalizedUrl = new Map();
  linkNodes.forEach((node) => {
    byNormalizedUrl.set(normalizeUrl(node.url), node.id);
  });

  const externalNodes = new Map();
  const edgeSet = new Set();
  const edges = [];

  links.forEach((sourceLink) => {
    const sourceId = String(sourceLink._id);
    const sourceUrl = normalizeUrl(sourceLink.url);
    const referencedUrls = Array.isArray(sourceLink.suggestions)
      ? sourceLink.suggestions
          .filter((item) => (item?.type || 'comment') === 'link')
          .map((item) => normalizeUrl(item?.url || item?.text || ''))
          .filter(Boolean)
      : [];

    referencedUrls.forEach((normalized) => {
      if (!normalized || normalized === sourceUrl) return;

      const existingTarget = byNormalizedUrl.get(normalized);
      let targetId = existingTarget;
      let kind = 'internal';

      if (!targetId) {
        targetId = `ext:${normalized}`;
        kind = 'external';
        if (!externalNodes.has(targetId) && externalNodes.size < 30) {
          externalNodes.set(targetId, {
            id: targetId,
            kind: 'external',
            url: normalized,
            label: normalized.replace(/^https?:\/\//, ''),
            status: 'external',
          });
        }
      }

      if (!targetId) return;
      if (kind === 'external' && !externalNodes.has(targetId)) return;

      const edgeKey = `${sourceId}=>${targetId}`;
      if (edgeSet.has(edgeKey)) return;
      edgeSet.add(edgeKey);
      edges.push({ source: sourceId, target: targetId, kind });
    });

    if (includeShelfNodes && sourceLink.shelfId) {
      const shelfNodeId = `shelf:${String(sourceLink.shelfId)}`;
      const edgeKey = `${shelfNodeId}=>${sourceId}`;
      if (!edgeSet.has(edgeKey)) {
        edgeSet.add(edgeKey);
        edges.push({ source: shelfNodeId, target: sourceId, kind: 'shelf-link' });
      }
    }
  });

  const nodes = [...(includeShelfNodes ? [...shelfNodes.values()] : []), ...linkNodes, ...externalNodes.values()];
  const linkCount = linkNodes.length;
  const shelfCount = includeShelfNodes ? shelfNodes.size : 0;
  const externalCount = externalNodes.size;

  const positions = new Map();
  const centerX = 500;
  const centerY = 340;

  const placeRing = (items, radius, startAngle = -Math.PI / 2) => {
    if (!items.length) return;
    items.forEach((node, index) => {
      const angle = startAngle + (2 * Math.PI * index) / items.length;
      positions.set(node.id, {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
      });
    });
  };

  if (includeShelfNodes) {
    placeRing([...shelfNodes.values()], Math.max(110, 120 + shelfCount * 4));
    placeRing(linkNodes, Math.max(200, 220 + linkCount * 5), -Math.PI / 2);
    placeRing([...externalNodes.values()], Math.max(315, 340 + externalCount * 4), -Math.PI / 3);
  } else {
    placeRing(linkNodes, Math.max(140, 180 + linkCount * 6));
    placeRing([...externalNodes.values()], Math.max(250, 270 + externalCount * 4), -Math.PI / 3);
  }

  return { nodes, edges, positions, linkCount, shelfCount, externalCount };
}

export default function KnowledgeGraphView({ links = [], includeShelfNodes = false }) {
  const graph = useMemo(() => buildGraph(links, includeShelfNodes), [links, includeShelfNodes]);
  const [displayPositions, setDisplayPositions] = useState({});
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isPanning, setIsPanning] = useState(false);

  const svgRef = useRef(null);
  const positionsRef = useRef({});
  const velocitiesRef = useRef({});
  const dragRef = useRef({
    active: false,
    nodeId: null,
    pointer: { x: 0, y: 0 },
    startClientX: 0,
    startClientY: 0,
    moved: false,
  });
  const panDragRef = useRef({ active: false, lastX: 0, lastY: 0, moved: false });
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);

  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const nextPositions = {};
    const nextVelocities = {};
    graph.nodes.forEach((node) => {
      const pos = graph.positions.get(node.id);
      if (!pos) return;
      nextPositions[node.id] = { x: pos.x, y: pos.y };
      nextVelocities[node.id] = { x: 0, y: 0 };
    });
    positionsRef.current = nextPositions;
    velocitiesRef.current = nextVelocities;
    setDisplayPositions(nextPositions);

    dragRef.current = {
      active: false,
      nodeId: null,
      pointer: { x: 0, y: 0 },
      startClientX: 0,
      startClientY: 0,
      moved: false,
    };
    panDragRef.current = { active: false, lastX: 0, lastY: 0, moved: false };
    setPan({ x: 0, y: 0 });
    setZoom(1);
    setIsPanning(false);
  }, [links, includeShelfNodes]);

  useEffect(() => {
    if (!graph.nodes.length) return undefined;

    let rafId;
    const animate = () => {
      const positions = positionsRef.current;
      const velocities = velocitiesRef.current;
      const nodeIds = graph.nodes.map((node) => node.id);

      // Light repulsion across all nodes for a living graph feel.
      for (let i = 0; i < nodeIds.length; i += 1) {
        for (let j = i + 1; j < nodeIds.length; j += 1) {
          const a = nodeIds[i];
          const b = nodeIds[j];
          const pa = positions[a];
          const pb = positions[b];
          if (!pa || !pb) continue;

          const dx = pb.x - pa.x;
          const dy = pb.y - pa.y;
          const distSq = Math.max(dx * dx + dy * dy, 20);
          const force = Math.min(1300 / distSq, 0.35);
          const nx = dx / Math.sqrt(distSq);
          const ny = dy / Math.sqrt(distSq);

          velocities[a].x -= nx * force;
          velocities[a].y -= ny * force;
          velocities[b].x += nx * force;
          velocities[b].y += ny * force;
        }
      }

      // Spring forces from edges.
      graph.edges.forEach((edge) => {
        const source = positions[edge.source];
        const target = positions[edge.target];
        if (!source || !target) return;

        const dx = target.x - source.x;
        const dy = target.y - source.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const desired = edge.kind === 'shelf-link' ? 80 : edge.kind === 'internal' ? 115 : 160;
        const stiffness = edge.kind === 'internal' ? 0.0065 : 0.0045;
        const stretch = dist - desired;
        const fx = (dx / dist) * stretch * stiffness;
        const fy = (dy / dist) * stretch * stiffness;

        velocities[edge.source].x += fx;
        velocities[edge.source].y += fy;
        velocities[edge.target].x -= fx;
        velocities[edge.target].y -= fy;
      });

      // Centering force.
      nodeIds.forEach((id) => {
        const p = positions[id];
        const v = velocities[id];
        if (!p || !v) return;

        const cx = VIEWBOX_WIDTH / 2;
        const cy = VIEWBOX_HEIGHT / 2;
        v.x += (cx - p.x) * 0.00032;
        v.y += (cy - p.y) * 0.00032;
      });

      // Apply velocities with damping.
      nodeIds.forEach((id) => {
        const p = positions[id];
        const v = velocities[id];
        if (!p || !v) return;

        if (dragRef.current.active && dragRef.current.nodeId === id) {
          p.x = dragRef.current.pointer.x;
          p.y = dragRef.current.pointer.y;
          v.x = 0;
          v.y = 0;
          return;
        }

        v.x *= 0.9;
        v.y *= 0.9;
        p.x += v.x;
        p.y += v.y;
      });

      const snapshot = {};
      nodeIds.forEach((id) => {
        const p = positions[id];
        if (!p) return;
        snapshot[id] = { x: p.x, y: p.y };
      });
      setDisplayPositions(snapshot);

      rafId = window.requestAnimationFrame(animate);
    };

    rafId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(rafId);
  }, [graph]);

  const toWorld = (clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const sx = ((clientX - rect.left) / rect.width) * VIEWBOX_WIDTH;
    const sy = ((clientY - rect.top) / rect.height) * VIEWBOX_HEIGHT;

    return {
      x: (sx - panRef.current.x) / zoomRef.current,
      y: (sy - panRef.current.y) / zoomRef.current,
    };
  };

  const getPosition = (id) => displayPositions[id] || null;

  const beginNodeDrag = (event, nodeId) => {
    event.preventDefault();
    event.stopPropagation();
    const world = toWorld(event.clientX, event.clientY);
    if (!world) return;
    dragRef.current = {
      active: true,
      nodeId,
      pointer: world,
      startClientX: event.clientX,
      startClientY: event.clientY,
      moved: false,
    };
  };

  const beginPan = (event) => {
    if (event.button !== 0) return;
    setIsPanning(true);
    panDragRef.current = { active: true, lastX: event.clientX, lastY: event.clientY, moved: false };
  };

  const handlePointerMove = (event) => {
    if (dragRef.current.active) {
      const world = toWorld(event.clientX, event.clientY);
      if (!world) return;
      dragRef.current.pointer = world;

      const dx = event.clientX - dragRef.current.startClientX;
      const dy = event.clientY - dragRef.current.startClientY;
      if (Math.sqrt(dx * dx + dy * dy) > 4) {
        dragRef.current.moved = true;
      }
      return;
    }

    if (panDragRef.current.active) {
      const dx = event.clientX - panDragRef.current.lastX;
      const dy = event.clientY - panDragRef.current.lastY;
      if (dx === 0 && dy === 0) return;
      panDragRef.current.lastX = event.clientX;
      panDragRef.current.lastY = event.clientY;
      panDragRef.current.moved = true;
      setPan((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
    }
  };

  const endInteractions = () => {
    dragRef.current = {
      active: false,
      nodeId: null,
      pointer: { x: 0, y: 0 },
      startClientX: 0,
      startClientY: 0,
      moved: false,
    };
    panDragRef.current = { active: false, lastX: 0, lastY: 0, moved: false };
    setIsPanning(false);
  };

  const handleWheel = (event) => {
    event.preventDefault();
    const svg = svgRef.current;
    if (!svg) return;

    const rect = svg.getBoundingClientRect();
    const sx = ((event.clientX - rect.left) / rect.width) * VIEWBOX_WIDTH;
    const sy = ((event.clientY - rect.top) / rect.height) * VIEWBOX_HEIGHT;

    const previousZoom = zoomRef.current;
    const nextZoom = Math.max(0.45, Math.min(2.4, previousZoom * (event.deltaY > 0 ? 0.92 : 1.08)));
    if (nextZoom === previousZoom) return;

    const worldX = (sx - panRef.current.x) / previousZoom;
    const worldY = (sy - panRef.current.y) / previousZoom;

    const nextPan = {
      x: sx - worldX * nextZoom,
      y: sy - worldY * nextZoom,
    };

    setZoom(nextZoom);
    setPan(nextPan);
  };

  const resetView = () => {
    const resetPositions = {};
    const resetVelocities = {};
    graph.nodes.forEach((node) => {
      const base = graph.positions.get(node.id);
      if (!base) return;
      resetPositions[node.id] = { x: base.x, y: base.y };
      resetVelocities[node.id] = { x: 0, y: 0 };
    });
    positionsRef.current = resetPositions;
    velocitiesRef.current = resetVelocities;
    setDisplayPositions(resetPositions);
    setPan({ x: 0, y: 0 });
    setZoom(1);
  };

  if (!links.length) {
    return (
      <div className="theme-card rounded-[24px] p-6 shadow-xl">
        <p className="text-sm theme-muted">No links found to build the knowledge graph.</p>
      </div>
    );
  }

  return (
    <div className="theme-card rounded-[24px] p-5 shadow-xl overflow-hidden">
      <div className="theme-card-content flex items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-lg font-bold text-[#20314d]">Knowledge Graph</h3>
          <p className="text-xs theme-muted mt-1">
            {includeShelfNodes ? `${graph.shelfCount} shelves, ` : ''}
            {graph.linkCount} shelf links, {graph.externalCount} referenced links, {graph.edges.length} connections
          </p>
        </div>
        <div className="text-[11px] text-[#5f7498] bg-white/70 border border-white/70 rounded-full px-3 py-1">
          Drag nodes, drag background to pan, scroll to zoom
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs theme-muted">Zoom: {Math.round(zoom * 100)}%</p>
        <button
          onClick={resetView}
          className="text-xs font-semibold text-[#20314d] bg-white/70 border border-white/70 rounded-full px-3 py-1 hover:bg-white"
        >
          Reset View
        </button>
      </div>

      <div className="rounded-2xl border border-white/70 bg-white/45 overflow-hidden">
        <svg
          ref={svgRef}
          viewBox="0 0 1000 680"
          className="w-full h-[520px]"
          onMouseMove={handlePointerMove}
          onMouseUp={endInteractions}
          onMouseLeave={endInteractions}
          onMouseDown={beginPan}
          onWheel={handleWheel}
          style={{ cursor: dragRef.current.active || isPanning ? 'grabbing' : 'grab' }}
        >
          <defs>
            <marker id="graph-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L8,4 L0,8 Z" fill="#8aa0c1" />
            </marker>
            <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {graph.edges.map((edge) => {
            const source = getPosition(edge.source);
            const target = getPosition(edge.target);
            if (!source || !target) return null;

            return (
              <line
                key={`${edge.source}-${edge.target}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                stroke={edge.kind === 'internal' ? '#F4845F' : '#8aa0c1'}
                strokeWidth={edge.kind === 'internal' ? 2.2 : 1.6}
                strokeDasharray={edge.kind === 'external' ? '4 3' : '0'}
                opacity={0.62}
                markerEnd="url(#graph-arrow)"
              />
            );
          })}

          {graph.nodes.map((node) => {
            const pos = getPosition(node.id);
            if (!pos) return null;

            const isExternal = node.kind === 'external';
            const isShelf = node.kind === 'shelf';
            const radius = isExternal ? 10 : isShelf ? 12 : 13;
            const fill = isExternal ? '#d9e6ff' : isShelf ? '#e6fff4' : '#F4845F';
            const stroke = isExternal ? '#8aa0c1' : isShelf ? '#10B981' : '#e8617a';

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onMouseDown={(e) => beginNodeDrag(e, node.id)}
                onMouseUp={(e) => {
                  e.stopPropagation();
                  if (dragRef.current.nodeId !== node.id) return;

                  const dx = e.clientX - dragRef.current.startClientX;
                  const dy = e.clientY - dragRef.current.startClientY;
                  const movedDistance = Math.sqrt(dx * dx + dy * dy);
                  const treatedAsDrag = dragRef.current.moved || movedDistance > 5 || panDragRef.current.moved;

                  if (treatedAsDrag) return;
                  if (node.url) window.open(node.url, '_blank', 'noopener,noreferrer');
                }}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ cursor: 'grab' }}
              >
                <circle r={radius} fill={fill} stroke={stroke} strokeWidth="2" filter="url(#node-glow)" />
                <text
                  x={radius + 8}
                  y={4}
                  fontSize="11"
                  fill="#20314d"
                  style={{ pointerEvents: 'none' }}
                >
                  {truncate(node.label, isExternal ? 30 : 24)}
                </text>
                <title>{node.label}</title>
              </g>
            );
          })}
          </g>
        </svg>
      </div>
    </div>
  );
}
